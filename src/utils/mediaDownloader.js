import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Downloads a binary buffer from any public HTTP/HTTPS URL
 */
export function fetchBuffer(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*'
      } 
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBuffer(res.headers.location));
      }
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

/**
 * Fetch JSON helper
 */
export function fetchJson(url, headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...headers
      } 
    }, (res) => {
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
 * AI Image Generator using high-speed Flux AI Engine
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
 * Core Media Downloader using yt-dlp with Node.js JS Runtime (Guaranteed YouTube / Media Download)
 */
function downloadMediaWithEngine(url, type = 'mp3') {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const outName = `ytdl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const outPath = path.join(tmpDir, `${outName}.%(ext)s`);

    let formatArg = '';
    if (type === 'mp3') {
      formatArg = `-f "ba/b" -x --audio-format mp3`;
    } else {
      formatArg = `-f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best" --merge-output-format mp4`;
    }

    const cmd = `yt-dlp --js-runtimes node ${formatArg} -o "${outPath}" --no-playlist --max-filesize 60M "${url}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp download error:', error.message);
        if (type !== 'mp3') {
          const fbCmd = `yt-dlp --js-runtimes node -f "b/best" -o "${outPath}" "${url}"`;
          return exec(fbCmd, (fbErr) => {
            if (fbErr) return resolve(null);
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(outName));
            if (files.length === 0) return resolve(null);
            const filePath = path.join(tmpDir, files[0]);
            const buffer = fs.readFileSync(filePath);
            try { fs.unlinkSync(filePath); } catch (e) {}
            return resolve({ buffer, title: 'Media File' });
          });
        }
        return resolve(null);
      }

      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(outName));
      if (files.length === 0) {
        return resolve(null);
      }

      const filePath = path.join(tmpDir, files[0]);
      const buffer = fs.readFileSync(filePath);
      try { fs.unlinkSync(filePath); } catch (e) {}

      resolve({ buffer, title: 'Media File' });
    });
  });
}

/**
 * Download YouTube MP3 Audio or Video (MP4)
 */
export async function downloadYouTube(url, type = 'mp3') {
  try {
    return await downloadMediaWithEngine(url, type);
  } catch (err) {
    console.error('YouTube download error:', err);
    return null;
  }
}

/**
 * Multi-Engine Instagram Reel / Video Downloader
 */
export async function downloadInstagramReel(url) {
  try {
    const cleanUrl = url.trim().split('?')[0];

    // Method 1: Public High-Speed Instagram API 1
    const api1 = await fetchJson(`https://api.vkrdown.com/web/app/instadl.php?vkr=${encodeURIComponent(cleanUrl)}`);
    if (api1 && api1.data && api1.data[0] && api1.data[0].url) {
      const buffer = await fetchBuffer(api1.data[0].url);
      if (buffer) return { buffer, caption: api1.data[0].title || 'Instagram Reel' };
    }

    // Method 2: Public Instagram API 2
    const api2 = await fetchJson(`https://widpe.com/download/instagram?url=${encodeURIComponent(cleanUrl)}`);
    if (api2 && api2.result && api2.result.url) {
      const buffer = await fetchBuffer(api2.result.url);
      if (buffer) return { buffer, caption: 'Instagram Reel' };
    }

    // Method 3: Direct yt-dlp extraction with GraphQL
    const ytDlpResult = await new Promise((resolve) => {
      const tmpDir = os.tmpdir();
      const outPath = path.join(tmpDir, `ig_${Date.now()}.mp4`);
      const cmd = `yt-dlp --no-check-certificates -f "b/best" -o "${outPath}" "${cleanUrl}"`;
      exec(cmd, (err) => {
        if (!err && fs.existsSync(outPath)) {
          const buffer = fs.readFileSync(outPath);
          try { fs.unlinkSync(outPath); } catch (e) {}
          return resolve({ buffer, caption: 'Instagram Reel' });
        }
        resolve(null);
      });
    });

    if (ytDlpResult) return ytDlpResult;

    return null;
  } catch (err) {
    console.error('Instagram download error:', err);
    return null;
  }
}
