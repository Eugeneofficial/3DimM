import { Router } from 'express';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdir, unlink, stat, readdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let ytDlpPath = 'yt-dlp';
export function setYtDlpPath(p) {
  ytDlpPath = p;
}

function runYtDlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
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
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
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

/* ============================ SSRF-защита ============================ */

function isPrivateIP(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function assertNotPrivate(urlStr) {
  try {
    const u = new URL(urlStr);
    if (isPrivateIP(u.hostname)) {
      throw new Error('Requests to private/local IPs are not allowed');
    }
  } catch (e) {
    throw e;
  }
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

  /* -------------------------- /info — информация о видео -------------------------- */
  router.get('/info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const info = await runYtDlpJson([
        '--no-download',
        '--print-json',
        '--no-playlist',
        url,
      ], 30000);

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
      console.error('yt-dlp info error:', err.message);
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
      const info = await runYtDlpJson([
        '--no-download',
        '--print-json',
        '--no-playlist',
        '-F',
        url,
      ], 30000);

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
    const expectedOutput = join(downloadsDir, `${downloadId}.mp4`);

    downloadProgress.set(downloadId, { percent: 0, status: 'downloading', speed: null });

    const args = [
      '--no-playlist',
      '--newline',
      '--progress',
      '--progress-template', '%(progress._percent_str)s %(progress._speed_str)s',
      '-o', outputTemplate,
      '--merge-output-format', 'mp4',
    ];

    if (formatId) {
      args.push('-f', `${formatId}+bestaudio/best`);
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    args.push(url);

    const acq = await Promise.race([
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 5000);
        return () => clearTimeout(timer);
      }).then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(true), 5100)),
    ]);

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
      console.error('Universal download error:', err.message);
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
