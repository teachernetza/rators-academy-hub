import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_USERS = [
  { email: "admin@ratorsacademy.com", password: "Admin1234!", full_name: "Admin Rators", role: "admin" as const },
  { email: "teacher@ratorsacademy.com", password: "Teacher1234!", full_name: "Ms. García", role: "teacher" as const },
  { email: "student@ratorsacademy.com", password: "Student1234!", full_name: "Juan López", role: "student" as const },
];

async function ensureUser(u: typeof DEMO_USERS[number], existing: Map<string | undefined, any>) {
  let user = existing.get(u.email);
  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    user = data.user!;
  }
  await supabaseAdmin.from("profiles").upsert({
    id: user.id, full_name: u.full_name, role: u.role, status: "active", is_active: true,
  });
  return user.id as string;
}

async function ensureCourse(title: string, description: string, cover: string, teacherId: string) {
  const { data: existing } = await supabaseAdmin.from("courses").select("id").eq("title", title).eq("teacher_id", teacherId).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await supabaseAdmin.from("courses").insert({
    title, description, cover_image_url: cover, teacher_id: teacherId, status: "published",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function ensureSection(courseId: string, title: string, order: number) {
  const { data: ex } = await supabaseAdmin.from("sections").select("id").eq("course_id", courseId).eq("title", title).maybeSingle();
  if (ex) return ex.id as string;
  const { data, error } = await supabaseAdmin.from("sections").insert({ course_id: courseId, title, order_index: order }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function ensureLesson(sectionId: string, title: string, type: "video" | "activity" | "quiz", order: number, content: any) {
  const { data: ex } = await supabaseAdmin.from("lessons").select("id").eq("section_id", sectionId).eq("title", title).maybeSingle();
  if (ex) return ex.id as string;
  const { data, error } = await supabaseAdmin.from("lessons").insert({ section_id: sectionId, title, type, order_index: order, content }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function seed() {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const byEmail = new Map(existing.users.map((u) => [u.email, u]));
  const ids: Record<string, string> = {};
  for (const u of DEMO_USERS) ids[u.role] = await ensureUser(u, byEmail);

  const teacherId = ids.teacher;
  const studentId = ids.student;
  const adminId = ids.admin;

  // Courses
  const c1 = await ensureCourse(
    "English B1 — Grammar & Writing",
    "Strengthen your B1 foundations with focused grammar and writing practice.",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    teacherId,
  );
  const c2 = await ensureCourse(
    "Conversation Club Prep",
    "Get ready to speak with confidence in real-world conversations.",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800",
    teacherId,
  );

  // Course 1: 2 sections, 5 lessons
  const c1s1 = await ensureSection(c1, "Tenses Refresher", 0);
  const c1s2 = await ensureSection(c1, "Writing Practice", 1);
  const lessons: string[] = [];
  lessons.push(await ensureLesson(c1s1, "Present Perfect — overview", "video", 0, { video_url: "https://www.youtube.com/embed/jRbg6sxKkSo" }));
  lessons.push(await ensureLesson(c1s1, "Past vs Present Perfect — quiz", "quiz", 1, {
    questions: [
      { text: "I _____ to Paris last summer.", options: ["have gone", "went", "go", "had gone"], correct: 1, points: 1 },
      { text: "She _____ here since 2020.", options: ["lives", "is living", "has lived", "lived"], correct: 2, points: 1 },
      { text: "They _____ already _____ dinner.", options: ["have / eaten", "has / ate", "are / eating", "had / eat"], correct: 0, points: 1 },
    ],
  }));
  lessons.push(await ensureLesson(c1s2, "Writing a short essay", "video", 0, { video_url: "https://www.youtube.com/embed/JovL1bHpogI" }));
  lessons.push(await ensureLesson(c1s2, "Submit your essay draft", "activity", 1, {
    instructions: "Write a 200-word essay about a memorable trip. Upload your document (PDF or DOCX).",
  }));
  lessons.push(await ensureLesson(c1s2, "Peer review reflection", "activity", 2, {
    instructions: "After reading a classmate's essay, upload a short reflection (one paragraph).",
  }));

  // Course 2: 1 section, 3 lessons
  const c2s1 = await ensureSection(c2, "Warm Up", 0);
  const l6 = await ensureLesson(c2s1, "Small talk in English", "video", 0, { video_url: "https://www.youtube.com/embed/3nLmWuxc3Mw" });
  const l7 = await ensureLesson(c2s1, "Record a self-intro", "activity", 1, {
    instructions: "Record a 30–60s self-introduction. Upload the audio or video file.",
  });
  const l8 = await ensureLesson(c2s1, "Common phrases — quiz", "quiz", 2, {
    questions: [
      { text: "How do you respond to 'How's it going?'", options: ["I'm 25", "Pretty good, thanks!", "Yes, please", "Thursday"], correct: 1, points: 1 },
      { text: "Polite way to interrupt:", options: ["Hey!", "Sorry to bother you,…", "What?", "Listen!"], correct: 1, points: 1 },
    ],
  });

  // Enrollments
  for (const cid of [c1, c2]) {
    await supabaseAdmin.from("enrollments").upsert({ student_id: studentId, course_id: cid, progress: 0 }, { onConflict: "student_id,course_id" });
  }

  // Mark some lessons complete (~40%): first 2 of course 1 + first lesson of course 2
  for (const lid of [lessons[0], lessons[1], l6]) {
    await supabaseAdmin.from("lesson_completions").upsert({ student_id: studentId, lesson_id: lid }, { onConflict: "student_id,lesson_id" });
  }

  // Recompute enrollment progress
  for (const cid of [c1, c2]) {
    const { data: secs } = await supabaseAdmin.from("sections").select("id").eq("course_id", cid);
    const sids = (secs ?? []).map((s) => s.id);
    const { data: ls } = await supabaseAdmin.from("lessons").select("id").in("section_id", sids);
    const lids = (ls ?? []).map((l) => l.id);
    if (!lids.length) continue;
    const { count } = await supabaseAdmin.from("lesson_completions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId).in("lesson_id", lids);
    await supabaseAdmin.from("enrollments").update({ progress: Math.round(((count ?? 0) / lids.length) * 100) })
      .eq("student_id", studentId).eq("course_id", cid);
  }

  // Seed 2 ungraded activity submissions for Juan if none exist
  const activityLessons = [lessons[3], lessons[4]]; // essay + reflection
  for (const lid of activityLessons) {
    const { count } = await supabaseAdmin.from("activity_submissions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId).eq("lesson_id", lid);
    if (!count) {
      await supabaseAdmin.from("activity_submissions").insert({
        student_id: studentId, lesson_id: lid,
        file_url: `${studentId}/${lid}/sample-submission.txt`,
      });
    }
  }

  // Seed 1 quiz attempt
  const { count: qc } = await supabaseAdmin.from("quiz_attempts")
    .select("*", { count: "exact", head: true }).eq("student_id", studentId).eq("lesson_id", lessons[1]);
  if (!qc) {
    await supabaseAdmin.from("quiz_attempts").insert({
      student_id: studentId, lesson_id: lessons[1],
      answers: [1, 2, 0], score: 3, total_points: 3,
    });
  }

  // Pending tasks (idempotent for each user — only seed if none)
  const seedTasks = async (uid: string, role: "admin" | "teacher" | "student", titles: string[]) => {
    const { count } = await supabaseAdmin.from("pending_tasks").select("*", { count: "exact", head: true }).eq("user_id", uid);
    if ((count ?? 0) > 0) return;
    const now = Date.now();
    await supabaseAdmin.from("pending_tasks").insert(titles.map((title, i) => ({
      user_id: uid, title, due_date: new Date(now + (i + 1) * 86400000 * 2).toISOString(),
      completed: false, role_target: role,
    })));
  };
  await seedTasks(adminId, "admin", ["Review new teacher applications", "Approve September enrollments"]);
  await seedTasks(teacherId, "teacher", ["Grade Juan's essay draft", "Prepare next week's lesson"]);
  await seedTasks(studentId, "student", ["Submit essay draft", "Watch grammar video"]);

  return { ok: true };
}

export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        try { return Response.json(await seed()); }
        catch (e) { return Response.json({ ok: false, error: String(e) }, { status: 500 }); }
      },
      POST: async () => {
        try { return Response.json(await seed()); }
        catch (e) { return Response.json({ ok: false, error: String(e) }, { status: 500 }); }
      },
    },
  },
});
