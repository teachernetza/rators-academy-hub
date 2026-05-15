
-- 1. Extend existing tables
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Helper function (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_course_teacher(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND teacher_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = _user_id AND course_id = _course_id
  )
$$;

-- 3. New tables
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sections_course_idx ON public.sections(course_id, order_index);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('video','activity','quiz')),
  order_index int NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lessons_section_idx ON public.lessons(section_id, order_index);

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.activity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  grade int,
  feedback text,
  graded_at timestamptz,
  graded_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS submissions_lesson_idx ON public.activity_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS submissions_student_idx ON public.activity_submissions(student_id);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 0,
  total_points int NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_lesson_idx ON public.quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS attempts_student_idx ON public.quiz_attempts(student_id);

-- 4. Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Policies — sections
CREATE POLICY sections_admin_all ON public.sections FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY sections_teacher_all ON public.sections FOR ALL
  USING (is_course_teacher(auth.uid(), course_id))
  WITH CHECK (is_course_teacher(auth.uid(), course_id));
CREATE POLICY sections_student_read ON public.sections FOR SELECT
  USING (is_enrolled(auth.uid(), course_id));

-- 6. Policies — lessons
CREATE POLICY lessons_admin_all ON public.lessons FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY lessons_teacher_all ON public.lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND is_course_teacher(auth.uid(), s.course_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND is_course_teacher(auth.uid(), s.course_id)));
CREATE POLICY lessons_student_read ON public.lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND is_enrolled(auth.uid(), s.course_id)));

-- 7. Policies — lesson_completions
CREATE POLICY completions_admin_all ON public.lesson_completions FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY completions_student_own ON public.lesson_completions FOR ALL
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY completions_teacher_read ON public.lesson_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = lesson_completions.lesson_id AND is_course_teacher(auth.uid(), s.course_id)
  ));

-- 8. Policies — activity_submissions
CREATE POLICY submissions_admin_all ON public.activity_submissions FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY submissions_student_insert ON public.activity_submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());
CREATE POLICY submissions_student_read ON public.activity_submissions FOR SELECT
  USING (student_id = auth.uid());
CREATE POLICY submissions_teacher_read ON public.activity_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = activity_submissions.lesson_id AND is_course_teacher(auth.uid(), s.course_id)
  ));
CREATE POLICY submissions_teacher_update ON public.activity_submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = activity_submissions.lesson_id AND is_course_teacher(auth.uid(), s.course_id)
  ));

-- 9. Policies — quiz_attempts
CREATE POLICY attempts_admin_all ON public.quiz_attempts FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY attempts_student_insert ON public.quiz_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());
CREATE POLICY attempts_student_read ON public.quiz_attempts FOR SELECT
  USING (student_id = auth.uid());
CREATE POLICY attempts_teacher_read ON public.quiz_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = quiz_attempts.lesson_id AND is_course_teacher(auth.uid(), s.course_id)
  ));

-- 10. Storage bucket for activity submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "submissions_student_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "submissions_student_read_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "submissions_admin_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'submissions' AND has_role(auth.uid(),'admin'));
CREATE POLICY "submissions_teacher_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.activity_submissions sub
      JOIN public.lessons l ON l.id = sub.lesson_id
      JOIN public.sections s ON s.id = l.section_id
      WHERE sub.file_url = name AND is_course_teacher(auth.uid(), s.course_id)
    )
  );
