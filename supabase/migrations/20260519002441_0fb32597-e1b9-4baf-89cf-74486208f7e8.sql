
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (course_id, invitee_id, role)
);

CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON public.invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_course ON public.invitations(course_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_invitee_read" ON public.invitations
  FOR SELECT USING (invitee_id = auth.uid());

CREATE POLICY "invitations_invitee_update" ON public.invitations
  FOR UPDATE USING (invitee_id = auth.uid());

CREATE POLICY "invitations_admin_all" ON public.invitations
  FOR ALL USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "invitations_teacher_manage" ON public.invitations
  FOR ALL USING (private.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (private.is_course_teacher(auth.uid(), course_id));
