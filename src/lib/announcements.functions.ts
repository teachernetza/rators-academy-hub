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

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ courseId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (await admin())
      .from("announcements")
      .select("id,title,body,pinned,course_id,author_id,created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.courseId) q = q.eq("course_id", data.courseId);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
    const courseIds = Array.from(
      new Set((rows ?? []).map((r) => r.course_id).filter(Boolean) as string[]),
    );
    const [{ data: authors }, { data: courses }, { data: reads }] = await Promise.all([
      authorIds.length
        ? (await admin()).from("profiles").select("id,full_name,role").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      courseIds.length
        ? (await admin()).from("courses").select("id,title").in("id", courseIds)
        : Promise.resolve({ data: [] as any[] }),
      (await admin())
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", context.userId),
    ]);

    const aMap = new Map((authors ?? []).map((a: any) => [a.id, a]));
    const cMap = new Map((courses ?? []).map((c: any) => [c.id, c.title]));
    const readSet = new Set((reads ?? []).map((r: any) => r.announcement_id));

    return (rows ?? []).map((r) => ({
      ...r,
      author_name: aMap.get(r.author_id)?.full_name ?? "Unknown",
      author_role: aMap.get(r.author_id)?.role ?? null,
      course_title: r.course_id ? cMap.get(r.course_id) ?? null : null,
      read: readSet.has(r.id),
    }));
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        body: z.string().max(5000).default(""),
        course_id: z.string().uuid().nullable().optional(),
        pinned: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getRole(context.userId);
    if (data.course_id) {
      const { data: c } = await (await admin())
        .from("courses")
        .select("teacher_id")
        .eq("id", data.course_id)
        .maybeSingle();
      if (role !== "admin" && c?.teacher_id !== context.userId) throw new Error("Forbidden");
    } else if (role !== "admin") {
      throw new Error("Only admins can post platform-wide announcements");
    }

    const { data: row, error } = await (await admin())
      .from("announcements")
      .insert({
        title: data.title,
        body: data.body,
        course_id: data.course_id ?? null,
        pinned: data.pinned,
        author_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.userId);
    const { data: row } = await (await admin())
      .from("announcements")
      .select("author_id,course_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };
    let allowed = role === "admin" || row.author_id === context.userId;
    if (!allowed && row.course_id) {
      const { data: c } = await (await admin())
        .from("courses")
        .select("teacher_id")
        .eq("id", row.course_id)
        .maybeSingle();
      if (c?.teacher_id === context.userId) allowed = true;
    }
    if (!allowed) throw new Error("Forbidden");
    const { error } = await (await admin()).from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAnnouncementRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await (await admin())
      .from("announcement_reads")
      .upsert(
        { announcement_id: data.id, user_id: context.userId },
        { onConflict: "announcement_id,user_id" },
      );
    return { ok: true };
  });

export const markAllAnnouncementsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await (await admin())
      .from("announcements")
      .select("id")
      .limit(200);
    if (!rows?.length) return { ok: true };
    await (await admin())
      .from("announcement_reads")
      .upsert(
        rows.map((r) => ({ announcement_id: r.id, user_id: context.userId })),
        { onConflict: "announcement_id,user_id" },
      );
    return { ok: true };
  });

export const listMyCoursesForAuthoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getRole(context.userId);
    let q = (await admin()).from("courses").select("id,title").order("title");
    if (role === "teacher") q = q.eq("teacher_id", context.userId);
    else if (role !== "admin") return [];
    const { data } = await q;
    return data ?? [];
  });
