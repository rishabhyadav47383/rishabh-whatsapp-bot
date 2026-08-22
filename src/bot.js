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
  🤖 ${config.botName} - Real Phone Number WhatsApp UserBot
  👑 Creator & Owner:     ${config.ownerName}
  🏢 Organization:        ${config.businessName}
  🧠 AI Brain:            ${config.geminiModel}
================================================================================
`);

// State
let autoReplyEnabled = config.autoReplyDefault;
const chatHistoryMap = new Map(); // chatId -> Array of {sender, text, time}

// Initialize WhatsApp Web Client with persistent LocalAuth & Anti-Crash settings
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
  console.log('\n📲 [QR CODE GENERATED] Scan this QR Code with your WhatsApp:');
  console.log('   1. Open WhatsApp on your phone');
  console.log('   2. Tap Menu / Settings > Linked Devices > Link a Device');
  console.log('   3. Point your camera at this QR code:\n');
  qrcode.generate(qr, { small: true });
});

// Event 2: Authenticated & Ready
client.on('ready', () => {
  console.log(`\n🎉 [SUCCESS] Rishabh AI is now LIVE on your WhatsApp account!`);
  console.log(`👑 Owner: ${config.ownerName}`);
  console.log(`💡 Type .menu in any chat or group to see your AI superpowers!\n`);
});

// Event 3: Authentication failure
client.on('auth_failure', (msg) => {
  console.error('[-] Authentication failure:', msg);
});

// Event 4: Disconnected
client.on('disconnected', (reason) => {
  console.log('[!] Client was disconnected:', reason);
});

// Helper to safely send reply without crashing on getChat()
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

// Event 5: Handle Messages (both incoming from others and self-sent from phone)
client.on('message_create', async (msg) => {
  try {
    // Direct Chat ID extraction without calling getChat()
    const chatId = msg.to && msg.fromMe ? msg.to : msg.from;
    if (!chatId || chatId.includes('status@broadcast')) return;

    const isGroup = chatId.endsWith('@g.us');
    const body = msg.body ? msg.body.trim() : '';
    const isFromMe = msg.fromMe;
    const sender = isFromMe ? config.ownerName : (msg.author || msg.from).replace(/@.+/, '');

    // Track chat history for .summary command
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

    // Check for Command Prefix (e.g. .ai or !ai)
    const isCmd = config.prefixes.some((p) => body.startsWith(p));
    const prefix = isCmd ? body[0] : '';
    const command = isCmd ? body.slice(1).trim().split(/ +/)[0].toLowerCase() : '';
    const args = isCmd ? body.slice(1).trim().split(/ +/).slice(1) : [];
    const query = args.join(' ');

    // =========================================================================
    // COMMAND DISPATCHER
    // =========================================================================
    if (isCmd) {
      console.log(`[*] Received command: ${prefix}${command} in ${chatId} from ${sender}`);

      switch (command) {
        // --- 1. Menu / Help ---
        case 'menu':
        case 'help': {
          const menuText = `
👑 *${config.botName.toUpperCase()} - COMMAND MENU*
_Developed & Owned by ${config.ownerName}_
────────────────────────
🧠 *AI SUPERPOWERS:*
• *.ai <query>* : Ask Gemini anything
• *.ask <query>* : Conversational assistant
• *.summary* : Summarize last 20 messages of this chat
• *.transcribe* : Reply to voice note to transcribe
• *.ocr* : Extract text from photo / screenshot

🎨 *MEDIA & CREATIVE:*
• *.sticker* / *.s* : Reply to photo to make instant Sticker

⚙️ *OWNER & AUTOMATION:*
• *.autoreply on/off* : Toggle Smart AI Auto-Reply
• *.reminder <time> <task>* : Set WhatsApp reminder (e.g. .reminder 10m Call client)
• *.tagall <msg>* : (Group) Tag all group members
• *.ping* : Check bot speed & response latency

────────────────────────
🚀 _Powered by Google Gemini 3.6 Flash_
`;
          await sendSafeReply(msg, chatId, menuText);
          break;
        }

        // --- 2. Ping / Latency ---
        case 'ping': {
          const start = Date.now();
          await sendSafeReply(
            msg,
            chatId,
            `🏓 *Pong!*\n⚡ *Latency:* ${Date.now() - start}ms\n🤖 *Bot:* ${config.botName}\n👑 *Owner:* ${config.ownerName}`
          );
          break;
        }

        // --- 3. Gemini AI Query (.ai / .ask) ---
        case 'ai':
        case 'ask': {
          if (!query) {
            await sendSafeReply(msg, chatId, `⚠️ *Kripya sawal poochein!*\nExample: \`${prefix}ai What is artificial intelligence?\``);
            break;
          }

          const aiReply = await askGemini(query, sender);
          await sendSafeReply(msg, chatId, aiReply);
          break;
        }

        // --- 4. Chat / Group Summarizer (.summary / .tldr) ---
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

        // --- 5. Voice Note Transcription (.transcribe) ---
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

        // --- 6. Sticker Maker (.sticker / .s) ---
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

        // --- 7. Image Analysis & OCR (.ocr / .img) ---
        case 'ocr':
        case 'img': {
          let targetMsg = msg;
          if (msg.hasQuotedMsg) {
            targetMsg = await msg.getQuotedMessage();
          }

          if (targetMsg.hasMedia && targetMsg.type === 'image') {
            const media = await targetMsg.downloadMedia();
            if (media) {
              const buffer = Buffer.from(media.data, 'base64');
              const analysis = await analyzeImage(
                buffer,
                query || 'Extract all text and describe this image clearly.'
              );
              await sendSafeReply(msg, chatId, `🖼️ *IMAGE ANALYSIS:*\n\n${analysis}`);
            } else {
              await sendSafeReply(msg, chatId, '⚠️ Failed to download image.');
            }
          } else {
            await sendSafeReply(msg, chatId, `⚠️ Kripya photo par reply karke \`${prefix}ocr\` ya \`${prefix}img <prompt>\` likhein.`);
          }
          break;
        }

        // --- 8. Auto-Reply Toggle (.autoreply on/off) ---
        case 'autoreply': {
          if (args[0] === 'on') {
            autoReplyEnabled = true;
            await sendSafeReply(msg, chatId, `✅ *Smart AI Auto-Reply is now ON!*\nBot will intelligently reply to private DMs when you are away.`);
          } else if (args[0] === 'off') {
            autoReplyEnabled = false;
            await sendSafeReply(msg, chatId, `❌ *Smart AI Auto-Reply is now OFF.*`);
          } else {
            await sendSafeReply(msg, chatId, `Status: *${autoReplyEnabled ? 'ON' : 'OFF'}*\nUsage: \`${prefix}autoreply on\` or \`${prefix}autoreply off\``);
          }
          break;
        }

        // --- 9. Scheduled Reminders (.reminder 10m Call client) ---
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

        // --- 10. Group TagAll (.tagall <announcement>) ---
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

        default:
          break;
      }
    }

    // =========================================================================
    // AUTO-REPLY IN PRIVATE DMS (When enabled and not sent by me)
    // =========================================================================
    else if (autoReplyEnabled && !isGroup && !isFromMe && body) {
      const aiReply = await askGemini(body, sender);
      await sendSafeReply(msg, chatId, aiReply);
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

// Start Client
console.log('[*] Initializing WhatsApp Web engine...');
client.initialize();
