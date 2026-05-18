CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_course_teacher(_user_id uuid, _course_id uuid)
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

CREATE OR REPLACE FUNCTION private.is_enrolled(_user_id uuid, _course_id uuid)
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

CREATE OR REPLACE FUNCTION private.teacher_has_student(_teacher_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = _student_id AND c.teacher_id = _teacher_id
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_course_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_enrolled(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_has_student(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_teacher_read_students ON public.profiles;
DROP POLICY IF EXISTS courses_admin_all ON public.courses;
DROP POLICY IF EXISTS courses_student_enrolled_read ON public.courses;
DROP POLICY IF EXISTS enrollments_admin_all ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_read_own_courses ON public.enrollments;
DROP POLICY IF EXISTS sections_admin_all ON public.sections;
DROP POLICY IF EXISTS sections_teacher_all ON public.sections;
DROP POLICY IF EXISTS sections_student_read ON public.sections;
DROP POLICY IF EXISTS lessons_admin_all ON public.lessons;
DROP POLICY IF EXISTS lessons_teacher_all ON public.lessons;
DROP POLICY IF EXISTS lessons_student_read ON public.lessons;
DROP POLICY IF EXISTS completions_admin_all ON public.lesson_completions;
DROP POLICY IF EXISTS completions_teacher_read ON public.lesson_completions;
DROP POLICY IF EXISTS submissions_admin_all ON public.activity_submissions;
DROP POLICY IF EXISTS submissions_teacher_read ON public.activity_submissions;
DROP POLICY IF EXISTS submissions_teacher_update ON public.activity_submissions;
DROP POLICY IF EXISTS attempts_admin_all ON public.quiz_attempts;
DROP POLICY IF EXISTS attempts_teacher_read ON public.quiz_attempts;
DROP POLICY IF EXISTS submission_files_admin ON storage.objects;
DROP POLICY IF EXISTS submission_files_teacher_read ON storage.objects;

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY profiles_teacher_read_students ON public.profiles
  FOR SELECT USING (
    private.has_role(auth.uid(), 'teacher'::public.app_role)
    AND private.teacher_has_student(auth.uid(), id)
  );

CREATE POLICY courses_admin_all ON public.courses
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY courses_student_enrolled_read ON public.courses
  FOR SELECT USING (private.is_enrolled(auth.uid(), id));

CREATE POLICY enrollments_admin_all ON public.enrollments
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY enrollments_teacher_read_own_courses ON public.enrollments
  FOR SELECT USING (private.is_course_teacher(auth.uid(), course_id));

CREATE POLICY sections_admin_all ON public.sections
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY sections_teacher_all ON public.sections
  FOR ALL USING (private.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (private.is_course_teacher(auth.uid(), course_id));

CREATE POLICY sections_student_read ON public.sections
  FOR SELECT USING (private.is_enrolled(auth.uid(), course_id));

CREATE POLICY lessons_admin_all ON public.lessons
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY lessons_teacher_all ON public.lessons
  FOR ALL USING (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND private.is_course_teacher(auth.uid(), s.course_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND private.is_course_teacher(auth.uid(), s.course_id)));

CREATE POLICY lessons_student_read ON public.lessons
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.sections s WHERE s.id = lessons.section_id AND private.is_enrolled(auth.uid(), s.course_id)));

CREATE POLICY completions_admin_all ON public.lesson_completions
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY completions_teacher_read ON public.lesson_completions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = lesson_completions.lesson_id AND private.is_course_teacher(auth.uid(), s.course_id)
  ));

CREATE POLICY submissions_admin_all ON public.activity_submissions
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY submissions_teacher_read ON public.activity_submissions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = activity_submissions.lesson_id AND private.is_course_teacher(auth.uid(), s.course_id)
  ));

CREATE POLICY submissions_teacher_update ON public.activity_submissions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = activity_submissions.lesson_id AND private.is_course_teacher(auth.uid(), s.course_id)
  ));

CREATE POLICY attempts_admin_all ON public.quiz_attempts
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY attempts_teacher_read ON public.quiz_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = quiz_attempts.lesson_id AND private.is_course_teacher(auth.uid(), s.course_id)
  ));

CREATE POLICY submission_files_admin ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY submission_files_teacher_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND EXISTS (
      SELECT 1 FROM public.activity_submissions sub
      JOIN public.lessons l ON l.id = sub.lesson_id
      JOIN public.sections s ON s.id = l.section_id
      WHERE sub.file_url = name AND private.is_course_teacher(auth.uid(), s.course_id)
    )
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_course_teacher(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.teacher_has_student(uuid, uuid) FROM PUBLIC, anon, authenticated;