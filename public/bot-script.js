/**
 * Telegram Promotional Bot Script
 * ================================
 * Run this on your VPS with Node.js
 *
 * Setup:
 *   npm init -y
 *   npm install node-telegram-bot-api @supabase/supabase-js
 *
 * Environment variables (set in .env or export):
 *   BOT_TOKEN=your_telegram_bot_token
 *   SUPABASE_URL=https://oqsswngolisxtdtdrdfj.supabase.co
 *   SUPABASE_ANON_KEY=your_anon_key
 *
 * Run:
 *   node bot-script.js
 *   # or with pm2:
 *   pm2 start bot-script.js --name telegram-bot
 */

const TelegramBot = require("node-telegram-bot-api");
const { createClient } = require("@supabase/supabase-js");

// ─── Config ───────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars: BOT_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let cachedButtons = [];
let cachedSettings = {};

// ─── Load config from Supabase ────────────────────────
async function loadConfig() {
  console.log("📡 Loading config from database...");

  const { data: buttons, error: btnErr } = await supabase
    .from("bot_buttons")
    .select("*")
    .eq("is_active", true)
    .order("row_order")
    .order("position_order");

  if (btnErr) {
    console.error("Failed to load buttons:", btnErr.message);
  } else {
    cachedButtons = buttons;
    console.log(`✅ Loaded ${buttons.length} buttons`);
  }

  const { data: settings, error: setErr } = await supabase
    .from("bot_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (setErr) {
    console.error("Failed to load settings:", setErr.message);
  } else {
    cachedSettings = settings;
    console.log(`✅ Loaded settings: "${settings.bot_name}"`);
  }
}

// ─── Build inline keyboard ───────────────────────────
function buildKeyboard() {
  const rows = {};
  for (const btn of cachedButtons) {
    if (!rows[btn.row_order]) rows[btn.row_order] = [];
    
    const buttonObj = { text: btn.label };
    if (btn.link_url) {
      buttonObj.url = btn.link_url;
    } else {
      buttonObj.callback_data = btn.callback_data || btn.id;
    }
    rows[btn.row_order].push(buttonObj);
  }

  return Object.keys(rows)
    .sort((a, b) => a - b)
    .map((key) => rows[key]);
}

// ─── /start command ──────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const keyboard = buildKeyboard();
  const opts = {
    parse_mode: "HTML",
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  };

  const mediaUrl = cachedSettings.welcome_media_url;
  const mediaType = cachedSettings.welcome_media_type || "photo";
  const text = cachedSettings.welcome_message || "Welcome!";

  try {
    if (mediaUrl) {
      if (mediaType === "video") {
        await bot.sendVideo(chatId, mediaUrl, { ...opts, caption: text });
      } else if (mediaType === "animation") {
        await bot.sendAnimation(chatId, mediaUrl, { ...opts, caption: text });
      } else {
        await bot.sendPhoto(chatId, mediaUrl, { ...opts, caption: text });
      }
    } else {
      await bot.sendMessage(chatId, text, opts);
    }
  } catch (err) {
    console.error("Error sending start message:", err.message);
    await bot.sendMessage(chatId, text, opts);
  }
});

// ─── /reload command (admin) ─────────────────────────
bot.onText(/\/reload/, async (msg) => {
  await loadConfig();
  bot.sendMessage(msg.chat.id, "✅ Config reloaded from database!");
});

// ─── Callback query handler ─────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  const button = cachedButtons.find(
    (b) => b.callback_data === data || b.id === data
  );

  if (!button) {
    await bot.answerCallbackQuery(query.id, { text: "Unknown button" });
    return;
  }

  await bot.answerCallbackQuery(query.id);

  const text = button.message_text || `You pressed: ${button.label}`;
  const mediaUrl = button.media_url;
  const mediaType = button.media_type || "photo";
  const opts = { parse_mode: "HTML" };

  try {
    if (mediaUrl) {
      if (mediaType === "video") {
        await bot.sendVideo(chatId, mediaUrl, { ...opts, caption: text });
      } else if (mediaType === "animation") {
        await bot.sendAnimation(chatId, mediaUrl, { ...opts, caption: text });
      } else {
        await bot.sendPhoto(chatId, mediaUrl, { ...opts, caption: text });
      }
    } else {
      await bot.sendMessage(chatId, text, opts);
    }
  } catch (err) {
    console.error("Error handling callback:", err.message);
    await bot.sendMessage(chatId, text, opts);
  }
});

// ─── Start ───────────────────────────────────────────
(async () => {
  await loadConfig();
  console.log(`🤖 Bot "${cachedSettings.bot_name || "Bot"}" is running!`);
})();
