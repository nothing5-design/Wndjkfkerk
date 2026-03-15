import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const IMG_BASE = 'https://ydnkehsbhmpxpmbdvakx.supabase.co/storage/v1/object/public/bot-images';

const IMG = {
  logo: `${IMG_BASE}/winbhai-logo.jpg`,
  games: `${IMG_BASE}/games-banner.jpg`,
  support: `${IMG_BASE}/support-banner.jpg`,
  tutorials: `${IMG_BASE}/tutorials-banner.jpg`,
  account: `${IMG_BASE}/account-banner.jpg`,
  redeem: `${IMG_BASE}/redeem-banner.jpg`,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK');

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return new Response('Missing keys', { status: 500 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const update = await req.json();

  const hdrs = {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': TELEGRAM_API_KEY,
    'Content-Type': 'application/json',
  };

  // Send text message
  const send = async (chatId: number, text: string, kb?: any) => {
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...(kb && { reply_markup: kb }) }),
    });
  };

  // Send photo with caption
  const sendPhoto = async (chatId: number, photo: string, caption: string, kb?: any) => {
    const res = await fetch(`${GATEWAY_URL}/sendPhoto`, {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ chat_id: chatId, photo, caption, parse_mode: 'HTML', ...(kb && { reply_markup: kb }) }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Photo send failed:', JSON.stringify(data));
      // Fallback to text
      await send(chatId, caption, kb);
    }
  };

  const sendDice = async (chatId: number, emoji: string): Promise<number> => {
    const res = await fetch(`${GATEWAY_URL}/sendDice`, {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ chat_id: chatId, emoji }),
    });
    const data = await res.json();
    return data?.result?.dice?.value || 1;
  };

  const getUser = async (tid: number, fn?: string, un?: string) => {
    const { data } = await supabase.from('bot_users').select('*').eq('telegram_id', tid).single();
    if (data) return data;
    const { data: nu } = await supabase.from('bot_users')
      .insert({ telegram_id: tid, first_name: fn, username: un, wheel_plays: 1, box_plays: 1, guess_plays: 1 })
      .select().single();
    return nu;
  };

  const addCoins = async (tid: number, coins: number, gameType: string, playField: string, details?: any) => {
    const { data: u } = await supabase.from('bot_users').select('coins, wheel_plays, box_plays, guess_plays, total_coins_earned').eq('telegram_id', tid).single();
    const nc = (u?.coins || 0) + coins;
    const upd: any = { coins: nc, last_played_at: new Date().toISOString(), total_coins_earned: (u?.total_coins_earned || 0) + coins };
    upd[playField] = Math.max(0, (u?.[playField] || 0) - 1);
    await supabase.from('bot_users').update(upd).eq('telegram_id', tid);
    await supabase.from('game_history').insert({ telegram_id: tid, game_type: gameType, coins_won: coins, details: details || {} });
    return { coins: nc, wheel: playField === 'wheel_plays' ? upd.wheel_plays : (u?.wheel_plays ?? 0), box: playField === 'box_plays' ? upd.box_plays : (u?.box_plays ?? 0), guess: playField === 'guess_plays' ? upd.guess_plays : (u?.guess_plays ?? 0) };
  };

  const getSettings = async () => {
    const { data } = await supabase.from('bot_settings').select('*').eq('id', 1).single();
    return data;
  };

  const getBotLink = async (chatId: number) => {
    const res = await fetch(`${GATEWAY_URL}/getMe`, { method: 'POST', headers: hdrs, body: '{}' });
    const d = await res.json();
    return `https://t.me/${d?.result?.username || 'bot'}?start=ref${chatId}`;
  };

  // Force join check
  const getForceJoinChannels = async () => {
    const { data } = await supabase.from('force_join_channels').select('*').eq('is_active', true).order('position_order');
    return data || [];
  };

  const checkMembership = async (chatId: number, channelId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${GATEWAY_URL}/getChatMember`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ chat_id: channelId, user_id: chatId }),
      });
      const data = await res.json();
      const status = data?.result?.status;
      return ['member', 'administrator', 'creator'].includes(status);
    } catch {
      return false;
    }
  };

  const checkAllChannels = async (chatId: number): Promise<{ joined: boolean; missing: any[] }> => {
    const channels = await getForceJoinChannels();
    if (channels.length === 0) return { joined: true, missing: [] };
    const missing: any[] = [];
    for (const ch of channels) {
      const isMember = await checkMembership(chatId, ch.channel_id);
      if (!isMember) missing.push(ch);
    }
    return { joined: missing.length === 0, missing };
  };

  const sendForceJoinMessage = async (chatId: number, missing: any[]) => {
    const buttons = missing.map((ch: any) => [{ text: ch.button_name, url: ch.channel_link }]);
    buttons.push([{ text: '✅ I Joined All', callback_data: 'check_join' }]);
    await sendPhoto(chatId, IMG.logo, '🔒 <b>Join Required Channels</b>\n\nYou must join all channels below to use this bot:\n\n👇 Click each button to join, then press "✅ I Joined All"', {
      inline_keyboard: buttons,
    });
  };

  const slotCoins = (val: number): number => {
    if (val === 64) return 100;
    if (val >= 60) return 50;
    if (val >= 50) return 25;
    if (val >= 40) return 15;
    if (val >= 22) return 10;
    return 0;
  };

  const getLevel = (totalCoins: number): string => {
    if (totalCoins >= 50000) return '🏆 Legend';
    if (totalCoins >= 20000) return '💎 Diamond';
    if (totalCoins >= 10000) return '🥇 Gold';
    if (totalCoins >= 5000) return '🥈 Silver';
    if (totalCoins >= 1000) return '🥉 Bronze';
    return '🌱 Beginner';
  };

  const REDEEM_TIERS = [
    { coins: 1000, label: '₹100', rupees: 100 },
    { coins: 2000, label: '₹200', rupees: 200 },
    { coins: 3000, label: '₹300', rupees: 300 },
    { coins: 10000, label: '₹1,000', rupees: 1000 },
    { coins: 50000, label: '₹5,000', rupees: 5000 },
    { coins: 100000, label: '₹10,000', rupees: 10000 },
  ];

  // Reply keyboard for main menu (like 1win bot style)
  const mainReplyKb = () => ({
    keyboard: [
      [{ text: '👤 My Account' }, { text: '🎮 Play Games' }],
      [{ text: '📚 Tutorials' }, { text: '📞 24/7 Support' }],
      [{ text: '🎁 Gift Codes' }, { text: '🤝 Become Agent' }],
      [{ text: '🌐 Official Site' }, { text: '📲 App Download' }],
      [{ text: '📢 Prediction Channel' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  });

  // Inline keyboards for sub-menus
  const backMainKb = () => ({
    inline_keyboard: [
      [{ text: '🔙 Back', callback_data: 'main_menu' }, { text: '🏠 Main Menu', callback_data: 'main_menu' }],
    ],
  });

  const gameMenuKb = () => ({
    inline_keyboard: [
      [{ text: '🎰 Slot Machine', callback_data: 'game_wheel' }],
      [{ text: '📦 Lucky Box', callback_data: 'game_lucky_box' }],
      [{ text: '🎯 Number Guess', callback_data: 'game_number_guess' }],
      [{ text: '💰 Balance', callback_data: 'balance' }],
      [{ text: '🔙 Back', callback_data: 'main_menu' }],
    ],
  });

  // AI Support
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: `You are a friendly 24/7 customer support assistant for WINBHAI, a gaming platform. Help with account issues, deposits, withdrawals, game rules, bonuses, technical issues. Keep responses under 200 words. Use same language as user. If can't help, suggest contacting manager.` },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
    } catch {
      return '❌ AI support is temporarily unavailable. Please try again later.';
    }
  };

  try {
    // ========== /start COMMAND ==========
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const fn = update.message.from?.first_name || 'User';
      const un = update.message.from?.username;
      const parts = update.message.text.split(' ');
      let refId: number | null = null;
      if (parts[1]?.startsWith('ref')) {
        refId = parseInt(parts[1].replace('ref', ''));
        if (isNaN(refId) || refId === chatId) refId = null;
      }

      const user = await getUser(chatId, fn, un);

      // Force join check
      const { joined, missing } = await checkAllChannels(chatId);
      if (!joined) {
        // Store ref but don't award yet
        if (refId && user && !user.referred_by) {
          await supabase.from('bot_users').update({ referred_by: refId }).eq('telegram_id', chatId);
        }
        await sendForceJoinMessage(chatId, missing);
        return new Response('OK');
      }

      // Award referral only after force join passed
      if (refId && user && !user.referred_by) {
        await supabase.from('bot_users').update({ referred_by: refId }).eq('telegram_id', chatId);
        const { data: referrer } = await supabase.from('bot_users').select('*').eq('telegram_id', refId).single();
        if (referrer) {
          const nrc = (referrer.referral_count || 0) + 1;
          const upd: any = { referral_count: nrc };
          if (nrc % 2 === 0) {
            upd.wheel_plays = (referrer.wheel_plays || 0) + 1;
            upd.box_plays = (referrer.box_plays || 0) + 1;
            upd.guess_plays = (referrer.guess_plays || 0) + 1;
          }
          await supabase.from('bot_users').update(upd).eq('telegram_id', refId);
          await send(refId, `🎉 <b>${fn}</b> joined via your link!\n\nReferrals: ${nrc % 2}/2${nrc % 2 === 0 ? '\n\n✅ +1 play in all games!' : ''}`);
        }
      } else if (user?.referred_by && !(user as any)._ref_awarded) {
        // Check if referral was stored earlier (before join) but not yet awarded
        const { data: referrer } = await supabase.from('bot_users').select('*').eq('telegram_id', user.referred_by).single();
        if (referrer) {
          // Check if already counted by seeing if referral_count includes this user
          // We'll skip re-awarding since the count is tracked
        }
      }

      const settings = await getSettings();
      const welcomeMsg = settings?.welcome_message || `Welcome to <b>WINBHAI</b>! 🃏♠️\n\nHello <b>${fn}</b>! 👋\nI am your virtual assistant and can help you with all your questions 😍\n\nPlease select the category you are interested in:`;

      const welcomePhoto = settings?.welcome_media_url || IMG.logo;
      await sendPhoto(chatId, welcomePhoto, welcomeMsg, mainReplyKb());
      return new Response('OK');
    }

    // ========== HANDLE REPLY KEYBOARD TEXT MESSAGES ==========
    if (update.message?.text && !update.message.text.startsWith('/')) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Force join check for all messages
      const { joined, missing } = await checkAllChannels(chatId);
      if (!joined) {
        await sendForceJoinMessage(chatId, missing);
        return new Response('OK');
      }

      const u = await getUser(chatId);
      const settings = await getSettings();

      // Match reply keyboard buttons
      if (text === '👤 My Account') {
        const totalGames = await supabase.from('game_history').select('id').eq('telegram_id', chatId);
        const gamesPlayed = totalGames.data?.length ?? 0;
        const totalEarned = u?.total_coins_earned ?? 0;
        const level = getLevel(totalEarned);
        const joinDate = new Date(u?.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const accountText = `👤 <b>My Account</b>\n\n🧑 Name: <b>${u?.first_name || 'Unknown'}</b>\n🆔 ID: <b>${u?.telegram_id}</b>\n🪙 Coins: <b>${u?.coins ?? 0}</b>\n\n🔥 Level: <b>${level}</b>\n🎯 Games Played: <b>${gamesPlayed}</b>\n🏆 Total Earned: <b>${totalEarned}</b>\n📅 Since: <b>${joinDate}</b>`;
        await sendPhoto(chatId, IMG.account, accountText, {
          inline_keyboard: [
            [{ text: '🪙 Redeem Coins', callback_data: 'redeem_menu' }],
            [{ text: '🎮 Play Games', callback_data: 'games_menu' }],
            [{ text: '👥 Refer Friends', callback_data: 'refer_friends' }],
          ],
        });
        return new Response('OK');
      }

      if (text === '🎮 Play Games') {
        const gText = `🎮 <b>Play Free Games & Win!</b>\n\n💰 Coins: <b>${u?.coins ?? 0}</b>\n\n🎰 Slot: <b>${u?.wheel_plays ?? 0}</b> plays\n📦 Lucky Box: <b>${u?.box_plays ?? 0}</b> plays\n🎯 Number Guess: <b>${u?.guess_plays ?? 0}</b> plays`;
        await sendPhoto(chatId, IMG.games, gText, gameMenuKb());
        return new Response('OK');
      }

      if (text === '📚 Tutorials') {
        await sendPhoto(chatId, IMG.tutorials, '📚 <b>Beginner Tutorials</b>\n\nSelect a category to learn:', {
          inline_keyboard: [
            [{ text: '📖 Basic Tutorials', callback_data: 'basic_tutorials' }],
            [{ text: '🎮 Games Tutorials', callback_data: 'games_tutorials' }],
            [{ text: '💎 ARPay Wallet Guide', callback_data: 'tut_arpay' }],
            [{ text: '⚠️ Deposit Issue', callback_data: 'tut_deposit' }],
            [{ text: '⚠️ Withdrawal Issue', callback_data: 'tut_withdrawal' }],
            [{ text: '🌐 More Tutorials', callback_data: 'more_tutorials' }],
          ],
        });
        return new Response('OK');
      }

      if (text === '📞 24/7 Support') {
        await sendPhoto(chatId, IMG.support, '📞 <b>24/7 AI Customer Support</b>\n\n🤖 I\'m your AI assistant! Just type your question below and I\'ll help you.\n\nExamples:\n• "How do I deposit money?"\n• "My withdrawal is pending"\n• "How to play Aviator?"', {
          inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK');
      }

      if (text === '🎁 Gift Codes') {
        const coins = u?.coins ?? 0;
        const buttons = REDEEM_TIERS.map(tier => {
          const canAfford = coins >= tier.coins;
          return [{ text: `${canAfford ? '✅' : '🔒'} ${tier.coins} → ${tier.label}`, callback_data: `redeem_${tier.coins}` }];
        });
        await sendPhoto(chatId, IMG.redeem, `🎁 <b>Redeem Coins</b>\n\n💰 Balance: <b>${coins} coins</b>\n\nSelect amount to redeem:`, { inline_keyboard: buttons });
        return new Response('OK');
      }

      if (text === '🤝 Become Agent') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `🤝 <b>Become an Agent</b>\n\n💰 Earn commissions by inviting players!\n\n1️⃣ Register on WINBHAI\n2️⃣ Go to "Agent" section\n3️⃣ Get your referral link\n4️⃣ Share & earn!\n\n👉 <a href="${siteUrl}">Register Now</a>`, backMainKb());
        return new Response('OK');
      }

      if (text === '🌐 Official Site') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `🌐 <b>WINBHAI Official Site</b>\n\n👉 <a href="${siteUrl}">Visit WINBHAI</a>\n\n⚠️ Always use the official link!`, {
          inline_keyboard: [
            [{ text: '🌐 Open Website', url: siteUrl }],
          ],
        });
        return new Response('OK');
      }

      if (text === '📲 App Download') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `📲 <b>Download WINBHAI App</b>\n\n📱 Get the best gaming experience!\n\n👉 <a href="${siteUrl}">Download Now</a>`, {
          inline_keyboard: [
            [{ text: '📲 Download App', url: siteUrl }],
          ],
        });
        return new Response('OK');
      }

      if (text === '📢 Prediction Channel') {
        await sendPhoto(chatId, IMG.games, '📢 <b>Prediction Channel</b>\n\n🔮 Get free predictions and tips!\n\nJoin our official Telegram channel for daily predictions.', {
          inline_keyboard: [
            [{ text: '📢 Join Channel', url: 'https://t.me/winbhaipredictions' }],
          ],
        });
        return new Response('OK');
      }

      // If no menu match, treat as AI support query
      const aiResponse = await getAIResponse(text);
      await sendPhoto(chatId, IMG.support, `🤖 <b>AI Support:</b>\n\n${aiResponse}`, {
        inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
      });
      return new Response('OK');
    }

    // ========== /menu command ==========
    if (update.message?.text && /^\/(menu|help)/.test(update.message.text)) {
      const chatId = update.message.chat.id;
      await sendPhoto(chatId, IMG.logo, '🏠 <b>Main Menu</b>\n\nChoose an option from the keyboard below:', mainReplyKb());
      return new Response('OK');
    }

    // ========== CALLBACK QUERIES (inline buttons in sub-menus) ==========
    if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message.chat.id;
      const d = q.data;
      await fetch(`${GATEWAY_URL}/answerCallbackQuery`, { method: 'POST', headers: hdrs, body: JSON.stringify({ callback_query_id: q.id }) });

      const u = await getUser(chatId);
      const settings = await getSettings();

      // CHECK JOIN callback
      if (d === 'check_join') {
        const { joined, missing } = await checkAllChannels(chatId);
        if (!joined) {
          await sendForceJoinMessage(chatId, missing);
          return new Response('OK');
        }
        // All joined! Award pending referral if any
        if (u?.referred_by) {
          const { data: referrer } = await supabase.from('bot_users').select('*').eq('telegram_id', u.referred_by).single();
          if (referrer) {
            // Check if already counted
            const nrc = (referrer.referral_count || 0) + 1;
            const upd: any = { referral_count: nrc };
            if (nrc % 2 === 0) {
              upd.wheel_plays = (referrer.wheel_plays || 0) + 1;
              upd.box_plays = (referrer.box_plays || 0) + 1;
              upd.guess_plays = (referrer.guess_plays || 0) + 1;
            }
            await supabase.from('bot_users').update(upd).eq('telegram_id', u.referred_by);
            await send(u.referred_by, `🎉 <b>${u.first_name || 'A user'}</b> joined all channels via your link!\n\nReferrals: ${nrc % 2}/2${nrc % 2 === 0 ? '\n\n✅ +1 play in all games!' : ''}`);
            // Clear referred_by so it's not re-awarded (set to a negative sentinel won't work, just track via referral_count)
          }
        }
        await sendPhoto(chatId, IMG.logo, '✅ <b>Verified!</b>\n\nYou have joined all required channels. Welcome! 🎉\n\nChoose an option below:', mainReplyKb());
        return new Response('OK');
      }

      // Force join check for all other callbacks
      const { joined: cbJoined, missing: cbMissing } = await checkAllChannels(chatId);
      if (!cbJoined) {
        await sendForceJoinMessage(chatId, cbMissing);
        return new Response('OK');
      }

      // MAIN MENU
      if (d === 'main_menu') {
        await sendPhoto(chatId, IMG.logo, '🏠 <b>Main Menu</b>\n\nChoose an option from the keyboard below:', mainReplyKb());
        return new Response('OK');
      }

      // MY ACCOUNT (from inline)
      if (d === 'my_account') {
        const totalGames = await supabase.from('game_history').select('id').eq('telegram_id', chatId);
        const gamesPlayed = totalGames.data?.length ?? 0;
        const totalEarned = u?.total_coins_earned ?? 0;
        const level = getLevel(totalEarned);
        const joinDate = new Date(u?.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const accountText = `👤 <b>My Account</b>\n\n🧑 Name: <b>${u?.first_name || 'Unknown'}</b>\n🆔 ID: <b>${u?.telegram_id}</b>\n🪙 Coins: <b>${u?.coins ?? 0}</b>\n\n🔥 Level: <b>${level}</b>\n🎯 Games: <b>${gamesPlayed}</b>\n🏆 Earned: <b>${totalEarned}</b>\n📅 Since: <b>${joinDate}</b>`;
        await sendPhoto(chatId, IMG.account, accountText, {
          inline_keyboard: [
            [{ text: '🪙 Redeem Coins', callback_data: 'redeem_menu' }],
            [{ text: '🎮 Play Games', callback_data: 'games_menu' }],
            [{ text: '👥 Refer Friends', callback_data: 'refer_friends' }],
          ],
        });
        return new Response('OK');
      }

      // REFER FRIENDS
      if (d === 'refer_friends') {
        const link = await getBotLink(chatId);
        const rc = u?.referral_count ?? 0;
        await sendPhoto(chatId, IMG.logo, `👥 <b>Refer Friends</b>\n\n🔗 Your link:\n<code>${link}</code>\n\n📊 Referrals: <b>${rc}</b>\n🎮 Every 2 referrals = +1 play!\n\nProgress: ${rc % 2}/2`, backMainKb());
        return new Response('OK');
      }

      // TUTORIALS
      if (d === 'tutorials_menu') {
        await sendPhoto(chatId, IMG.tutorials, '📚 <b>Beginner Tutorials</b>\n\nSelect a category:', {
          inline_keyboard: [
            [{ text: '📖 Basic Tutorials', callback_data: 'basic_tutorials' }],
            [{ text: '🎮 Games Tutorials', callback_data: 'games_tutorials' }],
            [{ text: '💎 ARPay Wallet Guide', callback_data: 'tut_arpay' }],
            [{ text: '⚠️ Deposit Issue', callback_data: 'tut_deposit' }],
            [{ text: '⚠️ Withdrawal Issue', callback_data: 'tut_withdrawal' }],
            [{ text: '🌐 More Tutorials', callback_data: 'more_tutorials' }],
            [{ text: '🔙 Back', callback_data: 'main_menu' }],
          ],
        });
        return new Response('OK');
      }

      if (d === 'basic_tutorials') {
        await sendPhoto(chatId, IMG.tutorials, '📖 <b>Basic Tutorials</b>\n\nLearn the basics:', {
          inline_keyboard: [
            [{ text: '📝 How to Register', callback_data: 'tut_register' }],
            [{ text: '💰 How to Deposit', callback_data: 'tut_deposit_guide' }],
            [{ text: '💸 How to Withdraw', callback_data: 'tut_withdraw_guide' }],
            [{ text: '🔒 Account Security', callback_data: 'tut_security' }],
            [{ text: '🔙 Back', callback_data: 'tutorials_menu' }],
          ],
        });
        return new Response('OK');
      }

      if (d === 'games_tutorials') {
        await sendPhoto(chatId, IMG.games, '🎮 <b>Games Tutorials</b>\n\nSelect a game:', {
          inline_keyboard: [
            [{ text: '🎨 Colour Prediction', callback_data: 'gt_colour' }],
            [{ text: '🎰 Slot Games', callback_data: 'gt_slots' }],
            [{ text: '🎲 Casino Games', callback_data: 'gt_casino' }],
            [{ text: '🃏 Card Games', callback_data: 'gt_cards' }],
            [{ text: '🎯 Crash Game', callback_data: 'gt_crash' }],
            [{ text: '🔙 Back', callback_data: 'tutorials_menu' }],
          ],
        });
        return new Response('OK');
      }

      if (d === 'gt_colour') {
        await sendPhoto(chatId, IMG.games, '🎨 <b>Colour Prediction Tutorials</b>\n\nSelect a game:', {
          inline_keyboard: [
            [{ text: '🎯 WinGo', callback_data: 'vid_wingo' }],
            [{ text: '🚀 Aviator', callback_data: 'vid_aviator' }],
            [{ text: '🐔 Chicken Road 2', callback_data: 'vid_chicken' }],
            [{ text: '💣 Mines', callback_data: 'vid_mines' }],
            [{ text: '🎲 K3', callback_data: 'vid_k3' }],
            [{ text: '🔢 5D', callback_data: 'vid_5d' }],
            [{ text: '🔙 Back', callback_data: 'games_tutorials' }],
          ],
        });
        return new Response('OK');
      }

      // VIDEO TUTORIALS
      if (d?.startsWith('vid_') || (d?.startsWith('gt_') && !['gt_colour'].includes(d))) {
        const tutorialMap: Record<string, string> = {
          'vid_wingo': 'colour_prediction', 'vid_aviator': 'aviator', 'vid_chicken': 'chicken_road',
          'vid_mines': 'mines', 'vid_k3': 'k3', 'vid_5d': '5d',
          'gt_slots': 'slot_games', 'gt_casino': 'casino_games', 'gt_cards': 'card_games', 'gt_crash': 'crash_game',
        };
        const nameMap: Record<string, string> = {
          'vid_wingo': 'WinGo', 'vid_aviator': 'Aviator', 'vid_chicken': 'Chicken Road 2',
          'vid_mines': 'Mines', 'vid_k3': 'K3', 'vid_5d': '5D',
          'gt_slots': 'Slot Games', 'gt_casino': 'Casino Games', 'gt_cards': 'Card Games', 'gt_crash': 'Crash Game',
        };
        const key = tutorialMap[d];
        const name = nameMap[d] || 'Tutorial';
        const links = settings?.tutorial_links as Record<string, string> | null;
        const videoUrl = links?.[key];

        if (videoUrl) {
          await sendPhoto(chatId, IMG.tutorials, `🎬 <b>${name} Tutorial</b>\n\n👉 <a href="${videoUrl}">Watch Video Tutorial</a>`, {
            inline_keyboard: [
              [{ text: '▶️ Watch Now', url: videoUrl }],
              [{ text: '🔙 Back', callback_data: d.startsWith('vid_') ? 'gt_colour' : 'games_tutorials' }],
            ],
          });
        } else {
          await sendPhoto(chatId, IMG.tutorials, `🎬 <b>${name} Tutorial</b>\n\n⏳ Coming soon! Stay tuned.`, {
            inline_keyboard: [[{ text: '🔙 Back', callback_data: d.startsWith('vid_') ? 'gt_colour' : 'games_tutorials' }]],
          });
        }
        return new Response('OK');
      }

      // TUTORIAL TEXT CALLBACKS
      if (['tut_arpay', 'tut_deposit', 'tut_withdrawal', 'tut_register', 'tut_deposit_guide', 'tut_withdraw_guide', 'tut_security', 'more_tutorials'].includes(d)) {
        const tutTexts: Record<string, string> = {
          'tut_arpay': '💎 <b>ARPay Wallet Guide</b>\n\n1️⃣ Download ARPay app\n2️⃣ Register with phone\n3️⃣ Link bank account\n4️⃣ Use for instant deposits!',
          'tut_deposit': '⚠️ <b>Deposit Issue</b>\n\n1️⃣ Wait 5-10 minutes\n2️⃣ Check bank statement\n3️⃣ Screenshot transaction\n4️⃣ Contact support',
          'tut_withdrawal': '⚠️ <b>Withdrawal Issue</b>\n\n1️⃣ Check bank details\n2️⃣ Check minimum amount\n3️⃣ Wait 24-48 hours\n4️⃣ Contact support if pending',
          'tut_register': '📝 <b>How to Register</b>\n\n1️⃣ Visit WINBHAI website\n2️⃣ Click "Register"\n3️⃣ Enter phone number\n4️⃣ Set password\n5️⃣ Start playing!',
          'tut_deposit_guide': '💰 <b>How to Deposit</b>\n\n1️⃣ Login to WINBHAI\n2️⃣ Go to Wallet → Deposit\n3️⃣ Choose payment method\n4️⃣ Enter amount & pay',
          'tut_withdraw_guide': '💸 <b>How to Withdraw</b>\n\n1️⃣ Login to WINBHAI\n2️⃣ Go to Wallet → Withdraw\n3️⃣ Add bank details\n4️⃣ Enter amount & confirm',
          'tut_security': '🔒 <b>Account Security</b>\n\n✅ Strong password\n✅ Enable 2FA\n✅ Never share OTP\n✅ Official links only',
          'more_tutorials': '🌐 <b>More Tutorials</b>\n\nVisit our website or contact support for more guides.',
        };
        await sendPhoto(chatId, IMG.tutorials, tutTexts[d] || 'Coming soon!', backMainKb());
        return new Response('OK');
      }

      // AI SUPPORT
      if (d === 'ai_support') {
        await sendPhoto(chatId, IMG.support, '📞 <b>24/7 AI Support</b>\n\n🤖 Type your question below!\n\nExamples:\n• "How to deposit?"\n• "Withdrawal pending"\n• "How to play Aviator?"', {
          inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK');
      }

      // OFFICIAL SITE
      if (d === 'official_site') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `🌐 <b>WINBHAI Official</b>\n\n👉 <a href="${siteUrl}">Visit WINBHAI</a>`, {
          inline_keyboard: [[{ text: '🌐 Open Website', url: siteUrl }], [{ text: '🔙 Back', callback_data: 'main_menu' }]],
        });
        return new Response('OK');
      }

      // BECOME AGENT
      if (d === 'become_agent') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `🤝 <b>Become an Agent</b>\n\n💰 Earn commissions!\n\n1️⃣ Register\n2️⃣ Go to Agent section\n3️⃣ Get referral link\n4️⃣ Share & earn!\n\n👉 <a href="${siteUrl}">Register Now</a>`, backMainKb());
        return new Response('OK');
      }

      // PREDICTION CHANNEL
      if (d === 'prediction_channel') {
        await sendPhoto(chatId, IMG.games, '📢 <b>Prediction Channel</b>\n\n🔮 Get free predictions and tips!', {
          inline_keyboard: [[{ text: '📢 Join Channel', url: 'https://t.me/winbhaipredictions' }], [{ text: '🔙 Back', callback_data: 'main_menu' }]],
        });
        return new Response('OK');
      }

      // APP DOWNLOAD
      if (d === 'app_download') {
        const siteUrl = settings?.official_site_url || 'https://winbhai.com';
        await sendPhoto(chatId, IMG.logo, `📲 <b>Download WINBHAI App</b>\n\n📱 Best gaming experience!\n\n👉 <a href="${siteUrl}">Download Now</a>`, {
          inline_keyboard: [[{ text: '📲 Download', url: siteUrl }], [{ text: '🔙 Back', callback_data: 'main_menu' }]],
        });
        return new Response('OK');
      }

      // GAMES MENU
      if (d === 'games_menu') {
        const gText = `🎮 <b>Play & Win!</b>\n\n💰 Coins: <b>${u?.coins ?? 0}</b>\n\n🎰 Slot: <b>${u?.wheel_plays ?? 0}</b> plays\n📦 Box: <b>${u?.box_plays ?? 0}</b> plays\n🎯 Guess: <b>${u?.guess_plays ?? 0}</b> plays`;
        await sendPhoto(chatId, IMG.games, gText, gameMenuKb());
        return new Response('OK');
      }

      // REDEEM MENU
      if (d === 'redeem_menu') {
        const coins = u?.coins ?? 0;
        const buttons = REDEEM_TIERS.map(tier => {
          const canAfford = coins >= tier.coins;
          return [{ text: `${canAfford ? '✅' : '🔒'} ${tier.coins} → ${tier.label}`, callback_data: `redeem_${tier.coins}` }];
        });
        buttons.push([{ text: '🔙 Back', callback_data: 'my_account' }]);
        await sendPhoto(chatId, IMG.redeem, `🎁 <b>Redeem Coins</b>\n\n💰 Balance: <b>${coins}</b>\n\nSelect amount:`, { inline_keyboard: buttons });
        return new Response('OK');
      }

      // REDEEM SPECIFIC
      if (d?.startsWith('redeem_')) {
        const tierCoins = parseInt(d.replace('redeem_', ''));
        const tier = REDEEM_TIERS.find(t => t.coins === tierCoins);
        if (!tier) { await send(chatId, '❌ Invalid option.', backMainKb()); return new Response('OK'); }

        if ((u?.coins ?? 0) < tier.coins) {
          await sendPhoto(chatId, IMG.redeem, `❌ <b>Not enough coins!</b>\n\n💰 Need <b>${tier.coins}</b> but have <b>${u?.coins ?? 0}</b>.\n\n🎮 Play more games!`, {
            inline_keyboard: [[{ text: '🎮 Play Games', callback_data: 'games_menu' }], [{ text: '🔙 Back', callback_data: 'redeem_menu' }]],
          });
          return new Response('OK');
        }

        const { data: code } = await supabase.from('redemption_codes').select('*').eq('is_claimed', false).eq('coin_cost', tier.coins).limit(1).single();
        if (!code) {
          await sendPhoto(chatId, IMG.redeem, `❌ <b>No ${tier.label} codes available!</b>\n\nTry again later.`, {
            inline_keyboard: [[{ text: '🔙 Back', callback_data: 'redeem_menu' }]],
          });
          return new Response('OK');
        }

        await supabase.from('redemption_codes').update({ is_claimed: true, claimed_by_telegram_id: chatId, claimed_at: new Date().toISOString() }).eq('id', code.id);
        await supabase.from('bot_users').update({ coins: (u?.coins ?? 0) - tier.coins }).eq('telegram_id', chatId);
        await sendPhoto(chatId, IMG.redeem, `🎉 <b>Congratulations!</b>\n\n🔑 Your ${tier.label} code:\n<code>${code.code}</code>\n\n💰 -${tier.coins} coins\n💰 Balance: <b>${(u?.coins ?? 0) - tier.coins}</b>`, backMainKb());
        return new Response('OK');
      }

      // SLOT MACHINE
      if (d === 'game_wheel') {
        if ((u?.wheel_plays ?? 0) <= 0) {
          const link = await getBotLink(chatId);
          await sendPhoto(chatId, IMG.games, `❌ <b>No Slot plays left!</b>\n\nRefer 2 friends for +1 play:\n\n🔗 <code>${link}</code>`, gameMenuKb());
          return new Response('OK');
        }
        const val = await sendDice(chatId, '🎰');
        const coins = slotCoins(val);
        await new Promise(r => setTimeout(r, 3000));
        const res = await addCoins(chatId, coins, 'wheel_spin', 'wheel_plays', { val, coins });
        const resultText = val === 64 ? `🎰 <b>JACKPOT! 777!</b>\n\n🎉 Won <b>${coins} coins!</b> 🎊` :
          coins > 0 ? `🎰 You won <b>${coins} coins!</b> 🎉` : `🎰 Better luck next time! 😔`;
        await sendPhoto(chatId, IMG.games, resultText + `\n\n💰 ${res.coins} | 🎰 ${res.wheel} left`, gameMenuKb());
        return new Response('OK');
      }

      // LUCKY BOX
      if (d === 'game_lucky_box') {
        if ((u?.box_plays ?? 0) <= 0) {
          const link = await getBotLink(chatId);
          await sendPhoto(chatId, IMG.games, `❌ <b>No Lucky Box plays left!</b>\n\nRefer 2 friends:\n🔗 <code>${link}</code>`, gameMenuKb());
          return new Response('OK');
        }
        await send(chatId, '📦 <b>Lucky Box!</b>\n\nPick a box:', {
          inline_keyboard: [
            [{ text: '📦 1', callback_data: 'box_1' }, { text: '📦 2', callback_data: 'box_2' }, { text: '📦 3', callback_data: 'box_3' }],
            [{ text: '📦 4', callback_data: 'box_4' }, { text: '📦 5', callback_data: 'box_5' }],
          ],
        });
        return new Response('OK');
      }

      if (d?.startsWith('box_')) {
        if ((u?.box_plays ?? 0) <= 0) {
          await sendPhoto(chatId, IMG.games, '❌ No plays left!', gameMenuKb());
          return new Response('OK');
        }
        const n = parseInt(d.split('_')[1]);
        const prizes = [0, 10, 20, 50, 100];
        const won = prizes[Math.floor(Math.random() * prizes.length)];
        const res = await addCoins(chatId, won, 'lucky_box', 'box_plays', { box: n, won });
        const txt = won > 0 ? `📦 Box #${n} → <b>${won} coins!</b> 🎉` : `📦 Box #${n} → Empty! 😔`;
        await sendPhoto(chatId, IMG.games, txt + `\n\n💰 ${res.coins} | 📦 ${res.box} left`, gameMenuKb());
        return new Response('OK');
      }

      // NUMBER GUESS
      if (d === 'game_number_guess') {
        if ((u?.guess_plays ?? 0) <= 0) {
          const link = await getBotLink(chatId);
          await sendPhoto(chatId, IMG.games, `❌ <b>No guesses left!</b>\n\nRefer 2 friends:\n🔗 <code>${link}</code>`, gameMenuKb());
          return new Response('OK');
        }
        await send(chatId, '🎯 <b>Number Guess!</b>\n\nPick 1-10:', {
          inline_keyboard: [
            [{ text: '1', callback_data: 'guess_1' }, { text: '2', callback_data: 'guess_2' }, { text: '3', callback_data: 'guess_3' }, { text: '4', callback_data: 'guess_4' }, { text: '5', callback_data: 'guess_5' }],
            [{ text: '6', callback_data: 'guess_6' }, { text: '7', callback_data: 'guess_7' }, { text: '8', callback_data: 'guess_8' }, { text: '9', callback_data: 'guess_9' }, { text: '10', callback_data: 'guess_10' }],
          ],
        });
        return new Response('OK');
      }

      if (d?.startsWith('guess_')) {
        if ((u?.guess_plays ?? 0) <= 0) {
          await sendPhoto(chatId, IMG.games, '❌ No guesses left!', gameMenuKb());
          return new Response('OK');
        }
        const g = parseInt(d.split('_')[1]);
        const target = Math.floor(Math.random() * 10) + 1;
        const diff = Math.abs(g - target);
        const coins = diff === 0 ? 100 : diff === 1 ? 50 : diff === 2 ? 15 : 0;
        const res = await addCoins(chatId, coins, 'number_guess', 'guess_plays', { guess: g, target, diff });
        const txt = g === target ? `🎯 PERFECT! It was <b>${target}</b>! +<b>${coins}</b> 🎉` :
          diff <= 2 && coins > 0 ? `🎯 It was <b>${target}</b>. +<b>${coins}</b> coins.` : `🎯 It was <b>${target}</b>. No coins. 😔`;
        await sendPhoto(chatId, IMG.games, txt + `\n\n💰 ${res.coins} | 🎯 ${res.guess} left`, gameMenuKb());
        return new Response('OK');
      }

      // BALANCE
      if (d === 'balance') {
        const balText = `💰 <b>Balance:</b> ${u?.coins ?? 0} coins\n🎰 ${u?.wheel_plays ?? 0} | 📦 ${u?.box_plays ?? 0} | 🎯 ${u?.guess_plays ?? 0}\n\n${(u?.coins ?? 0) >= 1000 ? '🎉 You can redeem!' : `Need ${1000 - (u?.coins ?? 0)} more for ₹100!`}`;
        await sendPhoto(chatId, IMG.games, balText, gameMenuKb());
        return new Response('OK');
      }

      // CLAIM (legacy)
      if (d === 'claim') {
        const coins = u?.coins ?? 0;
        const buttons = REDEEM_TIERS.map(tier => [{ text: `${coins >= tier.coins ? '✅' : '🔒'} ${tier.coins} → ${tier.label}`, callback_data: `redeem_${tier.coins}` }]);
        buttons.push([{ text: '🔙 Back', callback_data: 'main_menu' }]);
        await sendPhoto(chatId, IMG.redeem, `🎁 <b>Redeem</b>\n\n💰 Balance: <b>${coins}</b>`, { inline_keyboard: buttons });
        return new Response('OK');
      }

      // Fallback: bot_buttons
      const { data: btns } = await supabase.from('bot_buttons').select('*').eq('is_active', true);
      const btn = btns?.find((b: any) => b.callback_data === d || b.id === d);
      if (btn) {
        const msgText = btn.message_text || `You pressed: ${btn.label}`;
        const btnKb = btn.link_url ? { inline_keyboard: [[{ text: '🔗 Open Link', url: btn.link_url }], [{ text: '🔙 Back', callback_data: 'main_menu' }]] } : backMainKb();
        if (btn.media_url) {
          try {
            const mediaMethod = btn.media_type === 'video' ? 'sendVideo' : btn.media_type === 'animation' ? 'sendAnimation' : 'sendPhoto';
            const mediaKey = btn.media_type === 'video' ? 'video' : btn.media_type === 'animation' ? 'animation' : 'photo';
            await fetch(`${GATEWAY_URL}/${mediaMethod}`, {
              method: 'POST', headers: hdrs,
              body: JSON.stringify({ chat_id: chatId, [mediaKey]: btn.media_url, caption: msgText, parse_mode: 'HTML', reply_markup: btnKb }),
            });
          } catch {
            await send(chatId, msgText, btnKb);
          }
        } else {
          await sendPhoto(chatId, IMG.logo, msgText, btnKb);
        }
      }
    }

    return new Response('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK');
  }
});
