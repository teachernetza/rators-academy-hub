import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
type _AdminClient = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];
let __supabaseAdmin: _AdminClient | undefined;
async function admin(): Promise<_AdminClient> {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  return __supabaseAdmin;
}
async function getRole(userId: string) {
  const { data } = await (await admin()).from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role as "admin" | "teacher" | "student" | undefined;
}

async function canManageCourse(userId: string, courseId: string) {
  const role = await getRole(userId);
  if (role === "admin") return true;
  const { data } = await (await admin()).from("courses").select("teacher_id").eq("id", courseId).maybeSingle();
  return data?.teacher_id === userId;
}

export const listMyInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (await admin())
      .from("invitations")
      .select("id, role, status, message, created_at, course_id, invited_by, courses(title, description), inviter:profiles!invitations_invited_by_fkey(full_name)")
      .eq("invitee_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []) as any[];
  });

export const sendInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    course_id: z.string().uuid(),
    invitee_id: z.string().uuid(),
    role: z.enum(["teacher", "student"]),
    message: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await canManageCourse(context.userId, data.course_id))) throw new Error("Forbidden");
    const { error } = await (await admin()).from("invitations").upsert({
      course_id: data.course_id,
      invitee_id: data.invitee_id,
      invited_by: context.userId,
      role: data.role,
      message: data.message ?? null,
      status: "pending",
    }, { onConflict: "course_id,invitee_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    accept: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv } = await (await admin())
      .from("invitations").select("*").eq("id", data.id).maybeSingle();
    if (!inv || inv.invitee_id !== context.userId) throw new Error("Not found");
    if (inv.status !== "pending") throw new Error("Already responded");

    if (data.accept) {
      if (inv.role === "student") {
        await (await admin()).from("enrollments").upsert(
          { student_id: inv.invitee_id, course_id: inv.course_id },
          { onConflict: "student_id,course_id" }
        );
      } else if (inv.role === "teacher") {
        await (await admin()).from("courses").update({ teacher_id: inv.invitee_id }).eq("id", inv.course_id);
      }
    }
    await (await admin()).from("invitations").update({
      status: data.accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true };
  });

export const listCourseInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ course_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await canManageCourse(context.userId, data.course_id))) throw new Error("Forbidden");
    const { data: rows } = await (await admin())
      .from("invitations")
      .select("id, role, status, created_at, invitee:profiles!invitations_invitee_id_fkey(full_name)")
      .eq("course_id", data.course_id)
      .order("created_at", { ascending: false });
    return (rows ?? []) as any[];
  });
