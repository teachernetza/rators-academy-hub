import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
type _AdminClient = typeof import("@/integrations/supabase/client.server")["supabaseAdmin"];
let __supabaseAdmin: _AdminClient | undefined;
async function admin(): Promise<_AdminClient> {
  if (!__supabaseAdmin) __supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  return __supabaseAdmin;
}
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const cefrEnum = z.enum(CEFR_LEVELS);
const sectionTypeEnum = z.enum([
  "open_text",
  "match_pairs",
  "order_words",
  "multiple_choice",
  "multi_select",
  "video_questions",
  "audio_questions",
]);

async function getRole(userId: string) {
  const { data } = await (await admin()).from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role as "admin" | "teacher" | "student" | undefined;
}

async function assertStaff(userId: string) {
  const r = await getRole(userId);
  if (r !== "admin" && r !== "teacher") throw new Error("Forbidden");
  return r;
}

async function assertCanEditActivity(userId: string, activityId: string) {
  const role = await getRole(userId);
  if (role === "admin") return;
  const { data } = await (await admin()).from("activities").select("created_by").eq("id", activityId).maybeSingle();
  if (data?.created_by === userId) return;
  throw new Error("Forbidden");
}

// ── Activities (library) ────────────────────────────────────────────
export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ level: cefrEnum.optional() }).partial().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    let q = (await admin())
      .from("activities")
      .select("id, title, description, cefr_level, created_by, is_published, created_at")
      .order("created_at", { ascending: false });
    if (data.level) q = q.eq("cefr_level", data.level);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const [{ data: counts }, { data: authors }] = await Promise.all([
      ids.length
        ? (await admin()).from("activity_sections").select("activity_id").in("activity_id", ids)
        : Promise.resolve({ data: [] as { activity_id: string }[] }),
      Promise.resolve({
        data: (await (await admin())
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(new Set((rows ?? []).map((r) => r.created_by))))).data ?? [],
      }),
    ]);
    const cMap = new Map<string, number>();
    (counts ?? []).forEach((c) => cMap.set(c.activity_id, (cMap.get(c.activity_id) ?? 0) + 1));
    const aMap = new Map((authors as { id: string; full_name: string }[]).map((a) => [a.id, a.full_name]));
    return (rows ?? []).map((r) => ({
      ...r,
      section_count: cMap.get(r.id) ?? 0,
      author_name: aMap.get(r.created_by) ?? null,
    }));
  });

export const getActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: activity, error } = await (await admin())
      .from("activities").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: sections } = await (await admin())
      .from("activity_sections").select("*").eq("activity_id", data.id).order("order_index");
    return { activity, sections: sections ?? [] };
  });

const activityInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  cefr_level: cefrEnum,
  is_published: z.boolean().default(true),
});

export const createActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => activityInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: row, error } = await (await admin())
      .from("activities")
      .insert({
        title: data.title,
        description: data.description ?? null,
        cefr_level: data.cefr_level,
        is_published: data.is_published,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    activityInput.partial().extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanEditActivity(context.userId, data.id);
    const { id, ...fields } = data;
    const { error } = await (await admin()).from("activities").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanEditActivity(context.userId, data.id);
    const { error } = await (await admin()).from("activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Sections (replace all) ─────────────────────────────────────────
const sectionInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  instructions: z.string().max(4000).optional().nullable(),
  section_type: sectionTypeEnum,
  config: z.record(z.string(), z.any()).default({}),
});

export const saveActivitySections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      activity_id: z.string().uuid(),
      sections: z.array(sectionInput).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanEditActivity(context.userId, data.activity_id);
    // Simple strategy: delete then insert in order. Submissions reference section_id; if any exist, refuse.
    const { count } = await (await admin())
      .from("submission_section_responses")
      .select("id", { count: "exact", head: true })
      .in(
        "section_id",
        (await (await admin()).from("activity_sections").select("id").eq("activity_id", data.activity_id))
          .data?.map((s) => s.id) ?? [],
      );
    if ((count ?? 0) > 0) {
      throw new Error("This activity has student submissions and its sections cannot be replaced.");
    }
    await (await admin()).from("activity_sections").delete().eq("activity_id", data.activity_id);
    if (data.sections.length === 0) return { ok: true };
    const rows = data.sections.map((s, i) => ({
      activity_id: data.activity_id,
      title: s.title,
      instructions: s.instructions ?? null,
      section_type: s.section_type,
      config: s.config ?? {},
      order_index: i,
    }));
    const { error } = await (await admin()).from("activity_sections").insert(rows as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Assignments ───────────────────────────────────────────────────
export const assignActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      activity_id: z.string().uuid(),
      student_id: z.string().uuid(),
      due_date: z.string().datetime().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: student } = await (await admin())
      .from("profiles").select("role").eq("id", data.student_id).single();
    if (student?.role !== "student") throw new Error("Target is not a student");
    const { data: row, error } = await (await admin())
      .from("activity_assignments")
      .insert({
        activity_id: data.activity_id,
        student_id: data.student_id,
        assigned_by: context.userId,
        due_date: data.due_date ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Student: list my assignments grouped by status
export const listMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (await admin())
      .from("activity_assignments")
      .select("id, status, due_date, assigned_at, approved_at, current_reviewer_id, activity_id")
      .eq("student_id", context.userId)
      .order("assigned_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((r) => r.activity_id)));
    const { data: acts } = ids.length
      ? await (await admin()).from("activities").select("id, title, cefr_level").in("id", ids)
      : { data: [] as { id: string; title: string; cefr_level: string }[] };
    const aMap = new Map(acts!.map((a) => [a.id, a]));
    return (data ?? []).map((r) => ({ ...r, activity: aMap.get(r.activity_id) ?? null }));
  });

// Student: detail (sections + latest submission + responses if iterating)
export const getAssignmentForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: a, error } = await (await admin())
      .from("activity_assignments").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (a.student_id !== context.userId) throw new Error("Forbidden");
    const { data: activity } = await (await admin())
      .from("activities").select("*").eq("id", a.activity_id).single();
    const { data: sections } = await (await admin())
      .from("activity_sections").select("*").eq("activity_id", a.activity_id).order("order_index");
    const { data: subs } = await (await admin())
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", a.id)
      .order("attempt_number", { ascending: false });
    const lastSub = (subs ?? [])[0] ?? null;
    let lastResponses: any[] = [];
    if (lastSub) {
      const { data: rs } = await (await admin())
        .from("submission_section_responses")
        .select("*")
        .eq("submission_id", lastSub.id);
      lastResponses = rs ?? [];
    }
    // Available teachers to send to: prefer last reviewer; list all teachers as fallback
    const { data: teachers } = await (await admin())
      .from("profiles").select("id, full_name").eq("role", "teacher").eq("is_active", true)
      .order("full_name");
    return { assignment: a, activity, sections: sections ?? [], lastSubmission: lastSub, lastResponses, teachers: teachers ?? [] };
  });

