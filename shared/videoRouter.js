import { Router } from 'express';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdir, unlink, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { createServer } from 'net';
import { createRequire } from 'module';
import { assertNotPrivate } from './security.js';
import { log } from './logger.js';

const require = createRequire(import.meta.url);

// Единственное место для дефолтов — используется и сервером, и Electron.
export const DEFAULT_PORT = parseInt(process.env.DIMM_PORT || '3001', 10);

/**
 * Запускает listener и слушает промис. Возвращает порт, на котором реально
 * удалось слушать (полезно, когда 0 — ОС сама выдаёт свободный).
 */
function listenAsync(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

/**
 * Находит свободный порт: пытается занять preferred, при EADDRINUSE
 * перебирает preferred+1 … preferred+maxAttempts. Если занято всё —
 * отдаёт 0 (ОС назначит сама). Никогда не бросает — всегда возвращает число.
 *
 * @param {number} preferred
 * @param {number} maxAttempts
 * @returns {Promise<number>}
 */
export async function findFreePort(preferred = DEFAULT_PORT, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = preferred + attempt;
    const probe = createServer();
    try {
      await listenAsync(probe, port);
      probe.close();
      return port;
    } catch (err) {
      probe.close();
      // EADDRINUSE — пробуем следующий. Любая другая ошибка — тоже
      // не падаем, а двигаемся дальше, чтобы пользователь получил UI.
      if (err && err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
        // Непредвиденная ошибка сети — логируем и продолжаем.
        log('warn', `[port] probe ${port} failed: ${err.code || err.message}`);
      }
    }
  }
  // Все попытки заняты — просим ОС выдать любой свободный порт.
  const probe = createServer();
  return new Promise((resolve) => {
    probe.once('listening', () => {
      const addr = probe.address();
      probe.close();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
    probe.once('error', () => {
      probe.close();
      resolve(0);
    });
    probe.listen(0);
  });
}

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Опциональный путь к ffmpeg. Если передан — ставим до запуска команд.
// ffmpeg-static отдаёт абсолютный путь к бинарнику, electron-main резолвит из resourcesPath.
let ffmpegPath = null;
export function setFfmpegPath(p) {
  ffmpegPath = p;
}

function loadFfmpeg() {
  // fluent-ffmpeg — CommonJS, импортируем динамически из обоих окружений.
  // Пытаемся сначала из корневых node_modules, потом из локальных.
  let fluent;
  try {
    fluent = require('fluent-ffmpeg');
  } catch {
    fluent = createRequire(import.meta.url)('fluent-ffmpeg');
  }
  if (ffmpegPath) fluent.setFfmpegPath(ffmpegPath);
  return fluent;
}

/* ============================ Парсинг m3u8 ============================ */

export function extractM3u8FromText(text, sourceUrl) {
  const urls = new Set();
  const patterns = [
    /(?:https?:)?\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi,
    /(?:https?:)?\/\/[^\s"'<>]+\.m3u8\?[^\s"'<>]*/gi,
    /(?:file|source|url|src|href)\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/gi,
    /["']((?:https?:)?\/\/[^"']+\.m3u8[^"']*)["']/gi,
    /["']([^"']+\.m3u8[^"']*)["']/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      let u = m[1] || m[0];
      u = u.replace(/^["']|["']$/g, '').trim();
      if (u.length > 5 && u.length < 2048) {
        if (u.startsWith('//')) u = 'https:' + u;
        if (u.startsWith('/')) {
          try {
            const base = new URL(sourceUrl);
            u = base.origin + u;
          } catch {}
        }
        if (u.includes('.m3u8')) urls.add(u);
      }
    }
  }

  const found = [...urls].filter((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });

  found.sort((a, b) => {
    const aHasRes = /(\d{3,4}p|\d{3,4}x\d{3,4})/i.test(a);
    const bHasRes = /(\d{3,4}p|\d{3,4}x\d{3,4})/i.test(b);
    if (aHasRes && !bHasRes) return -1;
    if (!aHasRes && bHasRes) return 1;
    return b.length - a.length;
  });

  return found;
}

export function isM3u8Content(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('#EXTM3U')) return true;
  if (trimmed.startsWith('#EXT-X-')) return true;
  if (/<playlist/i.test(trimmed) && /<media-uri/i.test(trimmed)) return true;
  return false;
}

// Исправлено: корректно учитываем #EXT-X-MEDIA (аудио/сабы) как отдельные варианты.
export function parseMasterPlaylist(content) {
  const variants = [];
  const lines = content.split('\n');
  let currentBandwidth = null;
  let currentResolution = null;
  let currentName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      const nameMatch = line.match(/NAME="([^"]+)"/);
      currentBandwidth = bwMatch ? parseInt(bwMatch[1]) : null;
      currentResolution = resMatch ? resMatch[1] : null;
      currentName = nameMatch ? nameMatch[1] : null;
    } else if (line.startsWith('#EXT-X-MEDIA:')) {
      // Самодостаточный тег: URI в нём самом описывает дорожку (аудио/сабтитры).
      const nameMatch = line.match(/NAME="([^"]+)"/);
      const uriMatch = line.match(/URI="([^"]+)"/);
      const typeMatch = line.match(/TYPE=([A-Z]+)/);
      if (uriMatch) {
        const kind = typeMatch ? typeMatch[1].toLowerCase() : 'media';
        const label = nameMatch ? nameMatch[1] : `${kind}-${variants.length + 1}`;
        variants.push({
          bandwidth: null,
          resolution: null,
          name: `${label} (${kind})`,
          url: uriMatch[1],
        });
      }
    } else if (line && !line.startsWith('#')) {
      // URL-строка после STREAM-INF — видеовариант.
      if (currentBandwidth !== null || currentName) {
        variants.push({
          bandwidth: currentBandwidth,
          resolution: currentResolution,
          name: currentName || `variant-${variants.length + 1}`,
          url: line,
        });
      }
      currentBandwidth = null;
      currentResolution = null;
      currentName = null;
    }
  }

  return variants;
}

