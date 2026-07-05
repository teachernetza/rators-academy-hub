import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
type _AdminClient = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];
let __supabaseAdmin: _AdminClient | undefined;
async function admin(): Promise<_AdminClient> {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  return __supabaseAdmin;
}
export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: courses } = await (await admin())
      .from("courses")
      .select("id, title, description, cover_image_url, teacher_id")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    const { data: enrolled } = await (await admin())
      .from("enrollments")
      .select("course_id")
      .eq("student_id", context.userId);
    const enrolledIds = new Set((enrolled ?? []).map((e) => e.course_id));

    const teacherIds = Array.from(new Set((courses ?? []).map((c) => c.teacher_id).filter(Boolean) as string[]));
    const { data: teachers } = teacherIds.length
      ? await (await admin()).from("profiles").select("id, full_name").in("id", teacherIds)
      : { data: [] as any[] };
    const tMap = new Map((teachers ?? []).map((t: any) => [t.id, t.full_name]));

    return (courses ?? []).map((c) => ({
      ...c,
      teacher_name: c.teacher_id ? tMap.get(c.teacher_id) ?? null : null,
      enrolled: enrolledIds.has(c.id),
    }));
  });

export const enrollSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: course } = await (await admin())
      .from("courses").select("id, status").eq("id", data.courseId).single();
    if (!course || course.status !== "published") throw new Error("Course is not available");
    const { error } = await (await admin()).from("enrollments").insert({
      student_id: context.userId,
      course_id: data.courseId,
      progress: 0,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });
