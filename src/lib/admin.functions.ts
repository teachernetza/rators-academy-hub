import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out + "!1";
}

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.role !== "admin") throw new Error("Forbidden");
}

export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [students, teachers, courses, enrollments] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabaseAdmin.from("courses").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("enrollments").select("*", { count: "exact", head: true }),
    ]);
    return {
      students: students.count ?? 0,
      teachers: teachers.count ?? 0,
      courses: courses.count ?? 0,
      enrollments: enrollments.count ?? 0,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, status, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const createUserSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["teacher", "student"]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const password = generatePassword();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: data.role },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").upsert({
      id: created.user!.id,
      full_name: data.full_name,
      role: data.role,
      status: "active",
    });
    return { id: created.user!.id, email: data.email, password };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