export function resolveM3u8Url(relative, base) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export function isLikelyM3u8Url(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const params = parsed.search.toLowerCase();
    return (
      path.includes('m3u8') ||
      params.includes('m3u8') ||
      path.endsWith('.m3u8') ||
      path.includes('playlist') ||
      path.includes('master') ||
      path.includes('index.m3u8')
    );
  } catch {
    return false;
  }
}

/* ============================ Сеть ============================ */

export async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 15000) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, { ...options, redirect: 'follow', signal: controller.signal });
      clearTimeout(timer);
      if (resp.status === 403) {
        const altHeaders = {
          ...options.headers,
          Referer: url,
          Origin: new URL(url).origin,
        };
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
        const resp2 = await fetch(url, { ...options, headers: altHeaders, redirect: 'follow', signal: controller2.signal });
        clearTimeout(timer2);
        return resp2;
      }
      return resp;
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function testVariantSpeed(variantUrl, baseM3u8Url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const start = Date.now();

  try {
    const resp = await fetch(variantUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*', Referer: baseM3u8Url },
    });

    if (!resp.ok) {
      clearTimeout(timer);
      return { url: variantUrl, speed_bps: 0, latency_ms: Date.now() - start, error: `HTTP ${resp.status}` };
    }

    const content = await resp.text();

    if (isM3u8Content(content)) {
      const tsLines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      if (tsLines.length > 0) {
        const tsUrl = resolveM3u8Url(tsLines[0], variantUrl);
        const tsStart = Date.now();
        const tsResp = await fetch(tsUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': USER_AGENT, Referer: variantUrl },
        });
        if (tsResp.ok) {
          const reader = tsResp.body.getReader();
          let totalBytes = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.length;
            if (totalBytes >= 512 * 1024) break;
          }
          const elapsed = (Date.now() - tsStart) / 1000;
          clearTimeout(timer);
          return {
            url: variantUrl,
            speed_bps: elapsed > 0 ? Math.round((totalBytes * 8) / elapsed) : 0,
            latency_ms: Date.now() - start,
            bytes_tested: totalBytes,
          };
        }
      }
    }

    const totalBytes = Buffer.byteLength(content, 'utf8');
    const elapsed = (Date.now() - start) / 1000;
    clearTimeout(timer);
    return {
      url: variantUrl,
      speed_bps: elapsed > 0 ? Math.round((totalBytes * 8) / elapsed) : 0,
      latency_ms: Date.now() - start,
      bytes_tested: totalBytes,
    };
  } catch (err) {
    clearTimeout(timer);
    return { url: variantUrl, speed_bps: 0, latency_ms: Date.now() - start, error: err.message };
  }
}

