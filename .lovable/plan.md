# Rators Academy — Fixes + Full LMS Build

## Part 1 — Fix demo auth (priority)

**Problem:** Demo logins fail. The seed route exists but may not have run, and there's no guarantee profiles exist with the right role after first login.

**Fixes:**
1. Run the seed flow server-side immediately (call admin createUser via service role, then upsert profiles with the matching role). Re-run idempotently to repair any partial state.
2. Verify the `handle_new_user` trigger fires with `raw_user_meta_data.role` and that `profiles_self_read` RLS lets the user fetch their own row right after sign-in.
3. In `src/lib/auth.tsx`: after `signIn`, await profile fetch, then `navigate(dashboardPathFor(profile.role))`. On `/login`, if already authenticated, redirect to the role dashboard.
4. Confirm `RoleGuard` redirects mismatched roles to their own dashboard (already implemented; keep).
5. Add `is_active` column on profiles; block sign-in (signOut + toast) if inactive.

## Part 2 — DB migration

New columns:
- `courses`: `cover_image_url text`, `status text default 'draft' check in ('draft','published')`
- `profiles`: `is_active boolean default true`

New tables (per user spec): `sections`, `lessons`, `lesson_completions`, `activity_submissions`, `quiz_attempts`.

Storage: bucket `submissions` (private) with RLS — students upload to `submissions/{student_id}/...`; teachers read files for lessons in their courses; admins full.

RLS summary (uses existing `has_role`):
- sections/lessons: admin all; teacher all where parent course belongs to them; students SELECT where enrolled in parent course
- lesson_completions: student own (CRUD); teacher SELECT for their courses; admin all
- activity_submissions: student INSERT/SELECT own; teacher SELECT + UPDATE (grade/feedback/graded_at/graded_by) for their courses; admin all
- quiz_attempts: student INSERT/SELECT own; teacher SELECT for their courses; admin all

Helper SQL function `is_course_teacher(_user_id, _course_id)` (SECURITY DEFINER) to keep policies non-recursive.

## Part 3 — Server functions (TanStack `createServerFn`)

Files in `src/lib/`:
- `courses.functions.ts` — list/create/update/delete courses, sections, lessons; reorder; publish toggle
- `enrollments.functions.ts` — admin assign student↔course, teacher↔course
- `student-course.functions.ts` — fetch course tree with completion flags; sequential-unlock check; mark video complete; submit activity (signed upload URL); submit quiz (score server-side); recompute enrollment progress
- `grading.functions.ts` — list pending/graded submissions for teacher; submit grade+feedback
- `admin.functions.ts` — extend with toggleActive, list courses summary (teacher name, student count, avg progress)

All teacher/student fns use `requireSupabaseAuth`; admin-only fns guard with `assertAdmin` (already present pattern).

## Part 4 — UI

Keep existing royal blue / Plus Jakarta / DM Sans design. New screens:

**Admin**
- `/admin/courses` upgraded: table + "New course" dialog (title, description, cover URL, teacher select, status), edit/delete, "Open builder"
- `/admin/courses/$courseId` Course Builder (sections + lessons CRUD, drag-reorder via order_index up/down arrows)
- `/admin/users` (existing): show generated password in dialog with copy button (already returned by serverFn — surface it), Active toggle, "Assign to course" action
- Dashboard: per-course summary cards (teacher, students, avg %)

**Teacher**
- `/teacher/courses` list (own courses) → opens same Course Builder route under `/teacher/courses/$courseId`
- `/teacher/grading` Pending / Graded tabs; grade dialog (0–100 + feedback)
- `/teacher/students` progress matrix (rows=students, cols=courses, cells=%)

**Student**
- `/student/courses` cards with cover image + progress bar
- `/student/courses/$courseId` Course Viewer:
  - Left: collapsible sections/lessons with check + lock icons
  - Main: video (YouTube embed) / activity (instructions + upload + show grade/feedback once graded) / quiz (one-question-at-a-time A/B/C/D, auto-submit, show score)
  - "Mark as complete" for video lessons
- `/student/progress` per-course → per-section → per-lesson breakdown
- Dashboard: overall % (existing CircularProgress) + per-course bars

Shared components: `LessonSidebar`, `VideoPlayer`, `ActivitySubmit`, `QuizRunner`, `CourseBuilder`, `GradeDialog`.

## Part 5 — Seed

Extend `/api/public/seed`:
- Ensure 3 demo users (existing)
- Create courses **English B1 — Grammar & Writing** (2 sections, 5 lessons mixed video/activity/quiz) and **Conversation Club Prep** (1 section, 3 lessons)
- Assign to Ms. García, status=published, with cover image URLs
- Enroll Juan in both; insert `lesson_completions` for ~40% of lessons
- Insert 2 ungraded `activity_submissions` for Juan (sample file URL placeholders)
- Insert 1 completed `quiz_attempts` row with computed score
- Recompute `enrollments.progress`

Idempotent (skip if already present by title/lesson key).

## Technical notes

- All server fns return plain DTOs (no Supabase row instances).
- Sequential unlock: a lesson is unlocked iff all earlier lessons in the same section (by `order_index`) are in `lesson_completions` for the current student.
- Activity uploads: serverFn returns a signed upload URL for `submissions/{userId}/{lessonId}/{filename}`; client PUTs file; serverFn records the resulting path.
- Quiz scoring: server compares submitted answers to `lessons.content.questions[i].correct`; never trust client-computed score.
- Use `supabase--migration` for schema, then `supabase--insert` only if needed for seed (preferred: keep seed in `/api/public/seed` for repeatability).
- Keep edits surgical — do not touch generated files (`client.ts`, `types.ts`, `routeTree.gen.ts`).

## Build order

1. Migration (schema + RLS + storage bucket)
2. Re-run seed to fix demo users
3. Server functions (courses/enrollments/student-course/grading)
4. Admin Course Builder + user mgmt enhancements
5. Teacher courses/grading/students
6. Student course viewer + progress
7. Extend seed with courses/sections/lessons/submissions/attempts
8. Smoke-test all three demo logins end-to-end

Approve to proceed.
