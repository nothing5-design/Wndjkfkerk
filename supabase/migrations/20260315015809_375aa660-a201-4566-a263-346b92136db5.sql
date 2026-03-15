
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Bot buttons table
CREATE TABLE public.bot_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  callback_data TEXT NOT NULL DEFAULT '',
  message_text TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'photo',
  link_url TEXT,
  row_order INTEGER NOT NULL DEFAULT 0,
  position_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bot settings table (singleton pattern)
CREATE TABLE public.bot_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  welcome_message TEXT NOT NULL DEFAULT 'Welcome! Choose an option below:',
  welcome_media_url TEXT,
  welcome_media_type TEXT DEFAULT 'photo',
  bot_name TEXT DEFAULT 'My Bot',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed default settings row
INSERT INTO public.bot_settings (id) VALUES (1);

-- Enable RLS
ALTER TABLE public.bot_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Only authenticated users can manage bot buttons
CREATE POLICY "Authenticated users can view bot_buttons"
  ON public.bot_buttons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert bot_buttons"
  ON public.bot_buttons FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update bot_buttons"
  ON public.bot_buttons FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete bot_buttons"
  ON public.bot_buttons FOR DELETE TO authenticated USING (true);

-- RLS: Only authenticated users can manage bot settings
CREATE POLICY "Authenticated users can view bot_settings"
  ON public.bot_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update bot_settings"
  ON public.bot_settings FOR UPDATE TO authenticated USING (true);

-- Public read for bot script (anon can read config)
CREATE POLICY "Anon can read bot_buttons"
  ON public.bot_buttons FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read bot_settings"
  ON public.bot_settings FOR SELECT TO anon USING (true);

-- Triggers
CREATE TRIGGER update_bot_buttons_updated_at
  BEFORE UPDATE ON public.bot_buttons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_settings_updated_at
  BEFORE UPDATE ON public.bot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