const responseInput = z.object({
  section_id: z.string().uuid(),
  response: z.record(z.string(), z.any()).default({}),
});

export const submitAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      assignment_id: z.string().uuid(),
      teacher_id: z.string().uuid(),
      responses: z.array(responseInput).min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: a, error } = await (await admin())
      .from("activity_assignments").select("*").eq("id", data.assignment_id).single();
    if (error) throw new Error(error.message);
    if (a.student_id !== context.userId) throw new Error("Forbidden");
    if (a.status === "approved") throw new Error("Assignment already approved");
    if (a.status === "in_review") throw new Error("Already in review");

    const { data: teacher } = await (await admin())
      .from("profiles").select("role, is_active").eq("id", data.teacher_id).single();
    if (teacher?.role !== "teacher" || teacher?.is_active === false) {
      throw new Error("Invalid teacher");
    }

    const { data: last } = await (await admin())
      .from("assignment_submissions").select("attempt_number")
      .eq("assignment_id", a.id).order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    const attempt = (last?.attempt_number ?? 0) + 1;

    const { data: sub, error: sErr } = await (await admin())
      .from("assignment_submissions")
      .insert({
        assignment_id: a.id,
        attempt_number: attempt,
        submitted_to: data.teacher_id,
        overall_status: "in_review",
      })
      .select().single();
    if (sErr) throw new Error(sErr.message);

    const rows = data.responses.map((r) => ({
      submission_id: sub.id,
      section_id: r.section_id,
      response: r.response,
      section_status: "pending_review" as const,
    }));
    const { error: rErr } = await (await admin()).from("submission_section_responses").insert(rows);
    if (rErr) throw new Error(rErr.message);

    const { error: uErr } = await (await admin())
      .from("activity_assignments")
      .update({ status: "in_review", current_reviewer_id: data.teacher_id })
      .eq("id", a.id);
    if (uErr) throw new Error(uErr.message);

    return { submission_id: sub.id };
  });

// ── Teacher inbox ─────────────────────────────────────────────────
export const listTeacherInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data: subs, error } = await (await admin())
      .from("assignment_submissions")
      .select("id, assignment_id, attempt_number, submitted_at, overall_status")
      .eq("submitted_to", context.userId)
      .eq("overall_status", "in_review")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    const aIds = Array.from(new Set((subs ?? []).map((s) => s.assignment_id)));
    const { data: assigns } = aIds.length
      ? await (await admin()).from("activity_assignments").select("id, activity_id, student_id").in("id", aIds)
      : { data: [] as any[] };
    const actIds = Array.from(new Set((assigns ?? []).map((a) => a.activity_id)));
    const studentIds = Array.from(new Set((assigns ?? []).map((a) => a.student_id)));
    const [{ data: acts }, { data: studs }] = await Promise.all([
      actIds.length
        ? (await admin()).from("activities").select("id, title, cefr_level").in("id", actIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? (await admin()).from("profiles").select("id, full_name").in("id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const aMap = new Map((assigns ?? []).map((a) => [a.id, a]));
    const actMap = new Map((acts ?? []).map((a) => [a.id, a]));
    const stuMap = new Map((studs ?? []).map((s) => [s.id, s]));
    return (subs ?? []).map((s) => {
      const a = aMap.get(s.assignment_id);
      return {
        ...s,
        activity: a ? actMap.get(a.activity_id) ?? null : null,
        student: a ? stuMap.get(a.student_id) ?? null : null,
      };
    });
  });

export const getSubmissionForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: sub, error } = await (await admin())
      .from("assignment_submissions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const role = await getRole(context.userId);
    if (role !== "admin" && sub.submitted_to !== context.userId) throw new Error("Forbidden");
    const { data: a } = await (await admin()).from("activity_assignments").select("*").eq("id", sub.assignment_id).single();
    const { data: activity } = await (await admin()).from("activities").select("*").eq("id", a!.activity_id).single();
    const { data: sections } = await (await admin())
      .from("activity_sections").select("*").eq("activity_id", a!.activity_id).order("order_index");
    const { data: responses } = await (await admin())
      .from("submission_section_responses").select("*").eq("submission_id", sub.id);
    const { data: student } = await (await admin())
      .from("profiles").select("id, full_name").eq("id", a!.student_id).single();
    return { submission: sub, assignment: a, activity, sections: sections ?? [], responses: responses ?? [], student };
  });

