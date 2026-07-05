import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { (await admin()) as _SupabaseAdmin } from "@/integrations/supabase/client.server";
let __supabaseAdmin: typeof _SupabaseAdmin | undefined;
async function admin() {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).(await admin());
  return __supabaseAdmin;
}
async function assertTeacherOfSubmission(userId: string, submissionId: string) {
  const { data } = await (await admin())
    .from("activity_submissions")
    .select("lesson_id, lessons!inner(section_id, sections!inner(course_id, courses!inner(teacher_id)))")
    .eq("id", submissionId).single();
  const teacherId = (data as any)?.lessons?.sections?.courses?.teacher_id;
  if (teacherId !== userId) {
    const { data: prof } = await (await admin()).from("profiles").select("role").eq("id", userId).maybeSingle();
    if (prof?.role !== "admin") throw new Error("Forbidden");
  }
}

export const teacherListSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.enum(["pending", "graded"]).default("pending") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // Find courses owned by teacher
    const { data: courses } = await (await admin()).from("courses").select("id").eq("teacher_id", context.userId);
    const courseIds = (courses ?? []).map((c) => c.id);
    if (!courseIds.length) return [];
    const { data: sections } = await (await admin()).from("sections").select("id, course_id").in("course_id", courseIds);
    const sectionIds = (sections ?? []).map((s) => s.id);
    if (!sectionIds.length) return [];
    const { data: lessons } = await (await admin()).from("lessons").select("id, title, section_id").in("section_id", sectionIds).eq("type", "activity");
    const lessonIds = (lessons ?? []).map((l) => l.id);
    if (!lessonIds.length) return [];

    let q = (await admin()).from("activity_submissions")
      .select("*").in("lesson_id", lessonIds).order("submitted_at", { ascending: false });
    q = data.status === "pending" ? q.is("graded_at", null) : q.not("graded_at", "is", null);
    const { data: subs } = await q;

    const studentIds = Array.from(new Set((subs ?? []).map((s) => s.student_id)));
    const { data: students } = studentIds.length
      ? await (await admin()).from("profiles").select("id, full_name").in("id", studentIds)
      : { data: [] as any[] };
    const smap = new Map((students ?? []).map((s) => [s.id, s.full_name]));
    const lmap = new Map((lessons ?? []).map((l) => [l.id, l]));
    const cmap = new Map((sections ?? []).map((s) => [s.id, s.course_id]));
    const { data: courseRows } = await (await admin()).from("courses").select("id, title").in("id", courseIds);
    const cnames = new Map((courseRows ?? []).map((c) => [c.id, c.title]));

    return await Promise.all((subs ?? []).map(async (s) => {
      const lesson = lmap.get(s.lesson_id);
      const courseId = lesson ? cmap.get((lesson as any).section_id) : null;
      let signedUrl: string | null = null;
      if (s.file_url) {
        const { data: signed } = await (await admin()).storage.from("submissions").createSignedUrl(s.file_url, 3600);
        signedUrl = signed?.signedUrl ?? null;
      }
      return {
        ...s,
        student_name: smap.get(s.student_id) ?? "—",
        lesson_title: (lesson as any)?.title ?? "—",
        course_title: courseId ? cnames.get(courseId) ?? "—" : "—",
        signed_url: signedUrl,
      };
    }));
  });

export const teacherGradeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    grade: z.number().int().min(0).max(100),
    feedback: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertTeacherOfSubmission(context.userId, data.id);
    const { error } = await (await admin()).from("activity_submissions").update({
      grade: data.grade,
      feedback: data.feedback ?? null,
      graded_at: new Date().toISOString(),
      graded_by: context.userId,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const teacherGetStudentMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: courses } = await (await admin()).from("courses").select("id, title").eq("teacher_id", context.userId);
    const courseIds = (courses ?? []).map((c) => c.id);
    if (!courseIds.length) return { courses: [], students: [], cells: {} };
    const { data: enrolls } = await (await admin()).from("enrollments").select("student_id, course_id, progress").in("course_id", courseIds);
    const studentIds = Array.from(new Set((enrolls ?? []).map((e) => e.student_id)));
    const { data: students } = studentIds.length
      ? await (await admin()).from("profiles").select("id, full_name").in("id", studentIds)
      : { data: [] as any[] };
    const cells: Record<string, Record<string, number>> = {};
    (enrolls ?? []).forEach((e) => {
      cells[e.student_id] ||= {};
      cells[e.student_id][e.course_id] = e.progress;
    });
    return { courses: courses ?? [], students: students ?? [], cells };
  });
