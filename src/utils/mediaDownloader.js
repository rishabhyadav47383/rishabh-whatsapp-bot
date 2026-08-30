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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
 * Download YouTube MP3 Audio or Video (MP4) using Android Client Emulation
 */
export async function downloadYouTube(url, type = 'mp3') {
  return new Promise((resolve) => {
    try {
      const cleanUrl = url.trim();
      const tmpDir = os.tmpdir();
      const outName = `ytdl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const outPath = path.join(tmpDir, `${outName}.${type === 'mp3' ? 'mp3' : 'mp4'}`);

      const formatArg = type === 'mp3' 
        ? `-f "140/ba/b" --extract-audio --audio-format mp3`
        : `-f "18/best[height<=480]/best[ext=mp4]/best"`;

      const cmd = `yt-dlp --extractor-args "youtube:player_client=android" ${formatArg} --no-playlist --max-filesize 50M -o "${outPath}" "${cleanUrl}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('yt-dlp error:', error.message);
          // Fallback command without audio extraction if mp3 failed
          const fallbackCmd = `yt-dlp --extractor-args "youtube:player_client=android" -f "18/b" -o "${outPath}" "${cleanUrl}"`;
          return exec(fallbackCmd, (fbErr) => {
            if (fbErr || !fs.existsSync(outPath)) return resolve(null);
            const buffer = fs.readFileSync(outPath);
            try { fs.unlinkSync(outPath); } catch (e) {}
            return resolve({ buffer, title: 'YouTube Media' });
          });
        }

        if (!fs.existsSync(outPath)) {
          return resolve(null);
        }

        const buffer = fs.readFileSync(outPath);
        try { fs.unlinkSync(outPath); } catch (e) {}

        return resolve({ buffer, title: 'YouTube Media' });
      });
    } catch (err) {
      console.error('YouTube download exception:', err);
      resolve(null);
    }
  });
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
