
-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_admin_all ON public.announcements
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY announcements_teacher_manage ON public.announcements
  FOR ALL TO authenticated
  USING (course_id IS NOT NULL AND private.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (course_id IS NOT NULL AND private.is_course_teacher(auth.uid(), course_id) AND author_id = auth.uid());

CREATE POLICY announcements_student_read ON public.announcements
  FOR SELECT TO authenticated
  USING (
    course_id IS NULL
    OR private.is_enrolled(auth.uid(), course_id)
    OR private.is_course_teacher(auth.uid(), course_id)
  );

CREATE INDEX announcements_course_idx ON public.announcements(course_id, created_at DESC);

-- Announcement reads
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY reads_owner_all ON public.announcement_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Lesson due dates
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS due_date timestamptz NULL;
