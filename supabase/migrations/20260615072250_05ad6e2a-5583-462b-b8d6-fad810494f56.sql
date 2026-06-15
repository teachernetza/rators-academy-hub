
CREATE TYPE public.cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2');
CREATE TYPE public.activity_section_type AS ENUM ('open_text','match_pairs','order_words');
CREATE TYPE public.assignment_status AS ENUM ('pending','in_review','changes_requested','approved');
CREATE TYPE public.submission_status AS ENUM ('in_review','changes_requested','approved');
CREATE TYPE public.section_response_status AS ENUM ('pending_review','approved','changes_requested');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- Tables first (no cross-referencing policies yet)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cefr_level public.cefr_level NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  instructions TEXT,
  section_type public.activity_section_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_sections_activity_idx ON public.activity_sections(activity_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_sections TO authenticated;
GRANT ALL ON public.activity_sections TO service_role;
ALTER TABLE public.activity_sections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  current_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.assignment_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_assignments_student_idx ON public.activity_assignments(student_id);
CREATE INDEX activity_assignments_reviewer_idx ON public.activity_assignments(current_reviewer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_assignments TO authenticated;
GRANT ALL ON public.activity_assignments TO service_role;
ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.activity_assignments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submitted_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  overall_status public.submission_status NOT NULL DEFAULT 'in_review',
  overall_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, attempt_number)
);
CREATE INDEX assignment_submissions_assignment_idx ON public.assignment_submissions(assignment_id);
CREATE INDEX assignment_submissions_reviewer_idx ON public.assignment_submissions(submitted_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submission_section_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.activity_sections(id) ON DELETE CASCADE,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  section_status public.section_response_status NOT NULL DEFAULT 'pending_review',
  teacher_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, section_id)
);
CREATE INDEX section_responses_submission_idx ON public.submission_section_responses(submission_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_section_responses TO authenticated;
GRANT ALL ON public.submission_section_responses TO service_role;
ALTER TABLE public.submission_section_responses ENABLE ROW LEVEL SECURITY;

-- Policies (all tables exist now)
CREATE POLICY "Staff read activities" ON public.activities FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Students read assigned activity" ON public.activities FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.activity_assignments aa
    WHERE aa.activity_id = activities.id AND aa.student_id = auth.uid()
  ));
CREATE POLICY "Staff insert activities" ON public.activities FOR INSERT
  TO authenticated WITH CHECK (
    (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
    AND created_by = auth.uid()
  );
CREATE POLICY "Owner or admin update activities" ON public.activities FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY "Owner or admin delete activities" ON public.activities FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR created_by = auth.uid());

CREATE POLICY "Staff read sections" ON public.activity_sections FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Students read assigned sections" ON public.activity_sections FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.activity_assignments aa
    WHERE aa.activity_id = activity_sections.activity_id AND aa.student_id = auth.uid()
  ));
CREATE POLICY "Owner or admin write sections" ON public.activity_sections FOR ALL
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.activities a WHERE a.id = activity_sections.activity_id
      AND (public.has_role(auth.uid(),'admin') OR a.created_by = auth.uid())
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.activities a WHERE a.id = activity_sections.activity_id
      AND (public.has_role(auth.uid(),'admin') OR a.created_by = auth.uid())
  ));

CREATE POLICY "Read assignments scoped" ON public.activity_assignments FOR SELECT
  TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR student_id = auth.uid()
    OR assigned_by = auth.uid()
    OR current_reviewer_id = auth.uid()
  );
CREATE POLICY "Staff create assignments" ON public.activity_assignments FOR INSERT
  TO authenticated WITH CHECK (
    (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
    AND assigned_by = auth.uid()
  );
CREATE POLICY "Update assignment scoped" ON public.activity_assignments FOR UPDATE
  TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR student_id = auth.uid()
    OR current_reviewer_id = auth.uid()
    OR assigned_by = auth.uid()
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR student_id = auth.uid()
    OR current_reviewer_id = auth.uid()
    OR assigned_by = auth.uid()
  );
CREATE POLICY "Staff delete assignment" ON public.activity_assignments FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR assigned_by = auth.uid());

CREATE POLICY "Read submissions scoped" ON public.assignment_submissions FOR SELECT
  TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR submitted_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.activity_assignments aa
               WHERE aa.id = assignment_submissions.assignment_id
                 AND (aa.student_id = auth.uid() OR aa.assigned_by = auth.uid()))
  );
CREATE POLICY "Student creates submission" ON public.assignment_submissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.activity_assignments aa
            WHERE aa.id = assignment_submissions.assignment_id AND aa.student_id = auth.uid())
  );
CREATE POLICY "Reviewer or admin update submission" ON public.assignment_submissions FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR submitted_to = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR submitted_to = auth.uid());

CREATE POLICY "Read responses scoped" ON public.submission_section_responses FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    JOIN public.activity_assignments a ON a.id = s.assignment_id
    WHERE s.id = submission_section_responses.submission_id
      AND (public.has_role(auth.uid(),'admin')
        OR s.submitted_to = auth.uid()
        OR a.student_id = auth.uid()
        OR a.assigned_by = auth.uid())
  ));
CREATE POLICY "Student writes responses" ON public.submission_section_responses FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    JOIN public.activity_assignments a ON a.id = s.assignment_id
    WHERE s.id = submission_section_responses.submission_id AND a.student_id = auth.uid()
  ));
CREATE POLICY "Reviewer updates responses" ON public.submission_section_responses FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    WHERE s.id = submission_section_responses.submission_id
      AND (public.has_role(auth.uid(),'admin') OR s.submitted_to = auth.uid())
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.assignment_submissions s
    WHERE s.id = submission_section_responses.submission_id
      AND (public.has_role(auth.uid(),'admin') OR s.submitted_to = auth.uid())
  ));

-- Triggers
CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_activity_sections_updated_at BEFORE UPDATE ON public.activity_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_activity_assignments_updated_at BEFORE UPDATE ON public.activity_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_section_responses_updated_at BEFORE UPDATE ON public.submission_section_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
