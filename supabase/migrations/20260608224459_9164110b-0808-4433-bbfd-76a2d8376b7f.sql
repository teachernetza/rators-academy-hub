
-- 1) Restrict profiles self-update so users cannot change their own role
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2) Fix pending_tasks admin policy to use private.has_role (consistent with others)
DROP POLICY IF EXISTS tasks_admin_all ON public.pending_tasks;
CREATE POLICY tasks_admin_all ON public.pending_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Storage: add UPDATE policy on course-files mirroring INSERT (admins + course teachers)
DROP POLICY IF EXISTS "course_files_update" ON storage.objects;
CREATE POLICY "course_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  )
  WITH CHECK (
    bucket_id = 'course-files'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  );

-- 4) Storage: add DELETE policy on submissions for owners + admins + teachers of the course
DROP POLICY IF EXISTS "submissions_delete" ON storage.objects;
CREATE POLICY "submissions_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'teacher'::app_role)
    )
  );