/* ============================ Безопасность ============================ */

// Санитизация имени файла: только латиница/цифры/_-. и пробел, длина ≤ 100, без разделителей пути.
export function sanitizeFilename(name, fallback) {
  if (typeof name !== 'string') return fallback;
  let cleaned = name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\.+/g, '.').slice(0, 100);
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  // Гарантируем расширение .mp4
  if (!/\.mp4$/i.test(cleaned)) cleaned += '.mp4';
  return cleaned;
}

// Простой семафор для ограничения одновременных скачиваний.
function createSemaphore(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max) return;
    const waiter = queue.shift();
    if (!waiter) return;
    active++;
    waiter();
  };
  return {
    async acquire() {
      if (active < max) {
        active++;
        return;
      }
      await new Promise((resolve) => queue.push(resolve));
    },
    release() {
      active = Math.max(0, active - 1);
      next();
    },
  };
}

/* ============================ Фабрика роутера ============================ */

/**
 * Создаёт Express-роутер со всеми m3u8-эндпоинтами.
 *
 * @param {object} opts
 * @param {string} opts.downloadsDir          — куда складывать временные mp4
 * @param {function} [opts.onDownloadStart]   — (info) вызывается перед запуском ffmpeg
 * @param {function} [opts.onDownloadEnd]     — (info) вызывается после завершения
 * @param {number}  [opts.downloadTimeoutMs]  — макс. длительность одного скачивания (мс)
 * @param {number}  [opts.maxConcurrent]      — лимит одновременных скачиваний
 */
