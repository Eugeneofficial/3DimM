import { Router } from 'express';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdir, stat, readdir } from 'fs/promises';
import { spawn } from 'child_process';
import { assertNotPrivate } from './security.js';
import { log } from './logger.js';

let ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';
export function setYtDlpPath(p) {
  ytDlpPath = p;
}

let cookiesPath = null;
export function setCookiesPath(p) {
  cookiesPath = p;
}

let cookiesFromBrowser = null;
export function setCookiesFromBrowser(p) {
  cookiesFromBrowser = p;
}

const BASE_ARGS = [
  '--no-warnings',
  '--no-check-certificates',
  '--js-runtimes', 'nodejs',
  '--extractor-args', 'youtube:player_client=android_vr',
];

const YOUTUBE_CLIENTS = [
  'android_vr',
  'mweb',
  'web',
  'android',
];

function buildArgs(extra, client) {
  const args = [...BASE_ARGS];
  if (client) {
    args.push('--extractor-args', `youtube:player_client=${client}`);
  }
  if (cookiesPath) args.push('--cookies', cookiesPath);
  else if (cookiesFromBrowser) args.push('--cookies-from-browser', cookiesFromBrowser);
  return [...args, ...extra];
}

function runYtDlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    log('info', 'yt-dlp exec:', ytDlpPath, args.slice(0, 5).join(' '));
    const proc = spawn(ytDlpPath, args, {
      timeout: timeoutMs,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const msg = stderr || `yt-dlp exited with code ${code}`;
        log('error', 'yt-dlp stderr:', msg.slice(0, 500));
        if (msg.includes('Sign in') || msg.includes('cookies') || msg.includes('PO Token')) {
          reject(new Error('AUTH_REQUIRED'));
        } else {
          reject(new Error(msg));
        }
      }
    });

    proc.on('error', reject);
  });
}

function runYtDlpJson(args, timeoutMs = 60000) {
  return runYtDlp(args, timeoutMs).then((stdout) => {
    return JSON.parse(stdout);
  });
}

function isYouTubeUrl(url) {
  try {
    const h = new URL(url).hostname;
    return h.includes('youtube.com') || h.includes('youtu.be');
  } catch { return false; }
}

function isAuthError(err) {
  if (!err || !err.message) return false;
  return err.message === 'AUTH_REQUIRED';
}

