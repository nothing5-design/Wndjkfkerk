
-- Add bot_token and official_site_url to bot_settings
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS bot_token text DEFAULT NULL;
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS official_site_url text DEFAULT 'https://win91.com';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS tutorial_links jsonb DEFAULT '{
  "colour_prediction": "",
  "aviator": "",
  "chicken_road": "",
  "mines": "",
  "k3": "",
  "5d": "",
  "slot_games": "",
  "casino_games": "",
  "card_games": "",
  "crash_game": ""
}'::jsonb;

-- Add coin_cost to redemption_codes for tiered redemption
ALTER TABLE public.redemption_codes ADD COLUMN IF NOT EXISTS coin_cost integer NOT NULL DEFAULT 1000;

-- Add total_coins_earned to bot_users
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS total_coins_earned integer NOT NULL DEFAULT 0;

-- Update existing bot_settings row
UPDATE public.bot_settings SET official_site_url = 'https://win91.com' WHERE id = 1 AND official_site_url IS NULL;