export function createVideoRouter(opts = {}) {
  const {
    downloadsDir,
    onDownloadStart,
    onDownloadEnd,
    downloadTimeoutMs = 30 * 60 * 1000,
    maxConcurrent = 2,
  } = opts;

  const router = Router();
  const sem = createSemaphore(maxConcurrent);
  const downloadProgress = new Map();

  /* -------------------------- /extract -------------------------- */
  router.get('/extract', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const targetUrl = url.trim();
      if (targetUrl.includes('.m3u8') || isLikelyM3u8Url(targetUrl)) {
        return res.json({ urls: [targetUrl], direct: true });
      }

      const response = await fetchWithRetry(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
      }

      const finalUrl = response.url;
      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      if (contentType.includes('mpegurl') || contentType.includes('x-mpegurl')) {
        return res.json({ urls: [finalUrl], direct: true });
      }

      if (contentType.includes('json')) {
        const json = await response.json();
        const found = extractM3u8FromText(JSON.stringify(json), finalUrl);
        if (found.length > 0) return res.json({ urls: found, source: 'json' });
        if (json.url && typeof json.url === 'string' && json.url.includes('.m3u8')) {
          return res.json({ urls: [json.url], direct: true });
        }
        if (json.data && typeof json.data === 'string') {
          const innerFound = extractM3u8FromText(json.data, finalUrl);
          if (innerFound.length > 0) return res.json({ urls: innerFound, source: 'json-data' });
        }
        return res.json({ urls: [], source: 'json', error: 'No m3u8 found in JSON' });
      }

      const html = await response.text();

      // Поддержка плееров вида "var player_aaaa = {...}"
      const playerMatch = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\});/);
      if (playerMatch) {
        try {
          const playerData = JSON.parse(playerMatch[1]);
          if (
            playerData.site_url &&
            playerData.id &&
            playerData.sid !== undefined &&
            playerData.nid !== undefined
          ) {
            const playUrl = `${playerData.site_url}/index.php/m3u8play/play/id/${playerData.id}/nid/${playerData.nid}/sid/${playerData.sid}`;
            const playResp = await fetchWithRetry(playUrl, {
              headers: { 'User-Agent': USER_AGENT, Referer: finalUrl, Accept: '*/*' },
              redirect: 'follow',
            });
            if (playResp.ok) {
              const playHtml = await playResp.text();
              const urlMatch = playHtml.match(/var\s+cur_PlayUrl\s*=\s*["']([^"']+)["']/);
              if (urlMatch && urlMatch[1].includes('.m3u8')) {
                return res.json({ urls: [urlMatch[1]], source: 'player-iframe', direct: true });
              }
            }
          }
        } catch {}
      }

      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const found = extractM3u8FromText(scriptMatch[1], finalUrl);
        if (found.length > 0) return res.json({ urls: found, source: 'script' });
      }

      const htmlFound = extractM3u8FromText(html, finalUrl);
      if (htmlFound.length > 0) return res.json({ urls: htmlFound, source: 'html' });

      const iframeRegex = /<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi;
      let iframeMatch;
      while ((iframeMatch = iframeRegex.exec(html)) !== null) {
        let iUrl = iframeMatch[1];
        if (iUrl.startsWith('//')) iUrl = 'https:' + iUrl;
        if (iUrl.startsWith('/')) {
          try {
            iUrl = new URL(finalUrl).origin + iUrl;
          } catch {}
        }
        if (iUrl.startsWith('http')) {
          try {
            const iframeResp = await fetchWithRetry(iUrl, {
              headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
              redirect: 'follow',
            });
            if (iframeResp.ok) {
              const iframeText = await iframeResp.text();
              const iframeFound = extractM3u8FromText(iframeText, iframeResp.url || iUrl);
              if (iframeFound.length > 0) return res.json({ urls: iframeFound, source: 'iframe' });
            }
          } catch {}
        }
      }

      return res.json({ urls: [], source: 'none', error: 'No m3u8 URLs found on this page' });
    } catch (err) {
      log('error', 'Extract error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /proxy -------------------------- */
  router.get('/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: url,
          Accept: '*/*',
          Origin: (() => {
            try {
              return new URL(url).origin;
            } catch {
              return '';
            }
          })(),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
      }

      const respContentType = (response.headers.get('content-type') || '').toLowerCase();
      const isM3u8Type = respContentType.includes('mpegurl') || respContentType.includes('x-mpegurl');

      const rewriteM3u8 = (text) => {
        const base = new URL(url);
        const resolveUrl = (rel) => {
          try {
            return new URL(rel, base).href;
          } catch {
            return rel;
          }
        };
        return text.replace(/^(?!#)(.+)$/gm, (match, p1) => {
          const trimmed = p1.trim();
          if (!trimmed) return match;
          return `/api/proxy?url=${encodeURIComponent(resolveUrl(trimmed))}`;
        });
      };

      if (isM3u8Type) {
        const text = await response.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.send(rewriteM3u8(text));
      }

      const text = await response.text();
      if (isM3u8Content(text)) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.send(rewriteM3u8(text));
      }

      res.setHeader('Content-Type', respContentType || 'application/octet-stream');
      res.send(text);
    } catch (err) {
      log('error', 'Proxy error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /download/progress (SSE) -------------------------- */
  router.get('/download/progress', (req, res) => {
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

  /* -------------------------- /refresh -------------------------- */
  router.get('/refresh', async (req, res) => {
    const { url, source } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });

    try {
      if (url.includes('.m3u8')) return res.json({ url });

      if (source === 'player-iframe') {
        const response = await fetchWithRetry(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
          redirect: 'follow',
        });
        if (response.ok) {
          const html = await response.text();
          const playerMatch = html.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\});/);
          if (playerMatch) {
            const playerData = JSON.parse(playerMatch[1]);
            if (
              playerData.site_url &&
              playerData.id &&
              playerData.sid !== undefined &&
              playerData.nid !== undefined
            ) {
              const playUrl = `${playerData.site_url}/index.php/m3u8play/play/id/${playerData.id}/nid/${playerData.nid}/sid/${playerData.sid}`;
              const playResp = await fetchWithRetry(playUrl, {
                headers: { 'User-Agent': USER_AGENT, Referer: url, Accept: '*/*' },
                redirect: 'follow',
              });
              if (playResp.ok) {
                const playHtml = await playResp.text();
                const urlMatch = playHtml.match(/var\s+cur_PlayUrl\s*=\s*["']([^"']+)["']/);
                if (urlMatch && urlMatch[1].includes('.m3u8')) {
                  return res.json({ url: urlMatch[1] });
                }
              }
            }
          }
        }
      }

      const response = await fetchWithRetry(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
        redirect: 'follow',
      });
      if (response.ok) {
        const html = await response.text();
        const found = extractM3u8FromText(html, url);
        if (found.length > 0) return res.json({ url: found[0] });
      }

      return res.status(404).json({ error: 'Could not refresh m3u8 URL' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /tracks -------------------------- */
  router.get('/tracks', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const resp = await fetchWithRetry(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', Referer: url },
      });
      if (!resp.ok) return res.status(resp.status).json({ error: `HTTP ${resp.status}` });

      const content = await resp.text();
      if (!isM3u8Content(content)) return res.json({ tracks: [] });

      const variants = parseMasterPlaylist(content);
      const tracks = variants.map((v) => ({
        name: v.name,
        resolution: v.resolution,
        bandwidth: v.bandwidth,
        url: resolveM3u8Url(v.url, url),
        type: v.resolution ? 'video' : 'media',
      }));

      res.json({ tracks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /speed-test -------------------------- */
  router.get('/speed-test', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });

    try {
      const resp = await fetchWithRetry(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', Referer: url },
      });
      if (!resp.ok) {
        return res.status(resp.status).json({ error: `Failed to fetch playlist: ${resp.status}` });
      }

      const content = await resp.text();
      if (!isM3u8Content(content)) {
        return res.json({ results: [], fastest: url, message: 'Not a valid m3u8 playlist' });
      }

      const variants = parseMasterPlaylist(content);
      if (variants.length === 0) {
        return res.json({ results: [], fastest: url, message: 'No variants found in master playlist' });
      }

      const testResults = await Promise.all(
        variants.map(async (v) => {
          const fullUrl = resolveM3u8Url(v.url, url);
          const result = await testVariantSpeed(fullUrl, url);
          return {
            ...v,
            fullUrl,
            speed_bps: result.speed_bps,
            latency_ms: result.latency_ms,
            bytes_tested: result.bytes_tested,
            error: result.error,
          };
        })
      );

      testResults.sort((a, b) => {
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        return b.speed_bps - a.speed_bps;
      });

      const fastest = testResults.find((r) => !r.error) || testResults[0];

      res.json({
        results: testResults.map((r) => ({
          name: r.name,
          resolution: r.resolution,
          bandwidth: r.bandwidth,
          url: r.fullUrl,
          speed_bps: r.speed_bps,
          speed_mbps: r.speed_bps ? (r.speed_bps / 1000000).toFixed(2) : '0',
          latency_ms: r.latency_ms,
          error: r.error,
        })),
        fastest: fastest ? fastest.fullUrl : url,
      });
    } catch (err) {
      log('error', 'Speed test error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /export-playlist -------------------------- */
  router.get('/export-playlist', async (req, res) => {
    const { url, quality } = req.query;
    if (!url) return res.status(400).json({ error: 'url query parameter is required' });
    try { assertNotPrivate(url); } catch (e) {
      return res.status(403).json({ error: e.message });
    }

    try {
      const resp = await fetchWithRetry(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', Referer: url },
      });
      if (!resp.ok) return res.status(resp.status).json({ error: `HTTP ${resp.status}` });

      const content = await resp.text();
      if (!isM3u8Content(content)) return res.status(400).json({ error: 'Not a valid m3u8' });

      const variants = parseMasterPlaylist(content);
      if (variants.length === 0) return res.json({ playlist: content });

      let selectedUrl = url;
      if (quality) {
        const match = variants.find((v) =>
          v.resolution === quality || v.name === quality || v.bandwidth?.toString() === quality
        );
        if (match) selectedUrl = resolveM3u8Url(match.url, url);
      }

      const exportVariants = variants.map((v) => ({
        name: v.name || v.resolution || 'variant',
        resolution: v.resolution,
        bandwidth: v.bandwidth,
        url: resolveM3u8Url(v.url, url),
      }));

      res.json({ selectedUrl, variants: exportVariants });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* -------------------------- /download -------------------------- */
  router.post('/download', async (req, res) => {
    const { url, filename } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    await mkdir(downloadsDir, { recursive: true });

    const outputName = sanitizeFilename(filename, `${randomUUID()}.mp4`);
    const outputPath = join(downloadsDir, outputName);
    const downloadId = randomUUID();
    const meta = { url, outputPath, outputName };

    // Лимит одновременных задач.
    const acquired = await Promise.race([
      sem.acquire().then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    if (!acquired) {
      return res.status(503).json({ error: 'Too many concurrent downloads, try again later' });
    }

    const cleanup = async () => {
      // Для standalone-режима сервер сам удаляет временный файл после стриминга.
      // В Electron-режиме файл остаётся (пользователь забирает через save-file).
      if (!opts.keepDownloads) {
        await unlink(outputPath).catch(() => {});
      }
    };

    downloadProgress.set(downloadId, { percent: 0, speed: null, status: 'downloading' });

    const info = {
      ...meta,
      startedAt: Date.now(),
    };
    if (onDownloadStart) onDownloadStart(info);

    log('info', 'Downloading:', url);

    // Принудительная остановка ffmpeg по таймауту.
    let cmdRef = null;
    const timeoutHandle = setTimeout(() => {
      log('error', 'Download timeout reached, aborting');
      downloadProgress.set(downloadId, { percent: 0, speed: null, status: 'error', error: 'timeout' });
      if (cmdRef && typeof cmdRef.kill === 'function') {
        try {
          cmdRef.kill('SIGKILL');
        } catch {}
      }
    }, downloadTimeoutMs);

    try {
      const ffmpeg = loadFfmpeg();
      await new Promise((resolve, reject) => {
        cmdRef = ffmpeg(url)
          .inputOptions([
            '-user_agent',
            USER_AGENT,
            '-headers',
            [
              'Accept: */*',
              `Referer: ${url}`,
              `Origin: ${(() => {
                try {
                  return new URL(url).origin;
                } catch {
                  return '';
                }
              })()}`,
            ].join('\r\n') + '\r\n',
            '-reconnect',
            '1',
            '-reconnect_streamed',
            '1',
            '-reconnect_delay_max',
            '5',
          ])
          .outputOptions(['-c', 'copy', '-movflags', 'faststart', '-y', '-max_muxing_queue_size', '1024'])
          .output(outputPath)
          .format('mp4')
          .on('start', (cmdLine) => log('info', 'FFmpeg command:', cmdLine))
          .on('progress', (p) => {
            if (p.percent) log('info', `Progress: ${Math.round(p.percent)}%`);
            const speed = p.currentSpeed ? `${(p.currentSpeed / 1000000).toFixed(1)} Мбит/с` : null;
            downloadProgress.set(downloadId, {
              percent: p.percent || 0,
              speed,
              time: p.timemark || null,
              status: 'downloading',
            });
          })
          .on('end', () => {
            log('info', 'Download complete');
            downloadProgress.set(downloadId, { percent: 100, speed: null, status: 'done' });
            resolve();
          })
          .on('error', (err) => {
            log('error', 'FFmpeg error:', err.message);
            downloadProgress.set(downloadId, { percent: 0, speed: null, status: 'error', error: err.message });
            reject(err);
          });
        cmdRef.run();
      });

      clearTimeout(timeoutHandle);
      const fileStat = await stat(outputPath);

      if (opts.keepDownloads) {
        // Electron-режим: отдаём метаданные, клиент сам запросит файл через IPC save-file.
        downloadProgress.delete(downloadId);
        res.json({ ok: true, id: downloadId, path: outputPath, name: outputName, size: fileStat.size });
        if (onDownloadEnd) onDownloadEnd({ ...meta, size: fileStat.size, ok: true });
        return;
      }

      // Standalone-режим: стримим готовый файл в ответ, потом удаляем временный.
      downloadProgress.delete(downloadId);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', fileStat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);

      const stream = createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', async () => {
        await cleanup();
        if (onDownloadEnd) onDownloadEnd({ ...meta, size: fileStat.size, ok: true });
      });
      stream.on('error', async () => {
        await cleanup();
        if (!res.headersSent) res.status(500).json({ error: 'stream error' });
      });
    } catch (err) {
      clearTimeout(timeoutHandle);
      log('error', 'Download error:', err.message);
      downloadProgress.delete(downloadId);
      await cleanup();
      if (!res.headersSent) res.status(500).json({ error: err.message });
      if (onDownloadEnd) onDownloadEnd({ ...meta, ok: false, error: err.message });
    } finally {
      sem.release();
    }
  });

  return router;
}
