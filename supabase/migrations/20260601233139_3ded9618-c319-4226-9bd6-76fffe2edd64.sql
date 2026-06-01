
-- 1. lesson_comments: Q&A threads on lessons
CREATE TABLE public.lesson_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lesson_comments_lesson ON public.lesson_comments(lesson_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_comments TO authenticated;
GRANT ALL ON public.lesson_comments TO service_role;

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_admin_all ON public.lesson_comments FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY comments_enrolled_read ON public.lesson_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lessons l JOIN sections s ON s.id = l.section_id
    WHERE l.id = lesson_comments.lesson_id
      AND (private.is_enrolled(auth.uid(), s.course_id) OR private.is_course_teacher(auth.uid(), s.course_id))
  ));

CREATE POLICY comments_enrolled_insert ON public.lesson_comments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM lessons l JOIN sections s ON s.id = l.section_id
    WHERE l.id = lesson_comments.lesson_id
      AND (private.is_enrolled(auth.uid(), s.course_id) OR private.is_course_teacher(auth.uid(), s.course_id))
  ));

CREATE POLICY comments_owner_delete ON public.lesson_comments FOR DELETE
  USING (user_id = auth.uid());

-- 2. lesson_notes: private student notes per lesson
CREATE TABLE public.lesson_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL,
  student_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated;
GRANT ALL ON public.lesson_notes TO service_role;

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_owner_all ON public.lesson_notes FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- 3. certificates: auto-issued on 100% course progress
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  serial TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY certificates_owner_read ON public.certificates FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY certificates_teacher_read ON public.certificates FOR SELECT
  USING (private.is_course_teacher(auth.uid(), course_id));

CREATE POLICY certificates_admin_all ON public.certificates FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 4. course-files bucket for teacher-uploaded reading/file lessons
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {course_id}/{lesson_id}/{filename}
CREATE POLICY "course-files: enrolled or teacher read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'course-files' AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.is_enrolled(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR private.is_course_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "course-files: teacher upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-files' AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.is_course_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "course-files: teacher delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-files' AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.is_course_teacher(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

-- 5. Self-enrollment into published courses
CREATE POLICY enrollments_student_self_enroll ON public.enrollments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.status = 'published')
  );