export const reviewSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      response_id: z.string().uuid(),
      status: z.enum(["approved", "changes_requested", "pending_review"]),
      comment: z.string().max(4000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    // verify reviewer owns the parent submission
    const { data: r } = await (await admin())
      .from("submission_section_responses").select("submission_id").eq("id", data.response_id).single();
    const { data: sub } = await (await admin())
      .from("assignment_submissions").select("submitted_to").eq("id", r!.submission_id).single();
    const role = await getRole(context.userId);
    if (role !== "admin" && sub!.submitted_to !== context.userId) throw new Error("Forbidden");
    const { error } = await (await admin())
      .from("submission_section_responses")
      .update({
        section_status: data.status,
        teacher_comment: data.comment ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.response_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      submission_id: z.string().uuid(),
      decision: z.enum(["approved", "changes_requested"]),
      overall_feedback: z.string().max(4000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: sub } = await (await admin())
      .from("assignment_submissions").select("*").eq("id", data.submission_id).single();
    const role = await getRole(context.userId);
    if (role !== "admin" && sub!.submitted_to !== context.userId) throw new Error("Forbidden");

    const now = new Date().toISOString();
    const { error: sErr } = await (await admin())
      .from("assignment_submissions")
      .update({
        overall_status: data.decision,
        overall_feedback: data.overall_feedback ?? null,
        reviewer_id: context.userId,
        reviewed_at: now,
      })
      .eq("id", data.submission_id);
    if (sErr) throw new Error(sErr.message);

    const assignmentUpdate =
      data.decision === "approved"
        ? { status: "approved" as const, approved_at: now, current_reviewer_id: null }
        : { status: "changes_requested" as const };
    const { error: aErr } = await (await admin())
      .from("activity_assignments").update(assignmentUpdate).eq("id", sub!.assignment_id);
    if (aErr) throw new Error(aErr.message);
    return { ok: true };
  });

// Helper used by Assign dialog
export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { data } = await (await admin())
      .from("profiles").select("id, full_name").eq("role", "student").eq("is_active", true)
      .order("full_name");
    return data ?? [];
  });

export const listStudentAssignmentsForStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ student_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await assertStaff(context.userId);
    const { data: student } = await (await admin())
      .from("profiles")
      .select("id, full_name, status, is_active")
      .eq("id", data.student_id)
      .eq("role", "student")
      .single();
    if (!student) throw new Error("Student not found");

    if (role === "teacher") {
      const { data: linked } = await (await admin())
        .from("enrollments")
        .select("id, courses!inner(teacher_id)")
        .eq("student_id", data.student_id)
        .eq("courses.teacher_id", context.userId)
        .limit(1)
        .maybeSingle();
      if (!linked) throw new Error("Forbidden");
    }

    const { data: assignments, error } = await (await admin())
      .from("activity_assignments")
      .select("id, activity_id, assigned_by, status, due_date, assigned_at, approved_at")
      .eq("student_id", data.student_id)
      .order("assigned_at", { ascending: false });
    if (error) throw new Error(error.message);

    const activityIds = Array.from(new Set((assignments ?? []).map((a) => a.activity_id)));
    const teacherIds = Array.from(new Set((assignments ?? []).map((a) => a.assigned_by)));
    const [{ data: activities }, { data: teachers }] = await Promise.all([
      activityIds.length
        ? (await admin()).from("activities").select("id, title, cefr_level").in("id", activityIds)
        : Promise.resolve({ data: [] as any[] }),
      teacherIds.length
        ? (await admin()).from("profiles").select("id, full_name").in("id", teacherIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const activityMap = new Map((activities ?? []).map((a: any) => [a.id, a]));
    const teacherMap = new Map((teachers ?? []).map((t: any) => [t.id, t.full_name]));

    return {
      student,
      assignments: (assignments ?? []).map((a) => ({
        ...a,
        activity: activityMap.get(a.activity_id) ?? null,
        assigned_by_name: teacherMap.get(a.assigned_by) ?? "—",
      })),
    };
  });
