import https from 'https';
import http from 'http';

/**
 * Downloads a binary buffer from any public HTTP/HTTPS URL
 */
export function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => resolve(null));
    }).on('error', (err) => resolve(null));
  });
}

/**
 * Fetch JSON helper
 */
export function fetchJson(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

/**
 * AI Image Generator using high-speed Flux/Pollinations AI Engine
 */
export async function generateAiImage(prompt) {
  try {
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const seed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
    const buffer = await fetchBuffer(imageUrl);
    return buffer;
  } catch (err) {
    console.error('AI Image Generation error:', err);
    return null;
  }
}

/**
 * Download Instagram Reel / Video
 */
export async function downloadInstagramReel(url) {
  try {
    // API endpoint for Instagram Reel extraction
    const apiUrl = `https://api.vkrdown.com/web/app/instadl.php?vkr=${encodeURIComponent(url)}`;
    const data = await fetchJson(apiUrl);

    if (data && data.data && data.data[0] && data.data[0].url) {
      const videoUrl = data.data[0].url;
      const buffer = await fetchBuffer(videoUrl);
      return { buffer, caption: data.data[0].title || 'Instagram Reel' };
    }

    // Fallback Instagram API
    const fallbackApi = `https://widpe.com/download/instagram?url=${encodeURIComponent(url)}`;
    const fbData = await fetchJson(fallbackApi);
    if (fbData && fbData.result && fbData.result.url) {
      const buffer = await fetchBuffer(fbData.result.url);
      return { buffer, caption: 'Instagram Reel' };
    }

    return null;
  } catch (err) {
    console.error('Instagram download error:', err);
    return null;
  }
}

/**
 * Download YouTube MP3 Audio / Video
 */
export async function downloadYouTube(url, type = 'mp3') {
  try {
    // Fast public YouTube converter API
    const cleanUrl = encodeURIComponent(url);
    const apiUrl = `https://api.vkrdown.com/web/app/yt.php?vkr=${cleanUrl}`;
    const data = await fetchJson(apiUrl);

    if (data && data.data) {
      const item = type === 'mp3' ? data.data.audio : data.data.video;
      if (item && item.url) {
        const buffer = await fetchBuffer(item.url);
        return { buffer, title: data.data.title || 'YouTube Media' };
      }
    }
    return null;
  } catch (err) {
    console.error('YouTube download error:', err);
    return null;
  }
}
