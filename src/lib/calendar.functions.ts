import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { (await admin()) as _SupabaseAdmin } from "@/integrations/supabase/client.server";
let __supabaseAdmin: typeof _SupabaseAdmin | undefined;
async function admin() {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).(await admin());
  return __supabaseAdmin;
}
async function getRole(userId: string) {
  const { data } = await (await admin()).from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role as "admin" | "teacher" | "student" | undefined;
}

export const listUpcomingForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(60) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: enrolls } = await (await admin())
      .from("enrollments")
      .select("course_id")
      .eq("student_id", context.userId);
    const courseIds = (enrolls ?? []).map((e) => e.course_id);
    if (!courseIds.length) return [];

    const { data: sections } = await (await admin())
      .from("sections")
      .select("id,course_id,title")
      .in("course_id", courseIds);
    const sectionIds = (sections ?? []).map((s) => s.id);
    const secMap = new Map((sections ?? []).map((s) => [s.id, s]));
    if (!sectionIds.length) return [];

    const horizon = new Date(Date.now() + data.days * 86400 * 1000).toISOString();
    const { data: lessons } = await (await admin())
      .from("lessons")
      .select("id,title,type,due_date,section_id")
      .in("section_id", sectionIds)
      .not("due_date", "is", null)
      .lte("due_date", horizon)
      .order("due_date", { ascending: true });

    const { data: completions } = await (await admin())
      .from("lesson_completions")
      .select("lesson_id")
      .eq("student_id", context.userId);
    const done = new Set((completions ?? []).map((c) => c.lesson_id));

    const { data: courses } = await (await admin())
      .from("courses")
      .select("id,title")
      .in("id", courseIds);
    const cMap = new Map((courses ?? []).map((c) => [c.id, c.title]));

    return (lessons ?? [])
      .filter((l) => !done.has(l.id))
      .map((l) => {
        const s: any = secMap.get(l.section_id);
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          due_date: l.due_date,
          course_id: s?.course_id,
          course_title: s ? cMap.get(s.course_id) : null,
        };
      });
  });

export const listUpcomingForTeacher = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(60) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const role = await getRole(context.userId);
    let coursesQ = (await admin()).from("courses").select("id,title");
    if (role === "teacher") coursesQ = coursesQ.eq("teacher_id", context.userId);
    else if (role !== "admin") return [];
    const { data: courses } = await coursesQ;
    const courseIds = (courses ?? []).map((c) => c.id);
    if (!courseIds.length) return [];

    const { data: sections } = await (await admin())
      .from("sections").select("id,course_id").in("course_id", courseIds);
    const sectionIds = (sections ?? []).map((s) => s.id);
    const secMap = new Map((sections ?? []).map((s) => [s.id, s]));
    const cMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
    if (!sectionIds.length) return [];

    const horizon = new Date(Date.now() + data.days * 86400 * 1000).toISOString();
    const { data: lessons } = await (await admin())
      .from("lessons")
      .select("id,title,type,due_date,section_id")
      .in("section_id", sectionIds)
      .not("due_date", "is", null)
      .lte("due_date", horizon)
      .order("due_date", { ascending: true });

    return (lessons ?? []).map((l) => {
      const s: any = secMap.get(l.section_id);
      return {
        id: l.id,
        title: l.title,
        type: l.type,
        due_date: l.due_date,
        course_id: s?.course_id,
        course_title: s ? cMap.get(s.course_id) : null,
      };
    });
  });

export const setLessonDueDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        dueDate: z.string().datetime().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: l } = await (await admin())
      .from("lessons").select("section_id").eq("id", data.lessonId).single();
    const { data: s } = await (await admin())
      .from("sections").select("course_id").eq("id", l!.section_id).single();
    const { data: c } = await (await admin())
      .from("courses").select("teacher_id").eq("id", s!.course_id).single();
    const role = await getRole(context.userId);
    if (role !== "admin" && c?.teacher_id !== context.userId) throw new Error("Forbidden");
    const { error } = await (await admin())
      .from("lessons").update({ due_date: data.dueDate }).eq("id", data.lessonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
