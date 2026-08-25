import http from 'http';
import https from 'https';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import {
  askGemini,
  transcribeAudio,
  analyzeImage,
  summarizeConversation,
} from './gemini.js';
import {
  generateAiImage,
  downloadInstagramReel,
  downloadYouTube,
} from './utils/mediaDownloader.js';
import { lookupPhoneNumber } from './utils/numberLookup.js';
import { getCryptoPrices } from './utils/cryptoRates.js';
import { reminderManager } from './utils/reminderManager.js';

console.log(`
================================================================================
  _____  _____  _____ _    _          ____  _    _            _____ 
 |  __ \\|_   _|/ ____| |  | |   /\\   |  _ \\| |  | |     /\\   |_   _|
 | |__) | | | | (___ | |__| |  /  \\  | |_) | |__| |    /  \\    | |  
 |  _  /  | |  \\___ \\|  __  | / /\\ \\ |  _ <|  __  |   / /\\ \\   | |  
 | | \\ \\ _| |_ ____) | |  | |/ ____ \\| |_) | |  | |  / ____ \\ _| |_ 
 |_|  \\_\\_____|_____/|_|  |_/_/    \\_\\____/|_|  |_| /_/    \\_\\_____|
================================================================================
  🤖 ${config.botName} - Ultra-Premium Real WhatsApp UserBot
  👑 Creator & Owner:     ${config.ownerName}
  🏢 Organization:        ${config.businessName}
  🧠 AI Brain:            ${config.geminiModel}
================================================================================
`);

// State
let latestQr = null;
let isConnected = false;
let autoReplyEnabled = config.autoReplyDefault;
let antiViewOnceEnabled = true;
let currentAiMode = 'default';
const chatHistoryMap = new Map();
const autoRepliedUsers = new Set();

