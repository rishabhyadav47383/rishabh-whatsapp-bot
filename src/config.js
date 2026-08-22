import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // AI Engine
  geminiApiKey: process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JMk0W9lcgQRbvIMoShynLfMkLxrV5p4XRxgwnTkxyQfw',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',

  // Bot & Owner Branding
  botName: process.env.BOT_NAME || 'Rishabh AI',
  ownerName: process.env.OWNER_NAME || 'Rishabh',
  businessName: process.env.BUSINESS_NAME || 'Rishabh AI & Tech Solutions',

  // Command Prefixes (e.g. .ai or !ai)
  prefixes: ['.', '!'],

  // Default Auto-Reply Mode (can be toggled with .autoreply on/off)
  autoReplyDefault: false,

  // Session Directory for Baileys Auth State
  authFolder: './auth_info_baileys',
};
