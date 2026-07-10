import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const admin = getSupabaseAdmin();
    const [students, teachers, courses, enrollments] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      admin.from("courses").select("*", { count: "exact", head: true }),
      admin.from("enrollments").select("*", { count: "exact", head: true }),
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
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const admin = getSupabaseAdmin();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, role, status, is_active, created_at")
      .order("created_at", { ascending: false });
    const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }));
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
    const { getRole, getSupabaseAdmin, generatePassword } = await import("./admin-helpers.server");
    const callerRole = await getRole(context.userId);
    if (callerRole !== "admin" && !(callerRole === "teacher" && data.role === "student")) {
      throw new Error("Forbidden");
    }
    const admin = getSupabaseAdmin();
    const password = generatePassword();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: data.role },
    });
    if (error) throw new Error(error.message);
    await admin.from("profiles").upsert({
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
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const { error } = await getSupabaseAdmin().from("profiles")
      .update({ is_active: data.is_active, status: data.is_active ? "active" : "inactive" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    full_name: z.string().min(1).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await admin.auth.admin.updateUserById(data.id, {
      user_metadata: { full_name: data.full_name },
    });
    return { ok: true };
  });

export const adminUpdateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    role: z.enum(["admin", "teacher", "student"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("No puedes cambiar tu propio rol");
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("profiles")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await admin.auth.admin.updateUserById(data.id, {
      user_metadata: { role: data.role },
    });
    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getSupabaseAdmin, generatePassword } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const password = generatePassword();
    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(data.id, { password });
    if (error) throw new Error(error.message);
    return { password };
  });

export const adminListByRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ role: z.enum(["teacher", "student"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const { data: rows } = await getSupabaseAdmin().from("profiles")
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
    const { assertAdmin, getSupabaseAdmin } = await import("./admin-helpers.server");
    await assertAdmin(context.userId);
    const { error } = await getSupabaseAdmin().from("enrollments")
      .upsert({ student_id: data.student_id, course_id: data.course_id }, { onConflict: "student_id,course_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
