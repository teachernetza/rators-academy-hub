import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { (await admin()) as _SupabaseAdmin } from "@/integrations/supabase/client.server";
let __supabaseAdmin: typeof _SupabaseAdmin | undefined;
async function admin() {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).(await admin());
  return __supabaseAdmin;
}
async function assertCanAccessLesson(userId: string, lessonId: string) {
  const { data: lesson } = await (await admin())
    .from("lessons")
    .select("section_id, sections!inner(course_id)")
    .eq("id", lessonId)
    .single();
  if (!lesson) throw new Error("Lesson not found");
  const courseId = (lesson as any).sections.course_id;

  const [{ data: enr }, { data: course }, { data: prof }] = await Promise.all([
    (await admin()).from("enrollments").select("id").eq("student_id", userId).eq("course_id", courseId).maybeSingle(),
    (await admin()).from("courses").select("teacher_id").eq("id", courseId).single(),
    (await admin()).from("profiles").select("role").eq("id", userId).single(),
  ]);
  const isTeacher = course?.teacher_id === userId;
  const isAdmin = prof?.role === "admin";
  if (!enr && !isTeacher && !isAdmin) throw new Error("Not allowed");
  return { courseId, isTeacher, isAdmin };
}

export const listComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanAccessLesson(context.userId, data.lessonId);
    const { data: rows } = await (await admin())
      .from("lesson_comments")
      .select("id, user_id, parent_id, body, created_at")
      .eq("lesson_id", data.lessonId)
      .order("created_at", { ascending: true });
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profs } = userIds.length
      ? await (await admin()).from("profiles").select("id, full_name, role").in("id", userIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      ...r,
      author_name: profMap.get(r.user_id)?.full_name ?? "User",
      author_role: profMap.get(r.user_id)?.role ?? "student",
    }));
  });

export const postComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lessonId: z.string().uuid(),
    body: z.string().min(1).max(2000),
    parentId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { courseId, isTeacher } = await assertCanAccessLesson(context.userId, data.lessonId);
    const { data: row, error } = await (await admin()).from("lesson_comments").insert({
      lesson_id: data.lessonId,
      user_id: context.userId,
      parent_id: data.parentId ?? null,
      body: data.body,
    }).select("id").single();
    if (error) throw new Error(error.message);

    // Notify teacher if a student posted
    if (!isTeacher) {
      const { data: course } = await (await admin()).from("courses").select("teacher_id, title").eq("id", courseId).single();
      if (course?.teacher_id) {
        await (await admin()).from("pending_tasks").insert({
          user_id: course.teacher_id,
          title: `New question in ${course.title}`,
          role_target: "teacher",
        });
      }
    }
    return { id: row.id };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await (await admin()).from("lesson_comments").select("user_id").eq("id", data.id).single();
    const { data: prof } = await (await admin()).from("profiles").select("role").eq("id", context.userId).single();
    if (row?.user_id !== context.userId && prof?.role !== "admin") throw new Error("Not allowed");
    await (await admin()).from("lesson_comments").delete().eq("id", data.id);
    return { ok: true };
  });
