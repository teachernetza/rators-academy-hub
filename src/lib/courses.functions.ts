import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getRole(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role as "admin" | "teacher" | "student" | undefined;
}

async function assertCanEditCourse(userId: string, courseId: string) {
  const role = await getRole(userId);
  if (role === "admin") return;
  if (role === "teacher") {
    const { data } = await supabaseAdmin.from("courses").select("teacher_id").eq("id", courseId).maybeSingle();
    if (data?.teacher_id === userId) return;
  }
  throw new Error("Forbidden");
}

// ── Courses ────────────────────────────────────────────────────────────────
export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getRole(context.userId);
    let q = supabaseAdmin
      .from("courses")
      .select("id, title, description, cover_image_url, status, teacher_id, created_at")
      .order("created_at", { ascending: false });
    if (role === "teacher") q = q.eq("teacher_id", context.userId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    // Attach teacher name + counts
    const teacherIds = Array.from(new Set((data ?? []).map((c) => c.teacher_id).filter(Boolean) as string[]));
    const { data: teachers } = teacherIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", teacherIds)
      : { data: [] as { id: string; full_name: string }[] };
    const tmap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));

    const ids = (data ?? []).map((c) => c.id);
    const { data: enrolls } = ids.length
      ? await supabaseAdmin.from("enrollments").select("course_id, progress").in("course_id", ids)
      : { data: [] as { course_id: string; progress: number }[] };

    return (data ?? []).map((c) => {
      const es = (enrolls ?? []).filter((e) => e.course_id === c.id);
      const avg = es.length ? Math.round(es.reduce((s, e) => s + (e.progress ?? 0), 0) / es.length) : 0;
      return {
        ...c,
        teacher_name: c.teacher_id ? tmap.get(c.teacher_id) ?? null : null,
        student_count: es.length,
        avg_progress: avg,
      };
    });
  });

const courseInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  cover_image_url: z.string().url().max(500).optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => courseInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.userId);
    let teacher_id = data.teacher_id ?? null;
    if (role === "teacher") teacher_id = context.userId;
    else if (role !== "admin") throw new Error("Forbidden");
    const { data: row, error } = await supabaseAdmin
      .from("courses")
      .insert({
        title: data.title,
        description: data.description ?? null,
        cover_image_url: data.cover_image_url ?? null,
        teacher_id,
        status: data.status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => courseInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanEditCourse(context.userId, data.id);
    const { id, ...fields } = data;
    const role = await getRole(context.userId);
    if (role === "teacher") delete (fields as any).teacher_id; // teachers can't reassign
    const { error } = await supabaseAdmin.from("courses").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanEditCourse(context.userId, data.id);
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Course tree (sections + lessons) ───────────────────────────────────────
export const getCourseTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanEditCourse(context.userId, data.courseId);
    const { data: course } = await supabaseAdmin.from("courses").select("*").eq("id", data.courseId).single();
    const { data: sections } = await supabaseAdmin
      .from("sections").select("*").eq("course_id", data.courseId).order("order_index");
    const sectionIds = (sections ?? []).map((s) => s.id);
    const { data: lessons } = sectionIds.length
      ? await supabaseAdmin.from("lessons").select("*").in("section_id", sectionIds).order("order_index")
      : { data: [] as any[] };
    return {
      course,
      sections: (sections ?? []).map((s) => ({
        ...s,
        lessons: (lessons ?? []).filter((l) => l.section_id === s.id),
      })),
    };
  });

// ── Sections ───────────────────────────────────────────────────────────────
export const createSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    course_id: z.string().uuid(),
    title: z.string().min(1).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanEditCourse(context.userId, data.course_id);
    const { count } = await supabaseAdmin.from("sections").select("*", { count: "exact", head: true }).eq("course_id", data.course_id);
    const { error, data: row } = await supabaseAdmin.from("sections").insert({
      course_id: data.course_id, title: data.title, order_index: count ?? 0,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(), title: z.string().min(1).max(200).optional(), order_index: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await supabaseAdmin.from("sections").select("course_id").eq("id", data.id).single();
    await assertCanEditCourse(context.userId, s!.course_id);
    const { id, ...fields } = data;
    const { error } = await supabaseAdmin.from("sections").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await supabaseAdmin.from("sections").select("course_id").eq("id", data.id).single();
    await assertCanEditCourse(context.userId, s!.course_id);
    const { error } = await supabaseAdmin.from("sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Lessons ────────────────────────────────────────────────────────────────
const lessonContent = z.object({
  // video
  video_url: z.string().url().optional(),
  // activity
  instructions: z.string().max(5000).optional(),
  // reading
  body: z.string().max(50000).optional(),
  // file
  file_path: z.string().max(500).optional(),
  file_name: z.string().max(200).optional(),
  // quiz
  questions: z.array(z.object({
    text: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(300)).length(4),
    correct: z.number().int().min(0).max(3),
    points: z.number().int().min(1).max(100).default(1),
  })).optional(),
}).default({});

export const createLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    section_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    type: z.enum(["video", "activity", "quiz", "reading", "file"]),
    content: lessonContent,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: s } = await supabaseAdmin.from("sections").select("course_id").eq("id", data.section_id).single();
    await assertCanEditCourse(context.userId, s!.course_id);
    const { count } = await supabaseAdmin.from("lessons").select("*", { count: "exact", head: true }).eq("section_id", data.section_id);
    const { data: row, error } = await supabaseAdmin.from("lessons").insert({
      section_id: data.section_id, title: data.title, type: data.type,
      content: data.content, order_index: count ?? 0,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200).optional(),
    content: lessonContent.optional(),
    order_index: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: l } = await supabaseAdmin.from("lessons").select("section_id").eq("id", data.id).single();
    const { data: s } = await supabaseAdmin.from("sections").select("course_id").eq("id", l!.section_id).single();
    await assertCanEditCourse(context.userId, s!.course_id);
    const { id, ...fields } = data;
    const { error } = await supabaseAdmin.from("lessons").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: l } = await supabaseAdmin.from("lessons").select("section_id").eq("id", data.id).single();
    const { data: s } = await supabaseAdmin.from("sections").select("course_id").eq("id", l!.section_id).single();
    await assertCanEditCourse(context.userId, s!.course_id);
    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
