import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { (await admin()) as _SupabaseAdmin } from "@/integrations/supabase/client.server";
let __supabaseAdmin: typeof _SupabaseAdmin | undefined;
async function admin() {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).(await admin());
  return __supabaseAdmin;
}
export const getNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await (await admin())
      .from("lesson_notes")
      .select("body, updated_at")
      .eq("lesson_id", data.lessonId)
      .eq("student_id", context.userId)
      .maybeSingle();
    return row ?? { body: "", updated_at: null };
  });

export const saveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lessonId: z.string().uuid(),
    body: z.string().max(20000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin()).from("lesson_notes").upsert({
      lesson_id: data.lessonId,
      student_id: context.userId,
      body: data.body,
      updated_at: new Date().toISOString(),
    }, { onConflict: "lesson_id,student_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
