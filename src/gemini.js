import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

let genAI = null;

export function getGenAI() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

const MODES = {
  default: `You are ${config.botName}, an ultra-fast, intelligent, and helpful AI assistant created and owned by ${config.ownerName} for ${config.businessName}. Communicate fluently in natural Hinglish/Hindi/English. Be energetic and helpful.`,
  business: `You are ${config.botName} in PROFESSIONAL BUSINESS MODE, representing ${config.ownerName} and ${config.businessName}. Communicate with utmost elegance, professionalism, and corporate etiquette. Provide formal, polite, and persuasive solutions to clients.`,
  savage: `You are ${config.botName} in SAVAGE ROASTER MODE. Created by ${config.ownerName}. Have extreme swag, witty Indian desi humor, clever punchlines, and funny comebacks (friendly roast, no hate speech). Speak in trendy Hinglish with savage emojis 🔥😂.`,
  coder: `You are ${config.botName} in EXPERT CODER / SOFTWARE ENGINEER MODE. Created by ${config.ownerName}. Provide ultra-clean, production-ready code snippets with syntax highlighting, concise logic explanation, and zero fluff.`
};

/**
 * Generates an AI response from Gemini with Dynamic Personality Mode.
 */
export async function askGemini(prompt, userPhone = 'User', mode = 'default') {
  const ai = getGenAI();
  if (!ai) {
    return `⚠️ *Gemini API Key missing!* Kripya .env file me valid API key daalein.`;
  }

  try {
    const selectedInstruction = MODES[mode] || MODES.default;
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: `${selectedInstruction}\n\nAlways format replies cleanly for WhatsApp (*bold*, _italic_, bullet points). Owner is ${config.ownerName}.`,
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
      systemInstruction: "You are an expert multilingual audio transcriber. Listen carefully and transcribe the speech into accurate text with speaker emotion, language used, and English/Hindi translation if required.",
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString('base64'),
        },
      },
      "Transcribe this voice note / audio into clean readable text. Detect language and give summary.",
    ]);

    const response = await result.response;
    return response.text()?.trim() || "Audio clear nahi tha.";
  } catch (err) {
    console.error('Audio Transcription Error:', err);
    return `⚠️ Audio transcribe karne me dikkat aayi: ${err.message?.slice(0, 100)}`;
  }
}

/**
 * Analyzes an image using Gemini Multimodal.
 */
export async function analyzeImage(imageBuffer, prompt = "Describe this image in detail and extract any text.") {
  const ai = getGenAI();
  if (!ai) return "⚠️ Gemini API key missing.";

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: "You are an expert image & OCR analyzer. Analyze the image with extreme clarity, extract all printed/handwritten text, and explain its contents.",
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
    return response.text()?.trim() || "Image analyze nahi ho saki.";
  } catch (err) {
    console.error('Image Analysis Error:', err);
    return `⚠️ Image analyze karne me error: ${err.message?.slice(0, 100)}`;
  }
}

/**
 * Summarizes chat conversation history.
 */
export async function summarizeConversation(historyText) {
  const ai = getGenAI();
  if (!ai) return "⚠️ Gemini API key missing.";

  try {
    const model = ai.getGenerativeModel({
      model: config.geminiModel,
      systemInstruction: "You are an executive WhatsApp group & chat summarizer. Summarize recent chat conversations into a crisp, engaging, and structured bulleted recap (TL;DR). Highlight key decisions, tasks, and funny moments.",
    });

    const result = await model.generateContent(
      `Summarize the following WhatsApp chat history into bullet points:\n\n${historyText}`
    );

    const response = await result.response;
    return response.text()?.trim() || "Summary generate nahi ho saki.";
  } catch (err) {
    console.error('Summarize Error:', err);
    return `⚠️ Summary error: ${err.message?.slice(0, 100)}`;
  }
}
