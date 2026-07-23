
CREATE TYPE public.okr_scope AS ENUM ('individual', 'service', 'organization');
CREATE TYPE public.okr_status AS ENUM ('draft', 'submitted', 'hr_validated', 'direction_validated', 'rejected');

CREATE TABLE public.okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scope public.okr_scope NOT NULL DEFAULT 'individual',
  service text,
  month_start date NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status public.okr_status NOT NULL DEFAULT 'draft',
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  ai_score integer,
  ai_feedback jsonb,
  aligned_to uuid REFERENCES public.okrs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.okrs TO authenticated;
GRANT ALL ON public.okrs TO service_role;
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or shared okrs" ON public.okrs FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR scope IN ('service','organization')
  OR public.is_staff(auth.uid())
);
CREATE POLICY "Insert own individual okrs" ON public.okrs FOR INSERT TO authenticated
WITH CHECK (
  (scope = 'individual' AND owner_id = auth.uid())
  OR public.is_staff(auth.uid())
);
CREATE POLICY "Update own draft or staff" ON public.okrs FOR UPDATE TO authenticated
USING (
  (owner_id = auth.uid() AND status IN ('draft','rejected'))
  OR public.is_staff(auth.uid())
)
WITH CHECK (
  (owner_id = auth.uid())
  OR public.is_staff(auth.uid())
);
CREATE POLICY "Direction can delete okrs" ON public.okrs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'direction') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_okrs_touch BEFORE UPDATE ON public.okrs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.okrs(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric_unit text DEFAULT '',
  target_value numeric,
  current_value numeric DEFAULT 0,
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_results TO authenticated;
GRANT ALL ON public.key_results TO service_role;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read krs of visible okrs" ON public.key_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.okrs o WHERE o.id = okr_id
  AND (o.owner_id = auth.uid() OR o.scope IN ('service','organization') OR public.is_staff(auth.uid()))));
CREATE POLICY "Write krs of editable okrs" ON public.key_results FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.okrs o WHERE o.id = okr_id
  AND ((o.owner_id = auth.uid() AND o.status IN ('draft','rejected')) OR public.is_staff(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.okrs o WHERE o.id = okr_id
  AND ((o.owner_id = auth.uid()) OR public.is_staff(auth.uid()))));

CREATE TRIGGER trg_kr_touch BEFORE UPDATE ON public.key_results
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.okr_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.okrs(id) ON DELETE CASCADE,
  validator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('hr','direction')),
  statut text NOT NULL CHECK (statut IN ('approved','rejected')),
  commentaire text DEFAULT '',
  validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.okr_validations TO authenticated;
GRANT ALL ON public.okr_validations TO service_role;
ALTER TABLE public.okr_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read okr validations" ON public.okr_validations FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.okrs o WHERE o.id = okr_id AND o.owner_id = auth.uid())
);
CREATE POLICY "Staff can insert validations" ON public.okr_validations FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND validator_id = auth.uid());

CREATE INDEX idx_okrs_owner_month ON public.okrs(owner_id, month_start DESC);
CREATE INDEX idx_okrs_scope_month ON public.okrs(scope, month_start DESC);
CREATE INDEX idx_krs_okr ON public.key_results(okr_id, position);

ALTER TABLE public.okrs REPLICA IDENTITY FULL;
ALTER TABLE public.key_results REPLICA IDENTITY FULL;
ALTER TABLE public.okr_validations REPLICA IDENTITY FULL;
