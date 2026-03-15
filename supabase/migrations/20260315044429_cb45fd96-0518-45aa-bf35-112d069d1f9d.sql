
-- Telegram bot users table
CREATE TABLE public.bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  first_name text,
  language text DEFAULT 'en',
  coins integer NOT NULL DEFAULT 0,
  last_played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Game history
CREATE TABLE public.game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  game_type text NOT NULL, -- 'wheel_spin', 'lucky_box', 'number_guess'
  coins_won integer NOT NULL DEFAULT 0,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_history_telegram_id ON public.game_history(telegram_id);

-- Redemption codes (admin uploads codes, users claim them)
CREATE TABLE public.redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_by_telegram_id bigint,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;

-- Anon read for bot_users (bot needs to read/write via service role, but anon for the bot script)
CREATE POLICY "Anon can read bot_users" ON public.bot_users FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert bot_users" ON public.bot_users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update bot_users" ON public.bot_users FOR UPDATE TO anon USING (true);

-- Authenticated (admin) full access
CREATE POLICY "Auth can manage bot_users" ON public.bot_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Game history - anon can insert, auth can read all
CREATE POLICY "Anon can insert game_history" ON public.game_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read game_history" ON public.game_history FOR SELECT TO anon USING (true);
CREATE POLICY "Auth can manage game_history" ON public.game_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Redemption codes - anon can read unclaimed, auth can manage
CREATE POLICY "Anon can read redemption_codes" ON public.redemption_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update redemption_codes" ON public.redemption_codes FOR UPDATE TO anon USING (true);
CREATE POLICY "Auth can manage redemption_codes" ON public.redemption_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at on bot_users
CREATE TRIGGER set_updated_at_bot_users
  BEFORE UPDATE ON public.bot_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
