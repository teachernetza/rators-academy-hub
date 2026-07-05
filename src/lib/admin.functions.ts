import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { (await admin()) as _SupabaseAdmin } from "@/integrations/supabase/client.server";
let __supabaseAdmin: typeof _SupabaseAdmin | undefined;
async function admin() {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).(await admin());
  return __supabaseAdmin;
}
function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out + "!1";
}

async function assertAdmin(userId: string) {
  const { data } = await (await admin())
    .from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!data || data.role !== "admin") throw new Error("Forbidden");
}

export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [students, teachers, courses, enrollments] = await Promise.all([
      (await admin()).from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      (await admin()).from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      (await admin()).from("courses").select("*", { count: "exact", head: true }),
      (await admin()).from("enrollments").select("*", { count: "exact", head: true }),
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
    const { data } = await (await admin())
      .from("profiles")
      .select("id, full_name, role, status, is_active, created_at")
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
    const { data: created, error } = await (await admin()).auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: data.role },
    });
    if (error) throw new Error(error.message);
    await (await admin()).from("profiles").upsert({
      id: created.user!.id,
      full_name: data.full_name,
      role: data.role,
      status: "active",
      is_active: true,
    });
    return { id: created.user!.id, email: data.email, password };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await (await admin()).auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await admin()).from("profiles")
      .update({ is_active: data.is_active, status: data.is_active ? "active" : "inactive" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListByRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ role: z.enum(["teacher", "student"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await (await admin()).from("profiles")
      .select("id, full_name").eq("role", data.role).order("full_name");
    return rows ?? [];
  });

export const adminEnrollStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    student_id: z.string().uuid(),
    course_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await admin()).from("enrollments")
      .upsert({ student_id: data.student_id, course_id: data.course_id }, { onConflict: "student_id,course_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
