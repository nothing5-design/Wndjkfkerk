
CREATE TABLE public.force_join_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  button_name text NOT NULL,
  channel_id text NOT NULL,
  channel_link text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  position_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.force_join_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read force_join_channels" ON public.force_join_channels FOR SELECT TO anon USING (true);
CREATE POLICY "Auth can manage force_join_channels" ON public.force_join_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
