
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS wheel_plays integer NOT NULL DEFAULT 1;
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS box_plays integer NOT NULL DEFAULT 1;
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS guess_plays integer NOT NULL DEFAULT 1;
-- Update existing users to have 1 play per mode
UPDATE public.bot_users SET wheel_plays = 1, box_plays = 1, guess_plays = 1 WHERE wheel_plays = 0 OR box_plays = 0 OR guess_plays = 0;
