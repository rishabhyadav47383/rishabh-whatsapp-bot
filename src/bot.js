import http from 'http';
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
const chatHistoryMap = new Map();

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
          body { background: #0f172a; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px 20px; }
          .card { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 35px 25px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
          .badge { background: #22c55e20; color: #4ade80; border: 1px solid #22c55e40; padding: 6px 16px; border-radius: 999px; font-weight: bold; display: inline-block; font-size: 13px; letter-spacing: 0.5px; }
          h1 { margin: 15px 0 10px; font-size: 26px; }
          .features { text-align: left; background: #0f172a; border-radius: 16px; padding: 15px 20px; margin-top: 25px; font-size: 13px; color: #94a3b8; line-height: 1.8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🤖 ${config.botName} (Pro)</h1>
          <p class="badge">● 24/7 ACTIVE & CONNECTED</p>
          <div class="features">
            ✨ <b>Active Superpowers:</b><br/>
            • 🧠 Google Gemini 3.6 Flash AI Chat<br/>
            • 🎨 AI Image Generator (.imagine)<br/>
            • 📥 Instagram Reels & YouTube Downloader<br/>
            • 👁️ Anti-ViewOnce Auto Media Capture<br/>
            • 🎙️ Audio Voice Notes Transcriber<br/>
            • 👑 Developed & Owned by <b>${config.ownerName}</b>
          </div>
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
          .card { max-width: 420px; margin: 0 auto; background: #111b21; border-radius: 24px; padding: 25px; border: 1px solid #222e35; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
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

// Initialize WhatsApp Web Client with Anti-Crash
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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

// Event 1: QR Code Generation
client.on('qr', (qr) => {
  latestQr = qr;
  console.log('\n📲 [QR CODE GENERATED] Terminal QR:');
  qrcode.generate(qr, { small: true });
});

// Event 2: Authenticated & Ready
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

// Event: Message Listener (Incoming & Self-Sent)
client.on('message_create', async (msg) => {
  try {
    const chatId = msg.to && msg.fromMe ? msg.to : msg.from;
    if (!chatId || chatId.includes('status@broadcast')) return;

    const isGroup = chatId.endsWith('@g.us');
    const body = msg.body ? msg.body.trim() : '';
    const isFromMe = msg.fromMe;
    const sender = isFromMe ? config.ownerName : (msg.author || msg.from).replace(/@.+/, '');

    // =========================================================================
    // 👁️ ANTI-VIEW ONCE PROTECTION (Reveals and preserves View-Once Media)
    // =========================================================================
    const isViewOnce = msg.isViewOnce || msg._data?.isViewOnce || msg.type === 'view_once';
    if (antiViewOnceEnabled && isViewOnce && msg.hasMedia && !isFromMe) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          console.log(`[!] Captured ViewOnce media from: ${sender}`);
          await client.sendMessage(chatId, media, {
            caption: `👁️ *[ANTI-VIEW ONCE CAPTURE]*\nCaptured secret View-Once media from: @${sender}\n\n👑 _Protected by ${config.botName}_`,
            mentions: [msg.author || msg.from],
          });
        }
      } catch (voErr) {
        console.error('Anti-ViewOnce error:', voErr);
      }
    }

    // Track chat history for .summary
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

    // Command Check
    const isCmd = config.prefixes.some((p) => body.startsWith(p));
    const prefix = isCmd ? body[0] : '';
    const command = isCmd ? body.slice(1).trim().split(/ +/)[0].toLowerCase() : '';
    const args = isCmd ? body.slice(1).trim().split(/ +/).slice(1) : [];
    const query = args.join(' ');

    // =========================================================================
    // 👑 COMMAND DISPATCHER (PREMIUM & EXCLUSIVE SUITE)
    // =========================================================================
    if (isCmd) {
      console.log(`[*] Command: ${prefix}${command} in ${chatId} from ${sender}`);

      switch (command) {
        // --- 1. LUXURY .menu COMMAND ---
        case 'menu':
        case 'help': {
          const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
  👑 *${config.botName.toUpperCase()} - PRO SUITE* 👑
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
_Owner & Developer: ${config.ownerName}_
_Status: 24/7 Cloud Active_ ⚡

🧠 *AI BRAIN & INTELLIGENCE*
 ├ • \`${prefix}ai <query>\` : Gemini 3.6 AI Engine
 ├ • \`${prefix}imagine <prompt>\` : DALL-E / Flux AI Art Maker
 ├ • \`${prefix}summary\` : Chat / Group AI Recap (TL;DR)
 └ • \`${prefix}transcribe\` : Voice Note to Text Converter

📥 *MEDIA & SOCIAL DOWNLOADER*
 ├ • \`${prefix}insta <url>\` : Instagram Reels & Videos
 ├ • \`${prefix}ytmp3 <url>\` : YouTube High-Quality Audio
 ├ • \`${prefix}ytmp4 <url>\` : YouTube Video Downloader
 └ • \`${prefix}sticker\` : Instant Photo-to-Sticker Maker

👑 *OWNER PREMIUM CONTROLS*
 ├ • \`${prefix}autoreply on/off\` : Smart Away Assistant Mode
 ├ • \`${prefix}antiviewonce on/off\` : View-Once Auto Capture
 ├ • \`${prefix}reminder <time> <task>\` : Auto WhatsApp Reminder
 ├ • \`${prefix}tagall <msg>\` : (Group) Stylish Member Tagging
 └ • \`${prefix}ping\` : Check Ultra-Low Bot Latency

──────────────────────────
🚀 _Exclusive AI Ecosystem by ${config.ownerName}_
`;
          await sendSafeReply(msg, chatId, menuText);
          break;
        }

        // --- 2. AI Image Generator (.imagine / .draw) ---
        case 'imagine':
        case 'draw':
        case 'flux': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🎨 *Usage:* \`${prefix}imagine <prompt>\`\nExample: \`${prefix}imagine Cyberpunk futuristic warrior in neon rain, 8k ultra realistic\``);
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

        // --- 3. Instagram Reels Downloader (.insta / .ig / .reel) ---
        case 'insta':
        case 'ig':
        case 'reel': {
          if (!query || !query.includes('instagram.com')) {
            await sendSafeReply(msg, chatId, `📥 *Usage:* \`${prefix}insta <instagram_url>\`\nExample: \`${prefix}insta https://www.instagram.com/reel/C3...\``);
            break;
          }

          await sendSafeReply(msg, chatId, `📥 *Downloading Instagram Reel...* ⏳`);
          const dlResult = await downloadInstagramReel(query);

          if (dlResult && dlResult.buffer) {
            const base64Data = dlResult.buffer.toString('base64');
            const media = new MessageMedia('video/mp4', base64Data, 'instagram_reel.mp4');
            await client.sendMessage(chatId, media, {
              caption: `🎥 *INSTAGRAM REEL DOWNLOADED*\n\n👑 _Downloaded by ${config.botName}_`,
            });
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Reel download nahi ho saki. Kripya check karein ki link public ho.`);
          }
          break;
        }

        // --- 4. YouTube MP3 & MP4 Downloader (.ytmp3 / .ytmp4 / .play) ---
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

        // --- 5. Gemini AI Query (.ai / .ask) ---
        case 'ai':
        case 'ask': {
          if (!query) {
            await sendSafeReply(msg, chatId, `🧠 *Usage:* \`${prefix}ai <query>\`\nExample: \`${prefix}ai Explain Quantum Computing in 3 bullet points\``);
            break;
          }

          const aiReply = await askGemini(query, sender);
          await sendSafeReply(msg, chatId, aiReply);
          break;
        }

        // --- 6. Chat / Group Summarizer (.summary / .tldr) ---
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

        // --- 7. Voice Note Transcription (.transcribe) ---
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

        // --- 8. Sticker Maker (.sticker / .s) ---
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

        // --- 9. Auto-Reply Toggle (.autoreply on/off) ---
        case 'autoreply': {
          if (args[0] === 'on') {
            autoReplyEnabled = true;
            await sendSafeReply(msg, chatId, `✅ *Smart AI Assistant Away-Mode is now ON!*\nBot will politely handle incoming DMs while you are offline.`);
          } else if (args[0] === 'off') {
            autoReplyEnabled = false;
            await sendSafeReply(msg, chatId, `❌ *Smart AI Auto-Reply is now OFF.*`);
          } else {
            await sendSafeReply(msg, chatId, `Status: *${autoReplyEnabled ? 'ON' : 'OFF'}*\nUsage: \`${prefix}autoreply on\` or \`${prefix}autoreply off\``);
          }
          break;
        }

        // --- 10. Anti-ViewOnce Toggle (.antiviewonce on/off) ---
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

        // --- 11. Scheduled Reminders (.reminder 10m Call client) ---
        case 'reminder':
        case 'remind': {
          const durationStr = args[0];
          const taskText = args.slice(1).join(' ');

          if (!durationStr || !taskText) {
            await sendSafeReply(msg, chatId, `⚠️ *Usage:* \`${prefix}reminder <duration> <task>\`\nExamples:\n• \`${prefix}reminder 10m Call Rahul\`\n• \`${prefix}reminder 1h Submit project\``);
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

        // --- 12. Group TagAll (.tagall <announcement>) ---
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

        // --- 13. Ping / Latency ---
        case 'ping': {
          const start = Date.now();
          await sendSafeReply(
            msg,
            chatId,
            `🏓 *Pong!*\n⚡ *Latency:* ${Date.now() - start}ms\n🤖 *Bot:* ${config.botName} (Pro Edition)\n👑 *Owner:* ${config.ownerName}`
          );
          break;
        }

        default:
          break;
      }
    }

    // =========================================================================
    // 🌟 ULTRA-PREMIUM AWAY AUTO-REPLY MESSAGE (When offline/busy)
    // =========================================================================
    else if (autoReplyEnabled && !isGroup && !isFromMe && body) {
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
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

// Start Client
console.log('[*] Initializing WhatsApp Web engine...');
client.initialize();
