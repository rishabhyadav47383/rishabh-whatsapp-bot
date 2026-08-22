import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

/**
 * Downloads media buffer from a Baileys message object.
 */
export async function downloadMediaMessage(message, mediaType) {
  try {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  } catch (err) {
    console.error('Error downloading media:', err);
    return null;
  }
}

/**
 * Converts an image buffer to WhatsApp webp sticker format (512x512).
 */
export async function createSticker(imageBuffer) {
  try {
    const stickerBuffer = await sharp(imageBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    return stickerBuffer;
  } catch (err) {
    console.error('Error converting sticker:', err);
    return null;
  }
}
