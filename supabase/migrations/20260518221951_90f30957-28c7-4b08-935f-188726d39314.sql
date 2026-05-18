-- Helper: does this teacher have this student enrolled in any of their courses?
CREATE OR REPLACE FUNCTION public.teacher_has_student(_teacher_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = _student_id AND c.teacher_id = _teacher_id
  )
$$;

-- Rewrite the three recursive policies using SECURITY DEFINER helpers
DROP POLICY IF EXISTS profiles_teacher_read_students ON public.profiles;
CREATE POLICY profiles_teacher_read_students ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND public.teacher_has_student(auth.uid(), id)
  );

DROP POLICY IF EXISTS courses_student_enrolled_read ON public.courses;
CREATE POLICY courses_student_enrolled_read ON public.courses
  FOR SELECT USING (public.is_enrolled(auth.uid(), id));

DROP POLICY IF EXISTS enrollments_teacher_read_own_courses ON public.enrollments;
CREATE POLICY enrollments_teacher_read_own_courses ON public.enrollments
  FOR SELECT USING (public.is_course_teacher(auth.uid(), course_id));
