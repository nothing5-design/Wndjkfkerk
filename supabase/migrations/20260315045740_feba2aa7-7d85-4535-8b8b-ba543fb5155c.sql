
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS plays_remaining integer NOT NULL DEFAULT 3;
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS referred_by bigint;
