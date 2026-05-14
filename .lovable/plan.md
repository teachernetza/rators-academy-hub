# Rators Academy — LMS Build Plan

## 1. Backend (Lovable Cloud / Supabase)

Enable Lovable Cloud, then create schema via migration:

- `app_role` enum: `admin | teacher | student`
- `profiles` (id PK→auth.users, full_name, role app_role, bio, avatar_url, status, created_at)
- `courses` (id, title, description, teacher_id→profiles, created_at)
- `enrollments` (id, student_id, course_id, progress int 0–100, enrolled_at)
- `pending_tasks` (id, user_id, title, due_date, completed bool, role_target)
- `has_role(uuid, app_role)` SECURITY DEFINER function (avoids RLS recursion)
- Trigger `handle_new_user` to insert into `profiles` on signup

**RLS policies:**
- profiles: self read/update; admins all (via `has_role`); teachers can read student profiles enrolled in their courses
- courses: admins all; teachers manage own courses; students read courses they're enrolled in
- enrollments: students read own; teachers read for own courses; admins all
- pending_tasks: users read own; admins all

**Seed data** (via insert tool after migration):
- 3 demo users created through Supabase Auth admin API in a one-shot server function (or manual seed). Since we can't call admin API from migration, seed approach: create users via `supabase.auth.admin.createUser` in a one-time `createServerFn` triggered manually OR document that the first run auto-seeds via a server route `/api/public/seed` (idempotent, guarded by a secret).
- After users exist: insert profiles, 3 courses (assigned to teacher), enrollments for student with progress 30/65/90, 3–4 pending tasks per user.

## 2. Design System

Update `src/styles.css`:
- Primary `#1A3DB5` (oklch equivalent) + glow/hover shades
- Neutral white/light-gray surfaces
- Add Plus Jakarta Sans (headings) + DM Sans (body) via Google Fonts link in `__root.tsx` head
- Tailwind font tokens: `font-heading`, `font-sans`
- Royal-blue gradient + soft shadow tokens for cards/CTAs

## 3. Auth

- `src/integrations/supabase/client.ts` (auto from Cloud)
- `src/lib/auth.ts`: `useAuth` hook subscribing to `onAuthStateChange`, exposes `user`, `profile`, `role`, `loading`, `signIn`, `signOut`
- Single `/login` route — "Welcome to Rators Academy" hero, email + password, subtle instructor/admin note
- After sign-in, fetch profile.role → redirect to `/admin/dashboard | /teacher/dashboard | /student/dashboard`

## 4. Routing (TanStack Start file routes)

```
src/routes/
  __root.tsx                    (fonts, QueryClient, auth listener)
  index.tsx                     (redirect to /login or role dashboard)
  login.tsx
  _admin.tsx                    (guard: role===admin else redirect)
  _admin/admin.dashboard.tsx
  _admin/admin.teachers.tsx
  _admin/admin.students.tsx
  _admin/admin.courses.tsx      (placeholder)
  _admin/admin.settings.tsx     (placeholder)
  _teacher.tsx                  (guard)
  _teacher/teacher.dashboard.tsx
  _teacher/teacher.courses.tsx
  _teacher/teacher.students.tsx
  _teacher/teacher.pending.tsx
  _teacher/teacher.profile.tsx
  _student.tsx                  (guard)
  _student/student.dashboard.tsx
  _student/student.courses.tsx
  _student/student.progress.tsx
  _student/student.pending.tsx
  _student/student.profile.tsx
```

Each guarded layout uses `beforeLoad` to check session + role; wrong role → redirect to their own dashboard. Loading spinner during auth hydration.

## 5. Shared Layout Components

- `DashboardLayout` — sticky top bar (logo, user name, Logout) + collapsible Shadcn sidebar with role-specific items + `<Outlet />`
- `RoleSidebar` (admin/teacher/student variants) with active route highlighting in royal blue
- `StatCard`, `ProgressBar`, `CircularProgress`, `RoleBadge`, `UserTable`

## 6. Admin Dashboard

- Overview: 4 stat cards (students, teachers, courses, active enrollments) — counted via Supabase queries through `createServerFn` with `requireSupabaseAuth`
- Create Teacher / Create Student forms → server fn calls `supabase.auth.admin.createUser` (admin client) with auto-generated 12-char password, returns password once shown in a dialog
- Users table with role badges, status toggle, delete button (server fn)

## 7. Teacher Dashboard

- Greeting using profile.full_name
- "My Courses" — real query `courses where teacher_id = me`
- Pending tasks panel (mocked counts from `pending_tasks` where role_target='teacher')
- Student progress table — join enrollments + profiles for teacher's courses
- Profile editor (name, bio, avatar UI placeholder — updates `profiles`)

## 8. Student Dashboard

- Greeting + motivational copy
- Enrolled course cards (title, progress bar, last activity)
- Overall completion CircularProgress (avg of enrollments.progress)
- Pending tasks list
- Profile editor

## 9. Technical Notes

- TanStack Start (NOT Vite + React Router — template uses TanStack)
- All data fetching via `createServerFn` + `requireSupabaseAuth`; admin operations via `supabaseAdmin`
- `attachSupabaseAuth` already wired in `src/start.ts` (verify)
- Mobile responsive via Tailwind (sidebar → Sheet on mobile)
- Toast notifications (sonner) for create/delete actions
- Loading spinner during `auth.loading`

## 10. Build Order

1. Enable Lovable Cloud
2. Migration: enum, tables, has_role, trigger, RLS policies
3. Design tokens + fonts
4. Auth hook + login page
5. Role-guarded layouts + sidebar/topbar
6. Admin dashboard (stats + user management server fns)
7. Teacher dashboard
8. Student dashboard
9. Seed users + mock data (server fn or `/api/public/seed`)
10. QA: login as each demo user, verify guards and royal-blue theming

## Open question

Two seeding options — pick one:
- **A)** Auto-seed on first visit via idempotent `/api/public/seed?token=...` route using service role (I'll wire this so the 3 demo accounts exist immediately).
- **B)** I create the 3 users manually via Cloud's Users panel after build, then seed profiles/courses via SQL.

I'll default to **A** unless you prefer B.
