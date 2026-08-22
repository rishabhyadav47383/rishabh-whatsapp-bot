import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

let genAI = null;

export function getGenAI() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

const SYSTEM_INSTRUCTION = `
You are ${config.botName}, an ultra-fast, intelligent, and helpful AI assistant created and owned by ${config.ownerName} for ${config.businessName}.

Persona & Communication Rules:
1. Always communicate fluently in the user's language (Hinglish, Hindi, or English).
2. Keep replies crisp, well-formatted for WhatsApp (*bold*, _italic_, emojis 🚀, bullet points).
3. If asked who made you or who is the owner, proudly state: "Mujhe *${config.ownerName}* ne develop kiya hai aur main *${config.businessName}* ka official WhatsApp AI bot hoon! 👑"
4. Be polite, energetic, and solution-oriented.
`;

/**
 * Generates an AI response from Gemini.
 */
export async function askGemini(prompt, userPhone = 'User') {
  const ai = getGenAI();
  if (!ai) {
    return `⚠️ *Gemini API Key missing!* Kripya .env file me valid API key daalein.`;
  }

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(`[User WhatsApp: ${userPhone}]\n${prompt}`);
    const response = await result.response;
    return response.text()?.trim() || "Maaf kijiye, main is query ko process nahi kar paya. 🙏";
  } catch (err) {
    console.error('Gemini Error:', err);
    return `⚠️ *AI Error:* ${err.message?.slice(0, 100)}`;
  }
}

/**
 * Transcribes audio / voice note using Gemini Multimodal.
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/mp3') {
  const ai = getGenAI();
  if (!ai) return "⚠️ Gemini API key missing.";

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/mp3',
          data: audioBuffer.toString('base64'),
        },
      },
      "Please listen carefully to this voice note and provide a full, accurate transcript in the original language (Hindi/English/Hinglish) followed by a short 1-line summary.",
    ]);
    const response = await result.response;
    return response.text()?.trim() || "Audio could not be transcribed.";
  } catch (err) {
    console.error('Transcription Error:', err);
    return `⚠️ *Transcription Failed:* ${err.message?.slice(0, 100)}`;
  }
}

/**
 * Analyzes an image with Gemini Vision.
 */
export async function analyzeImage(imageBuffer, prompt = 'Explain this image in detail and answer any questions inside it.') {
  const ai = getGenAI();
  if (!ai) return "⚠️ Gemini API key missing.";

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBuffer.toString('base64'),
        },
      },
      prompt,
    ]);
    const response = await result.response;
    return response.text()?.trim() || "Image could not be analyzed.";
  } catch (err) {
    console.error('Image Analysis Error:', err);
    return `⚠️ *Image Analysis Error:* ${err.message?.slice(0, 100)}`;
  }
}

/**
 * Summarizes a list of recent conversation messages.
 */
export async function summarizeConversation(messagesText) {
  const ai = getGenAI();
  if (!ai) return "⚠️ Gemini API key missing.";

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const prompt = `
Summarize the following recent WhatsApp conversation in concise bullet points:
Highlight key topics discussed, decisions made, or pending action items. Format in clean WhatsApp Markdown with emojis.

Conversation:
${messagesText}
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text()?.trim() || "Could not generate summary.";
  } catch (err) {
    console.error('Summarize Error:', err);
    return `⚠️ *Summarize Error:* ${err.message?.slice(0, 100)}`;
  }
}
