
REVOKE EXECUTE ON FUNCTION public.is_course_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) TO authenticated;