// Built-in Web QR Code Server
const PORT = process.env.PORT || 8000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (isConnected) {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${config.botName} - Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { background: #0f172a; color: white; font-family: sans-serif; text-align: center; padding: 40px 20px; }
          .card { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 35px 25px; border: 1px solid #334155; }
          .badge { background: #22c55e20; color: #4ade80; border: 1px solid #22c55e40; padding: 6px 16px; border-radius: 999px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🤖 ${config.botName} (Pro)</h1>
          <p class="badge">● 24/7 ACTIVE & CONNECTED</p>
          <p style="color: #94a3b8; margin-top: 20px;">Created & Owned by <b>${config.ownerName}</b></p>
        </div>
      </body>
      </html>
    `);
  } else if (latestQr) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQr)}`;
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scan QR - ${config.botName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="15">
        <style>
          body { background: #0b141a; color: white; font-family: sans-serif; text-align: center; padding: 30px 15px; }
          .card { max-width: 420px; margin: 0 auto; background: #111b21; border-radius: 24px; padding: 25px; border: 1px solid #222e35; }
          .qr-box { background: white; padding: 15px; border-radius: 16px; display: inline-block; margin: 20px 0; }
          .steps { text-align: left; background: #202c33; padding: 15px 20px; border-radius: 14px; font-size: 13px; color: #d1d7db; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin: 0; color: #25d366;">📲 Link ${config.botName}</h2>
          <p style="color: #8696a0; font-size: 13px; margin: 5px 0 15px;">Scan this QR code from WhatsApp on your phone</p>
          <div class="qr-box">
            <img src="${qrImageUrl}" alt="WhatsApp QR Code" width="260" height="260" style="display:block;" />
          </div>
          <div class="steps">
            <b>How to scan:</b><br/>
            1. Open WhatsApp on your phone<br/>
            2. Tap <b>Settings / 3-Dots > Linked Devices</b><br/>
            3. Tap <b>Link a Device</b> and point at this QR
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><meta http-equiv="refresh" content="3"></head>
      <body style="background:#0f172a;color:white;font-family:sans-serif;text-align:center;padding:50px;">
        <h2>⏳ Starting WhatsApp engine...</h2>
        <p style="color:#94a3b8;">Generating QR code, please wait 5 seconds...</p>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, () => {
  console.log(`[*] Web QR Viewer running on port ${PORT}`);
});

// Detect Google Chrome on Linux / Docker
const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'linux' ? '/usr/bin/google-chrome-stable' : undefined);

// Helper for TTS Voice Notes
function getTtsBuffer(text, lang = 'hi') {
  return new Promise((resolve) => {
    const clean = encodeURIComponent(text.slice(0, 200));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${clean}&tl=${lang}&client=tw-ob`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

// WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './wwebjs_auth',
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js',
  },
  puppeteer: {
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-default-apps',
      '--mute-audio',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--js-flags=--max-old-space-size=256',
    ],
  },
});

// Events
client.on('qr', (qr) => {
  latestQr = qr;
  console.log('\n📲 [QR CODE GENERATED] Terminal QR:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  isConnected = true;
  latestQr = null;
  console.log(`\n🎉 [SUCCESS] Rishabh AI is now LIVE on your WhatsApp account!`);
  console.log(`👑 Owner: ${config.ownerName}`);
  console.log(`💡 Type .menu in any chat or group to see your AI superpowers!\n`);
});

client.on('auth_failure', (msg) => {
  console.error('[-] Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
  isConnected = false;
  console.log('[!] Client was disconnected:', reason);
});

// Helper to safely send reply
async function sendSafeReply(msg, chatId, text, options = {}) {
  try {
    return await msg.reply(text);
  } catch (err) {
    try {
      return await client.sendMessage(chatId, text, options);
    } catch (e) {
      console.error('Failed to send reply:', e);
    }
  }
}

// Event: Message Listener
client.on('message_create', async (msg) => {
  try {
    const chatId = msg.to && msg.fromMe ? msg.to : msg.from;
    if (!chatId || chatId.includes('status@broadcast')) return;

    const isGroup = chatId.endsWith('@g.us');
    const body = msg.body ? msg.body.trim() : '';
    const isFromMe = msg.fromMe;
    const sender = isFromMe ? config.ownerName : (msg.author || msg.from).replace(/@.+/, '');

    // =========================================================================
    // 👁️ 100% RELIABLE ANTI-VIEW ONCE AUTO CAPTURE
    // =========================================================================
    const isViewOnce = msg.isViewOnce || 
                       msg._data?.isViewOnce || 
                       msg._data?.viewOnce ||
                       msg._data?.isViewOnceMedia || 
                       msg._data?.isViewOnceV2 || 
                       msg._data?.viewMode === 'VIEW_ONCE' ||
                       msg.type === 'view_once' ||
                       msg.type === 'ephemeral';

    if (antiViewOnceEnabled && isViewOnce) {
      try {
        console.log(`\n👁️ [ANTI-VIEW ONCE DETECTED] Incoming ViewOnce message from: ${sender}`);
        if (msg._data) {
          msg._data.isViewOnce = false;
          msg._data.viewOnce = false;
        }
        msg.isViewOnce = false;

        const media = await msg.downloadMedia();
        if (media) {
          console.log(`✅ Successfully captured View-Once media (${media.mimetype})! Revealing in chat...`);
          await client.sendMessage(chatId, media, {
            caption: `👁️ *[ANTI-VIEW ONCE AUTO CAPTURE]*\nCaptured secret View-Once media from: @${sender}\n\n👑 _Protected by ${config.botName}_`,
            mentions: msg.author || msg.from ? [msg.author || msg.from] : [],
          });
        } else {
          console.log('⚠️ Could not download view-once media buffer.');
        }
      } catch (voErr) {
        console.error('Anti-ViewOnce auto-capture error:', voErr);
      }
    }

    // Chat History Buffer
    if (body) {
      if (!chatHistoryMap.has(chatId)) {
        chatHistoryMap.set(chatId, []);
      }
      const history = chatHistoryMap.get(chatId);
      history.push({
        sender: sender,
        text: body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      if (history.length > 25) history.shift();
    }

    // Command Parser
    const isCmd = config.prefixes.some((p) => body.startsWith(p));
    const prefix = isCmd ? body[0] : '';
    const command = isCmd ? body.slice(1).trim().split(/ +/)[0].toLowerCase() : '';
    const args = isCmd ? body.slice(1).trim().split(/ +/).slice(1) : [];
    const query = args.join(' ');

    if (isCmd) {
      console.log(`[*] Command: ${prefix}${command} in ${chatId} from ${sender}`);

      switch (command) {
        // Luxury Menu
        case 'menu':
        case 'help': {
          const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
  👑 *${config.botName.toUpperCase()} - GOD SUITE* 👑
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
_Owner & Creator: ${config.ownerName}_
_AI Mode: [${currentAiMode.toUpperCase()}]_ ⚡

🕵️‍♂️ *INTELLIGENCE & LOOKUP*
 ├ • \`${prefix}true <number>\` : Truecaller Number & Telecom Intel
 ├ • \`${prefix}say <text>\` : AI Voice Note Generator (Speaker)
 ├ • \`${prefix}crypto\` : Live Bitcoin, ETH & Solana Rates
 └ • \`${prefix}vo\` : (Reply) Decrypt View-Once Photo/Video

🧠 *AI BRAIN & CREATIVE*
 ├ • \`${prefix}ai <query>\` : Gemini 3.6 Flash Engine
 ├ • \`${prefix}imagine <prompt>\` : Flux AI Photo Generator
 ├ • \`${prefix}mode <type>\` : Set Mode (business/savage/coder)
 ├ • \`${prefix}summary\` : Chat / Group AI Recap (TL;DR)
 └ • \`${prefix}transcribe\` : Voice Note to Text Converter

📥 *MEDIA & SOCIAL DOWNLOADER*
 ├ • \`${prefix}insta <url>\` : Instagram Reels & Videos
 ├ • \`${prefix}ytmp3 <url>\` : YouTube High-Quality Audio
 ├ • \`${prefix}ytmp4 <url>\` : YouTube Video Downloader
 └ • \`${prefix}sticker\` : Instant Photo-to-Sticker Maker

👑 *OWNER PREMIUM CONTROLS*
 ├ • \`${prefix}autoreply on/off\` : Smart Away Assistant (1-Time)
 ├ • \`${prefix}antiviewonce on/off\` : View-Once Auto Capture
 ├ • \`${prefix}reminder <time> <task>\` : Auto WhatsApp Reminder
 ├ • \`${prefix}tagall <msg>\` : (Group) Stylish Member Tagging
 └ • \`${prefix}ping\` : Check Ultra-Low Latency

──────────────────────────
🚀 _Exclusive AI Ecosystem by ${config.ownerName}_
`;
          await sendSafeReply(msg, chatId, menuText);
          break;
        }

        // --- 1. ON-DEMAND VIEW ONCE DECRYPTOR (.vo / .antiview) ---
        case 'vo':
        case 'antiview':
        case 'readvo': {
          let targetMsg = msg;
          if (msg.hasQuotedMsg) {
            targetMsg = await msg.getQuotedMessage();
          }

          if (targetMsg._data) {
            targetMsg._data.isViewOnce = false;
            targetMsg._data.viewOnce = false;
          }
          targetMsg.isViewOnce = false;

          await sendSafeReply(msg, chatId, '👁️ *Decrypting View-Once media...* ⏳');
          try {
            const media = await targetMsg.downloadMedia();
            if (media) {
              await client.sendMessage(chatId, media, {
                caption: `👁️ *[VIEW-ONCE REVEALED]*\nUnlocked secret View-Once media!\n\n👑 _Decrypted by ${config.botName}_`,
              });
            } else {
              await sendSafeReply(msg, chatId, '⚠️ Media download nahi ho saki. Kripya ensure karein photo chat me maujood ho.');
            }
          } catch (err) {
            await sendSafeReply(msg, chatId, `⚠️ Error decrypting: ${err.message}`);
          }
          break;
        }

        // --- 2. TRUECALLER / NUMBER LOOKUP ---
        case 'true':
        case 'lookup':
        case 'num': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🕵️‍♂️ *Usage:* \`${prefix}true <phone_number>\`\nExample: \`${prefix}true 9876543210\``);
            break;
          }

          await sendSafeReply(msg, chatId, `🔍 *Searching telecom & Truecaller database...* ⏳`);
          const info = await lookupPhoneNumber(query);

          if (info) {
            const report = `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
  🕵️‍♂️ *TRUECALLER INTEL REPORT*
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
📞 *Phone:* \`${info.number}\`
🌍 *Country:* ${info.country}
📡 *Carrier / Operator:* *${info.carrier}*
📍 *Telecom Circle:* *${info.region}*
📱 *Line Type:* ${info.lineType}
🛡️ *Spam Status:* ${info.spamStatus}
──────────────────────────
👑 _Intel by ${config.botName}_
`;
            await sendSafeReply(msg, chatId, report);
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Phone number information fetch nahi ho saki.`);
          }
          break;
        }

        // --- 3. AI VOICE NOTE MAKER (TTS) ---
        case 'say':
        case 'speak':
        case 'voice': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🎙️ *Usage:* \`${prefix}say <message>\`\nExample: \`${prefix}say Hello Rishabh bhai, aapka bot ready hai\``);
            break;
          }

          const audioBuf = await getTtsBuffer(query);
          if (audioBuf) {
            const base64Data = audioBuf.toString('base64');
            const media = new MessageMedia('audio/mp3', base64Data, 'voice.mp3');
            await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
          } else {
            await sendSafeReply(msg, chatId, '⚠️ Voice generate karne me dikkat aayi.');
          }
          break;
        }

        // --- 4. LIVE CRYPTO RATES ---
        case 'crypto':
        case 'btc': {
          await sendSafeReply(msg, chatId, `📈 *Fetching live market rates...* ⏳`);
          const prices = await getCryptoPrices();
          if (prices) {
            const text = `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
  📈 *LIVE CRYPTO MARKET*
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
🪙 *Bitcoin (BTC):*
 ├ USD: $${prices.btc.usd?.toLocaleString()}
 ├ INR: ₹${prices.btc.inr?.toLocaleString()}
 └ 24h Change: ${prices.btc.change}%

💎 *Ethereum (ETH):*
 ├ USD: $${prices.eth.usd?.toLocaleString()}
 └ INR: ₹${prices.eth.inr?.toLocaleString()}

⚡ *Solana (SOL):*
 ├ USD: $${prices.sol.usd?.toLocaleString()}
 └ INR: ₹${prices.sol.inr?.toLocaleString()}

🐶 *Dogecoin (DOGE):*
 └ USD: $${prices.doge.usd} (₹${prices.doge.inr})
──────────────────────────
👑 _Tracked by ${config.botName}_
`;
            await sendSafeReply(msg, chatId, text);
          } else {
            await sendSafeReply(msg, chatId, '⚠️ Market rates fetch nahi ho sake.');
          }
          break;
        }

        // --- 5. AI PERSONALITY MODE SWITCHER ---
        case 'mode': {
          const selected = args[0]?.toLowerCase();
          if (['business', 'savage', 'coder', 'default'].includes(selected)) {
            currentAiMode = selected;
            await sendSafeReply(msg, chatId, `🎭 *AI Mode changed to: [${selected.toUpperCase()}]*\nAb bot is personality ke sath reply karega! 🔥`);
          } else {
            await sendSafeReply(msg, chatId, `Current Mode: *[${currentAiMode.toUpperCase()}]*\n\nAvailable Modes:\n• \`${prefix}mode default\` (Normal)\n• \`${prefix}mode business\` (Client dealing)\n• \`${prefix}mode savage\` (Roasting & Fun)\n• \`${prefix}mode coder\` (Programming expert)`);
          }
          break;
        }

        // --- 6. AI Image Generator ---
        case 'imagine':
        case 'draw':
        case 'flux': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🎨 *Usage:* \`${prefix}imagine <prompt>\`\nExample: \`${prefix}imagine Cyberpunk warrior in neon rain, 8k\``);
            break;
          }

          await sendSafeReply(msg, chatId, `🎨 *Generating your AI image with Flux AI...*\n_Prompt:_ "${query}" ⏳`);
          const imgBuffer = await generateAiImage(query);

          if (imgBuffer) {
            const base64Data = imgBuffer.toString('base64');
            const media = new MessageMedia('image/jpeg', base64Data, 'ai_generated.jpg');
            await client.sendMessage(chatId, media, {
              caption: `✨ *AI IMAGE GENERATION*\n📝 *Prompt:* ${query}\n\n👑 _Generated by ${config.botName}_`,
            });
          } else {
            await sendSafeReply(msg, chatId, '⚠️ Image generate karne me dikkat aayi. Kripya dobara try karein.');
          }
          break;
        }

        // --- 7. Instagram Reels Downloader ---
        case 'insta':
        case 'ig':
        case 'reel': {
          if (!query || !query.includes('instagram.com')) {
            await sendSafeReply(msg, chatId, `📥 *Usage:* \`${prefix}insta <instagram_reel_url>\``);
            break;
          }

          await sendSafeReply(msg, chatId, `📥 *Fetching & downloading Instagram Reel...* ⏳`);
          const dlResult = await downloadInstagramReel(query);

          if (dlResult && dlResult.buffer) {
            const base64Data = dlResult.buffer.toString('base64');
            const media = new MessageMedia('video/mp4', base64Data, 'instagram_reel.mp4');
            await client.sendMessage(chatId, media, {
              caption: `🎥 *INSTAGRAM REEL DOWNLOADED*\n\n👑 _Downloaded by ${config.botName}_`,
            });
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Reel download nahi ho saki. Kripya check karein ki reel public ho.`);
          }
          break;
        }

        // --- 8. YouTube MP3 / MP4 ---
        case 'ytmp3':
        case 'play': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🎵 *Usage:* \`${prefix}ytmp3 <youtube_link>\``);
            break;
          }

          await sendSafeReply(msg, chatId, `🎵 *Downloading YouTube Audio (MP3)...* ⏳`);
          const ytResult = await downloadYouTube(query, 'mp3');

          if (ytResult && ytResult.buffer) {
            const base64Data = ytResult.buffer.toString('base64');
            const media = new MessageMedia('audio/mp3', base64Data, `${ytResult.title}.mp3`);
            await client.sendMessage(chatId, media, {
              caption: `🎶 *${ytResult.title}*\n👑 _Downloaded by ${config.botName}_`,
            });
          } else {
            await sendSafeReply(msg, chatId, `⚠️ YouTube audio download failed. Kripya valid YouTube link daalein.`);
          }
          break;
        }

        case 'ytmp4':
        case 'yt': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🎬 *Usage:* \`${prefix}ytmp4 <youtube_link>\``);
            break;
          }

          await sendSafeReply(msg, chatId, `🎬 *Downloading YouTube Video...* ⏳`);
          const ytResult = await downloadYouTube(query, 'mp4');

          if (ytResult && ytResult.buffer) {
            const base64Data = ytResult.buffer.toString('base64');
            const media = new MessageMedia('video/mp4', base64Data, `${ytResult.title}.mp4`);
            await client.sendMessage(chatId, media, {
              caption: `🎥 *${ytResult.title}*\n👑 _Downloaded by ${config.botName}_`,
            });
          } else {
            await sendSafeReply(msg, chatId, `⚠️ YouTube video download failed.`);
          }
          break;
        }

        // --- 9. Gemini AI ---
        case 'ai':
        case 'ask': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🧠 *Usage:* \`${prefix}ai <query>\``);
            break;
          }

          const aiReply = await askGemini(query, sender, currentAiMode);
          await sendSafeReply(msg, chatId, aiReply);
          break;
        }

        // --- 10. Summarizer ---
        case 'summary':
        case 'tldr': {
          const hist = chatHistoryMap.get(chatId) || [];
          if (hist.length < 3) {
            await sendSafeReply(msg, chatId, `⚠️ Summary banane ke liye kam se kam 3-4 messages hone chahiye.`);
            break;
          }

          const formattedHist = hist.map((h) => `[${h.time}] ${h.sender}: ${h.text}`).join('\n');
          const summary = await summarizeConversation(formattedHist);
          await sendSafeReply(msg, chatId, `📝 *CONVERSATION SUMMARY (TL;DR)*\n\n${summary}`);
          break;
        }

        // --- 11. Voice Transcription ---
        case 'transcribe': {
          let targetMsg = msg;
          if (msg.hasQuotedMsg) {
            targetMsg = await msg.getQuotedMessage();
          }

          if (targetMsg.hasMedia && (targetMsg.type === 'audio' || targetMsg.type === 'ptt' || targetMsg.type === 'voice')) {
            await sendSafeReply(msg, chatId, '🎙️ *Listening & transcribing voice note...*');
            const media = await targetMsg.downloadMedia();
            if (media) {
              const buffer = Buffer.from(media.data, 'base64');
              const textResult = await transcribeAudio(buffer, media.mimetype);
              await sendSafeReply(msg, chatId, `🎙️ *TRANSCRIPTION RESULT:*\n\n${textResult}`);
            } else {
              await sendSafeReply(msg, chatId, '⚠️ Failed to download voice note.');
            }
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Kripya kisi *Voice Note / Audio* par reply karke \`${prefix}transcribe\` likhein.`);
          }
          break;
        }

        // --- 12. Sticker Maker ---
        case 'sticker':
        case 's': {
          let targetMsg = msg;
          if (msg.hasQuotedMsg) {
            targetMsg = await msg.getQuotedMessage();
          }

          if (targetMsg.hasMedia && (targetMsg.type === 'image' || targetMsg.type === 'video')) {
            const media = await targetMsg.downloadMedia();
            if (media) {
              await client.sendMessage(chatId, media, {
                sendMediaAsSticker: true,
                stickerAuthor: config.ownerName,
                stickerName: config.botName,
              });
            } else {
              await sendSafeReply(msg, chatId, '⚠️ Failed to convert media to sticker.');
            }
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Kripya kisi *Photo / GIF* par reply karke \`${prefix}sticker\` likhein.`);
          }
          break;
        }

        // --- 13. Auto-reply ---
        case 'autoreply': {
          if (args[0] === 'on') {
            autoReplyEnabled = true;
            autoRepliedUsers.clear();
            await sendSafeReply(msg, chatId, `✅ *Smart AI Assistant Away-Mode is now ON!*\nBot will reply *only once per person* while you are offline.`);
          } else if (args[0] === 'off') {
            autoReplyEnabled = false;
            autoRepliedUsers.clear();
            await sendSafeReply(msg, chatId, `❌ *Smart AI Auto-Reply is now OFF.*`);
          } else {
            await sendSafeReply(msg, chatId, `Status: *${autoReplyEnabled ? 'ON' : 'OFF'}*\nUsage: \`${prefix}autoreply on/off\``);
          }
          break;
        }

        // --- 14. Anti-ViewOnce ---
        case 'antiviewonce': {
          if (args[0] === 'on') {
            antiViewOnceEnabled = true;
            await sendSafeReply(msg, chatId, `👁️ *Anti-ViewOnce Protection is now ENABLED!*`);
          } else if (args[0] === 'off') {
            antiViewOnceEnabled = false;
            await sendSafeReply(msg, chatId, `❌ *Anti-ViewOnce Protection is DISABLED.*`);
          } else {
            await sendSafeReply(msg, chatId, `Anti-ViewOnce Status: *${antiViewOnceEnabled ? 'ON' : 'OFF'}*\nUsage: \`${prefix}antiviewonce on/off\``);
          }
          break;
        }

        // --- 15. Reminders ---
        case 'reminder':
        case 'remind': {
          const durationStr = args[0];
          const taskText = args.slice(1).join(' ');

          if (!durationStr || !taskText) {
            await sendSafeReply(msg, chatId, `⚠️ *Usage:* \`${prefix}reminder <duration> <task>\``);
            break;
          }

          const scheduledTime = reminderManager.schedule(
            { sendMessage: (jid, payload) => client.sendMessage(chatId, payload.text) },
            chatId,
            durationStr,
            taskText
          );

          if (scheduledTime) {
            await sendSafeReply(msg, chatId, `⏰ *Reminder set successfully!*\n\n📝 *Task:* ${taskText}\n⏳ *Trigger in:* ${durationStr} (${scheduledTime.toLocaleTimeString()})`);
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Invalid duration format. Use: 10s, 15m, 1h, 1d`);
          }
          break;
        }

        // --- 16. TagAll ---
        case 'tagall': {
          if (!isGroup) {
            await sendSafeReply(msg, chatId, `⚠️ Ye command sirf Groups me kaam karta hai.`);
            break;
          }

          try {
            const chatObj = await client.getChatById(chatId);
            let tagMsg = `📢 *GROUP ANNOUNCEMENT*\n`;
            if (query) tagMsg += `💬 *Message:* ${query}\n\n`;
            tagMsg += `👥 *Members:* \n`;

            const mentions = [];
            for (const participant of chatObj.participants) {
              const contact = await client.getContactById(participant.id._serialized);
              mentions.push(contact);
              tagMsg += `• @${participant.id.user}\n`;
            }

            await client.sendMessage(chatId, tagMsg, { mentions });
          } catch (e) {
            await sendSafeReply(msg, chatId, `⚠️ Failed to fetch group members.`);
          }
          break;
        }

        // --- 17. Ping ---
        case 'ping': {
          const start = Date.now();
          await sendSafeReply(
            msg,
            chatId,
            `🏓 *Pong!*\n⚡ *Latency:* ${Date.now() - start}ms\n🤖 *Bot:* ${config.botName}\n👑 *Owner:* ${config.ownerName}`
          );
          break;
        }

        default:
          break;
      }
    }

    // 1-Time Auto-Reply Away Message
    else if (autoReplyEnabled && !isGroup && !isFromMe && body) {
      if (!autoRepliedUsers.has(chatId)) {
        autoRepliedUsers.add(chatId);
        const awayMessage = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
  ⚡ *${config.botName.toUpperCase()} ASSISTANT* ⚡
╰━━━━━━━━━━━━━━━━━━━━━━╯
👋 *Namaste!*

Main *${config.ownerName}* ka personal AI assistant hoon. Abhi ${config.ownerName} *offline / busy* hain.

⏳ *Kripya thoda intezar karein,* wo aapse jald hi reply karenge!

💡 _Agar koi urgent query hai, to aap yahan message chhod sakte hain ya mujhse baat karne ke liye_ \`.ai <aapka sawal>\` _likhein!_
────────────────────────
👑 _${config.businessName}_
`;
        await sendSafeReply(msg, chatId, awayMessage);
      }
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

// Start Client
console.log('[*] Initializing WhatsApp Web engine...');
client.initialize();
