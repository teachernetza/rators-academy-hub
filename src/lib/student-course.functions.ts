import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertEnrolled(studentId: string, courseId: string) {
  const { data } = await supabaseAdmin.from("enrollments")
    .select("id").eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
  if (!data) throw new Error("Not enrolled");
}

async function recomputeProgress(studentId: string, courseId: string) {
  // Total lessons in course
  const { data: sections } = await supabaseAdmin.from("sections").select("id").eq("course_id", courseId);
  const sectionIds = (sections ?? []).map((s) => s.id);
  if (!sectionIds.length) return;
  const { data: lessons } = await supabaseAdmin.from("lessons").select("id").in("section_id", sectionIds);
  const lessonIds = (lessons ?? []).map((l) => l.id);
  if (!lessonIds.length) return;
  const { count } = await supabaseAdmin.from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId).in("lesson_id", lessonIds);
  const pct = Math.round(((count ?? 0) / lessonIds.length) * 100);
  await supabaseAdmin.from("enrollments").update({ progress: pct })
    .eq("student_id", studentId).eq("course_id", courseId);

  // Auto-issue certificate on completion
  if (pct === 100) {
    const { data: existing } = await supabaseAdmin
      .from("certificates").select("id")
      .eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
    if (!existing) {
      const serial = `RA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await supabaseAdmin.from("certificates").insert({
        student_id: studentId, course_id: courseId, serial,
      });
    }
  }
}

export const listMyCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("enrollments")
      .select("id, progress, enrolled_at, course_id, courses(id,title,description,cover_image_url,status,teacher_id)")
      .eq("student_id", context.userId);
    return (data ?? []).filter((e: any) => e.courses?.status === "published");
  });

export const getStudentCourse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEnrolled(context.userId, data.courseId);
    const { data: course } = await supabaseAdmin.from("courses").select("*").eq("id", data.courseId).single();
    const { data: sections } = await supabaseAdmin
      .from("sections").select("*").eq("course_id", data.courseId).order("order_index");
    const sectionIds = (sections ?? []).map((s) => s.id);
    const { data: lessons } = sectionIds.length
      ? await supabaseAdmin.from("lessons").select("*").in("section_id", sectionIds).order("order_index")
      : { data: [] as any[] };
    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: completions } = lessonIds.length
      ? await supabaseAdmin.from("lesson_completions").select("lesson_id")
          .eq("student_id", context.userId).in("lesson_id", lessonIds)
      : { data: [] as any[] };
    const done = new Set((completions ?? []).map((c) => c.lesson_id));

    // Build sequential unlock per section
    const tree = (sections ?? []).map((s) => {
      const ls = (lessons ?? []).filter((l) => l.section_id === s.id);
      let unlocked = true;
      const out = ls.map((l) => {
        const completed = done.has(l.id);
        const item = { ...l, completed, unlocked };
        if (!completed) unlocked = false; // next lesson stays locked until this is done
        return item;
      });
      return { ...s, lessons: out };
    });

    return { course, sections: tree };
  });

export const getStudentLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson } = await supabaseAdmin.from("lessons").select("*, sections!inner(course_id)").eq("id", data.lessonId).single();
    if (!lesson) throw new Error("Not found");
    const courseId = (lesson as any).sections.course_id;
    await assertEnrolled(context.userId, courseId);
    const { data: submission } = await supabaseAdmin.from("activity_submissions")
      .select("*").eq("lesson_id", data.lessonId).eq("student_id", context.userId)
      .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
    const { data: attempt } = await supabaseAdmin.from("quiz_attempts")
      .select("*").eq("lesson_id", data.lessonId).eq("student_id", context.userId)
      .order("completed_at", { ascending: false }).limit(1).maybeSingle();
    const { data: completion } = await supabaseAdmin.from("lesson_completions")
      .select("id").eq("lesson_id", data.lessonId).eq("student_id", context.userId).maybeSingle();
    let signedFile: string | null = null;
    if (submission?.file_url) {
      const { data: signed } = await supabaseAdmin.storage.from("submissions")
        .createSignedUrl(submission.file_url, 3600);
      signedFile = signed?.signedUrl ?? null;
    }
    return { lesson, submission, attempt, completed: !!completion, signedFile };
  });

export const markLessonComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson } = await supabaseAdmin.from("lessons").select("section_id, sections!inner(course_id)").eq("id", data.lessonId).single();
    const courseId = (lesson as any).sections.course_id;
    await assertEnrolled(context.userId, courseId);
    await supabaseAdmin.from("lesson_completions").upsert(
      { student_id: context.userId, lesson_id: data.lessonId },
      { onConflict: "student_id,lesson_id" },
    );
    await recomputeProgress(context.userId, courseId);
    return { ok: true };
  });

export const requestUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lessonId: z.string().uuid(),
    filename: z.string().min(1).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${context.userId}/${data.lessonId}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage.from("submissions")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const submitActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lessonId: z.string().uuid(),
    filePath: z.string().min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson } = await supabaseAdmin.from("lessons").select("section_id, sections!inner(course_id)").eq("id", data.lessonId).single();
    const courseId = (lesson as any).sections.course_id;
    await assertEnrolled(context.userId, courseId);
    const { error } = await supabaseAdmin.from("activity_submissions").insert({
      student_id: context.userId, lesson_id: data.lessonId, file_url: data.filePath,
    });
    if (error) throw new Error(error.message);
    // Mark lesson complete on submission
    await supabaseAdmin.from("lesson_completions").upsert(
      { student_id: context.userId, lesson_id: data.lessonId },
      { onConflict: "student_id,lesson_id" },
    );
    await recomputeProgress(context.userId, courseId);
    return { ok: true };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lessonId: z.string().uuid(),
    answers: z.array(z.number().int().min(0).max(3)),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson } = await supabaseAdmin.from("lessons").select("content, section_id, sections!inner(course_id)").eq("id", data.lessonId).single();
    const courseId = (lesson as any).sections.course_id;
    await assertEnrolled(context.userId, courseId);
    const questions = ((lesson as any).content?.questions ?? []) as Array<{ correct: number; points: number }>;
    let score = 0; let total = 0;
    questions.forEach((q, i) => {
      total += q.points ?? 1;
      if (data.answers[i] === q.correct) score += q.points ?? 1;
    });
    await supabaseAdmin.from("quiz_attempts").insert({
      student_id: context.userId, lesson_id: data.lessonId,
      answers: data.answers, score, total_points: total,
    });
    await supabaseAdmin.from("lesson_completions").upsert(
      { student_id: context.userId, lesson_id: data.lessonId },
      { onConflict: "student_id,lesson_id" },
    );
    await recomputeProgress(context.userId, courseId);
    return { score, total };
  });

export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: enrollments } = await supabaseAdmin.from("enrollments")
      .select("course_id, progress, courses(id,title)").eq("student_id", context.userId);
    const courseIds = (enrollments ?? []).map((e: any) => e.course_id);
    if (!courseIds.length) return [];
    const { data: sections } = await supabaseAdmin.from("sections").select("*").in("course_id", courseIds).order("order_index");
    const sectionIds = (sections ?? []).map((s) => s.id);
    const { data: lessons } = sectionIds.length
      ? await supabaseAdmin.from("lessons").select("*").in("section_id", sectionIds).order("order_index")
      : { data: [] as any[] };
    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: completions } = lessonIds.length
      ? await supabaseAdmin.from("lesson_completions").select("lesson_id").eq("student_id", context.userId).in("lesson_id", lessonIds)
      : { data: [] as any[] };
    const done = new Set((completions ?? []).map((c) => c.lesson_id));
    return (enrollments ?? []).map((e: any) => ({
      course: e.courses,
      progress: e.progress,
      sections: (sections ?? []).filter((s) => s.course_id === e.course_id).map((s) => ({
        ...s,
        lessons: (lessons ?? []).filter((l) => l.section_id === s.id).map((l) => ({
          id: l.id, title: l.title, type: l.type, completed: done.has(l.id),
        })),
      })),
    }));
  });