async function runYtDlpWithFallback(args, extra, timeoutMs = 60000) {
  if (!isYouTubeUrl(extra.find(a => a.startsWith('http')) || '')) {
    return runYtDlpJson(buildArgs(args), timeoutMs);
  }
  for (const client of YOUTUBE_CLIENTS) {
    try {
      const result = await runYtDlpJson(buildArgs(args, client), timeoutMs);
      return result;
    } catch (err) {
      if (isAuthError(err) && YOUTUBE_CLIENTS.indexOf(client) < YOUTUBE_CLIENTS.length - 1) {
        log('warn', `YouTube client ${client} requires auth, trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error('YouTube требует авторизацию. Экспортируйте cookies из браузера и укажите путь в настройках.');
}

/* ============================ Фабрика роутера ============================ */

export function createYtDlpRouter(opts = {}) {
  const {
    downloadsDir,
    onDownloadStart,
    onDownloadEnd,
  } = opts;

  const router = Router();
  const downloadProgress = new Map();

  /* -------------------------- /ytdlp-version — проверка версии -------------------------- */
  router.get('/ytdlp-version', async (req, res) => {
    try {
      const version = await runYtDlp(['--version'], 5000);
      res.json({ version: version.trim() });
    } catch (err) {
      res.json({ version: null, error: err.message });
    }
  });

  /* -------------------------- /ytdlp-cookies — настройка куки -------------------------- */
  router.post('/ytdlp-cookies', (req, res) => {
    const { path, browser } = req.body || {};
    if (path) {
      cookiesPath = path;
      cookiesFromBrowser = null;
    } else if (browser) {
      cookiesFromBrowser = browser;
      cookiesPath = null;
    } else {
      cookiesPath = null;
      cookiesFromBrowser = null;
    }
    res.json({ ok: true, cookiesPath, cookiesFromBrowser });
  });

  /* -------------------------- /info — информация о видео -------------------------- */
  router.get('/info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const info = await runYtDlpWithFallback([
        '--no-download',
        '--print-json',
        '--no-playlist',
        url,
      ], [url], 30000);

      const formats = (info.formats || []).map((f) => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
        fps: f.fps,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize || f.filesize_approx,
        tbr: f.tbr,
        protocol: f.protocol,
        quality: f.format_note || f.quality,
      }));

      res.json({
        id: info.id,
        title: info.title,
        description: info.description,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        webpage_url: info.webpage_url,
        extractor: info.extractor,
        formats,
      });
    } catch (err) {
      log('error', 'yt-dlp info error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /formats — список доступных форматов -------------------------- */
  router.get('/formats', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const info = await runYtDlpWithFallback([
        '--no-download',
        '--print-json',
        '--no-playlist',
        '-F',
        url,
      ], [url], 30000);

      const formats = (info.formats || [])
        .filter((f) => f.ext === 'mp4' || f.vcodec !== 'none')
        .map((f) => ({
          formatId: f.format_id,
          ext: f.ext,
          resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
          fps: f.fps,
          vcodec: f.vcodec,
          acodec: f.acodec,
          filesize: f.filesize || f.filesize_approx,
          tbr: f.tbr,
          quality: f.format_note || f.quality,
        }))
        .sort((a, b) => {
          const aRes = parseInt(a.resolution) || 0;
          const bRes = parseInt(b.resolution) || 0;
          return bRes - aRes;
        });

      res.json({ formats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /universal-download — скачивание -------------------------- */
  router.post('/universal-download', async (req, res) => {
    const { url, formatId, filename } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    await mkdir(downloadsDir, { recursive: true });

    const downloadId = randomUUID();
    const outputTemplate = join(downloadsDir, `${downloadId}.%(ext)s`);

    downloadProgress.set(downloadId, { percent: 0, status: 'downloading', speed: null });

    const args = buildArgs([
      '--no-playlist',
      '--newline',
      '--progress',
      '--progress-template', '%(progress._percent_str)s %(progress._speed_str)s',
      '-o', outputTemplate,
      '--merge-output-format', 'mp4',
    ]);

    if (formatId) {
      args.push('-f', `${formatId}+bestaudio/best`);
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    args.push(url);

    try {
      const proc = spawn(ytDlpPath, args, { windowsHide: true });
      let lastPercent = 0;

      proc.stdout.on('data', (d) => {
        const lines = d.toString().split('\n');
        for (const line of lines) {
          const match = line.match(/([\d.]+)%\s+([\d.]+\S+)/);
          if (match) {
            const percent = parseFloat(match[1]);
            const speed = match[2];
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress.set(downloadId, {
                percent,
                status: 'downloading',
                speed: speed ? `${speed}B/s` : null,
              });
            }
          }
        }
      });

      await new Promise((resolve, reject) => {
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });
        proc.on('error', reject);
      });

      const files = await readdir(downloadsDir);
      const downloaded = files.find((f) => f.startsWith(downloadId));
      if (!downloaded) {
        throw new Error('Downloaded file not found');
      }

      const finalPath = join(downloadsDir, downloaded);
      const rawName = filename || downloaded.replace(downloadId + '.', '').replace(/\.\w+$/, '.mp4');
      const finalName = rawName
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 200) || `${downloadId}.mp4`;
      const renamedPath = join(downloadsDir, finalName);
      const { rename, access } = await import('fs/promises');
      await rename(finalPath, renamedPath).catch(async () => {
        await access(finalPath).catch(() => { throw new Error('Downloaded file not found'); });
      });

      const fileStat = await stat(renamedPath).catch(() => stat(finalPath));
      downloadProgress.set(downloadId, { percent: 100, status: 'done' });

      if (onDownloadEnd) {
        onDownloadEnd({ url, outputPath: renamedPath, outputName: finalName, size: fileStat.size, ok: true });
      }

      res.json({
        ok: true,
        id: downloadId,
        path: renamedPath,
        name: finalName,
        size: fileStat.size,
      });
    } catch (err) {
      log('error', 'Universal download error:', err.message);
      downloadProgress.delete(downloadId);
      if (onDownloadEnd) {
        onDownloadEnd({ url, ok: false, error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /universal-progress (SSE) -------------------------- */
  router.get('/universal-progress', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id query parameter is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const interval = setInterval(() => {
      const p = downloadProgress.get(id);
      if (p) {
        res.write(`data: ${JSON.stringify(p)}\n\n`);
        if (p.status === 'done' || p.status === 'error') {
          clearInterval(interval);
          downloadProgress.delete(id);
          res.end();
        }
      }
    }, 500);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  /* -------------------------- /detect — определение типа ссылки -------------------------- */
  router.get('/detect', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();

      const isM3u8 = path.includes('.m3u8') || parsed.search.toLowerCase().includes('m3u8') ||
        path.includes('playlist') || path.includes('master');

      const isDirectVideo = path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.mkv') ||
        path.endsWith('.avi') || path.endsWith('.mov');

      const isDirectAudio = path.endsWith('.mp3') || path.endsWith('.flac') || path.endsWith('.wav') ||
        path.endsWith('.aac') || path.endsWith('.ogg');

      const isImage = path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') ||
        path.endsWith('.gif') || path.endsWith('.webp') || path.endsWith('.svg');

      const sites = {
        'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
        'twitter.com': 'Twitter', 'x.com': 'Twitter',
        'tiktok.com': 'TikTok',
        'instagram.com': 'Instagram',
        'facebook.com': 'Facebook', 'fb.com': 'Facebook',
        'twitch.tv': 'Twitch',
        'vk.com': 'VK', 'vkvideo': 'VK',
        'ok.ru': 'OK.ru',
        'rutube.ru': 'Rutube',
        'dzen.ru': 'Дзен',
        'reddit.com': 'Reddit',
        'vimeo.com': 'Vimeo',
        'dailymotion.com': 'Dailymotion',
        'soundcloud.com': 'SoundCloud',
        't.me': 'Telegram',
        'discord.com': 'Discord',
        'twitchclip.com': 'Twitch Clip',
        'clips.twitch.tv': 'Twitch Clip',
        'bilibili.com': 'Bilibili',
        'iqiyi.com': 'iQIYI',
        'youku.com': 'Youku',
        'le.com': 'LeEco',
        'mgtv.com': 'Mango TV',
        'v.qq.com': 'Tencent Video',
        'tv.sohu.com': 'Sohu Video',
        'haijiao': 'HaiJiao',
        'douyin.com': 'Douyin',
        'kuaishou.com': 'Kuaishou',
        'ixigua.com': 'Ixigua',
        'acfun.cn': 'AcFun',
        'nicovideo.jp': 'Niconico',
        'bilibili.tv': 'Bilibili TV',
      };

      let type = 'unknown';
      let site = null;

      if (isM3u8) type = 'm3u8';
      else if (isDirectVideo) type = 'direct-video';
      else if (isDirectAudio) type = 'direct-audio';
      else if (isImage) type = 'image';
      else {
        for (const [domain, name] of Object.entries(sites)) {
          if (host.includes(domain)) {
            site = name;
            type = 'supported-site';
            break;
          }
        }
        if (type === 'unknown') type = 'webpage';
      }

      res.json({ type, site, url });
    } catch {
      res.json({ type: 'unknown', url });
    }
  });

  return router;
}
