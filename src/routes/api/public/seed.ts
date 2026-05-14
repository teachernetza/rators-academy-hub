import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_USERS = [
  { email: "admin@ratorsacademy.com", password: "Admin1234!", full_name: "Admin Rators", role: "admin" as const },
  { email: "teacher@ratorsacademy.com", password: "Teacher1234!", full_name: "Ms. García", role: "teacher" as const },
  { email: "student@ratorsacademy.com", password: "Student1234!", full_name: "Juan López", role: "student" as const },
];

async function seed() {
  const ids: Record<string, string> = {};

  // Get existing users
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const byEmail = new Map(existing.users.map((u) => [u.email, u]));

  for (const u of DEMO_USERS) {
    let user = byEmail.get(u.email);
    if (!user) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });
      if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
      user = data.user!;
    }
    ids[u.role] = user.id;

    // Upsert profile (trigger may have set defaults)
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      full_name: u.full_name,
      role: u.role,
      status: "active",
    });
  }

  // Seed courses (idempotent by title+teacher)
  const courseTitles = [
    { title: "Algebra I", description: "Foundations of algebraic thinking." },
    { title: "World History", description: "From antiquity to the modern era." },
    { title: "Creative Writing", description: "Crafting stories that stick." },
  ];

  const teacherId = ids["teacher"];
  const studentId = ids["student"];
  const adminId = ids["admin"];

  const { data: existingCourses } = await supabaseAdmin
    .from("courses")
    .select("id,title")
    .eq("teacher_id", teacherId);
  const existingTitles = new Set((existingCourses ?? []).map((c) => c.title));

  const toInsert = courseTitles
    .filter((c) => !existingTitles.has(c.title))
    .map((c) => ({ ...c, teacher_id: teacherId }));

  if (toInsert.length) {
    await supabaseAdmin.from("courses").insert(toInsert);
  }

  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id,title")
    .eq("teacher_id", teacherId);

  // Enrollments with progress 30/65/90
  const progressMap: Record<string, number> = {
    "Algebra I": 30,
    "World History": 65,
    "Creative Writing": 90,
  };
  for (const c of courses ?? []) {
    await supabaseAdmin
      .from("enrollments")
      .upsert(
        { student_id: studentId, course_id: c.id, progress: progressMap[c.title] ?? 50 },
        { onConflict: "student_id,course_id" },
      );
  }

  // Pending tasks (clear & seed only if user has none)
  const seedTasks = async (uid: string, role: "admin" | "teacher" | "student", titles: string[]) => {
    const { count } = await supabaseAdmin
      .from("pending_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid);
    if ((count ?? 0) > 0) return;
    const now = Date.now();
    await supabaseAdmin.from("pending_tasks").insert(
      titles.map((title, i) => ({
        user_id: uid,
        title,
        due_date: new Date(now + (i + 1) * 86400000 * 2).toISOString(),
        completed: false,
        role_target: role,
      })),
    );
  };

  await seedTasks(adminId, "admin", [
    "Review new teacher applications",
    "Approve September enrollments",
    "Publish Q4 academic calendar",
    "Audit user accounts",
  ]);
  await seedTasks(teacherId, "teacher", [
    "Grade Algebra I quiz #3",
    "Post World History essay prompts",
    "Reply to 2 student questions",
    "Prepare Creative Writing workshop",
  ]);
  await seedTasks(studentId, "student", [
    "Submit Algebra I problem set",
    "Read Chapter 4 — World History",
    "Draft short story (Creative Writing)",
    "Watch lecture recording",
  ]);

  return { ok: true, users: DEMO_USERS.map((u) => ({ email: u.email, role: u.role })) };
}

export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await seed();
          return Response.json(result);
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
      POST: async () => {
        try {
          const result = await seed();
          return Response.json(result);
        } catch (e) {
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
