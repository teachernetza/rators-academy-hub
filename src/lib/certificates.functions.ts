import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listMyCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("certificates")
      .select("id, serial, issued_at, course_id, courses(title, description)")
      .eq("student_id", context.userId)
      .order("issued_at", { ascending: false });
    return data ?? [];
  });

export const getCertificate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cert } = await supabaseAdmin
      .from("certificates")
      .select("id, serial, issued_at, student_id, course_id, courses(title, description)")
      .eq("id", data.id)
      .single();
    if (!cert) throw new Error("Not found");
    const { data: prof } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).single();
    if (cert.student_id !== context.userId && prof?.role !== "admin") throw new Error("Not allowed");
    const { data: student } = await supabaseAdmin.from("profiles").select("full_name").eq("id", cert.student_id).single();
    return { ...cert, student_name: student?.full_name ?? "Student" };
  });
