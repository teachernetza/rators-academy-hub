## Status check

The student lesson viewer already exists with sequential unlock, video, activity upload + grading, and quizzes. Below are **new capabilities** to add — not a rebuild.

## What we'll add (5 capabilities)

### 1. Per-lesson discussions (Q&A thread)
Students can ask questions on any lesson; teachers and classmates can reply.
- New table `lesson_comments` (lesson_id, user_id, parent_id, body, created_at).
- Right-side panel inside the lesson viewer with a thread.
- Teacher replies get a "Teacher" badge; new replies trigger a `pending_tasks` row for the teacher.

### 2. Personal notes per lesson
Students can keep private notes while watching a video.
- New table `lesson_notes` (lesson_id, student_id, body, updated_at). One row per student/lesson.
- Collapsible notes panel beside the video; autosaves on blur.

### 3. Course certificates
When a student hits 100% progress, generate a printable certificate page.
- New table `certificates` (student_id, course_id, issued_at, serial). Auto-created when `recomputeProgress` returns 100%.
- New route `/student/certificates` listing all certificates.
- New route `/student/certificates/$id` rendering a printable certificate (CSS print styles).
- Surfaced on the student dashboard ("You earned a certificate!").

### 4. Richer lesson types in the course builder
Extend the existing `lessons.type` discriminator with two more:
- **`reading`** — rich-text/markdown lesson body (Tiptap or simple textarea + react-markdown). Marked complete via "Mark as read".
- **`file`** — teacher uploads a PDF/slide deck; students download it. Reuses the `submissions` bucket pattern but in a new `course-files` bucket (public-read inside enrolled courses).

Wires into `CourseBuilder`, `LessonForm`, and the student `LessonView`.

### 5. Course catalog + self-enrollment for published courses
Today, students must be invited. Add a `/student/catalog` page listing all `status='published'` courses, with an "Enroll" button that creates the enrollment row directly (RLS policy update required).

## Technical notes

**Migrations (one batch):**
- `lesson_comments` table + RLS (enrolled students read/write on their courses; teachers can read/write on their courses; admin all).
- `lesson_notes` table + RLS (owner only).
- `certificates` table + RLS (owner read; admin all). Serial = `gen_random_uuid()` short-prefix.
- Extend `lessons.type` check (currently free text) — no schema change needed since `type` is `text`.
- New `course-files` storage bucket (private) + RLS policy keyed to enrollment.
- New `enrollments` INSERT policy allowing a student to self-enroll into a `published` course.

**New server functions in `src/lib/`:**
- `comments.functions.ts` — `listComments`, `postComment`.
- `notes.functions.ts` — `getNote`, `saveNote`.
- `certificates.functions.ts` — `listMyCertificates`, `getCertificate`; emit certificate inside `recomputeProgress` when pct=100.
- `catalog.functions.ts` — `listCatalog`, `enrollSelf`.

**New routes:**
- `/student/catalog`
- `/student/certificates`
- `/student/certificates/$id`

**Updated files:**
- `student/courses.$courseId.tsx` — add Comments panel + Notes panel + new lesson-type renderers.
- `course-builder.tsx` (`LessonForm`) — add "Reading" and "File" type options.
- `student/dashboard.tsx` — surface earned certificates + catalog CTA.
- `dashboard-layout.tsx` — sidebar links for Catalog & Certificates.

## Out of scope (call out if you'd rather do these instead)
- Live announcements/notifications system
- Calendar/deadlines view
- Messaging (DMs between teacher/student)
- AI tutor on lessons using Lovable AI
- Mobile-specific polish

## Approve to proceed
If you approve, I'll start with the migration (single batch covering all 5 features) so you can review the SQL before any code changes land.