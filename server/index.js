import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, unlink, stat } from 'fs/promises';
import { createVideoRouter, setFfmpegPath, findFreePort, DEFAULT_PORT } from '../shared/videoRouter.js';
import { createYtDlpRouter, setYtDlpPath } from '../shared/ytDlpRouter.js';
import { log } from '../shared/logger.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// В standalone-режиме берём ffmpeg-static из node_modules сервера, если установлен.
try {
  const staticPath = (await import('ffmpeg-static')).default;
  if (staticPath) setFfmpegPath(staticPath);
} catch {
  log('warn', 'ffmpeg-static не найден, используется системный ffmpeg');
}

try {
  const ytdlpPath = execSync('python -c "import shutil; print(shutil.which(\'yt-dlp\'))"', { encoding: 'utf8' }).trim();
  if (ytdlpPath) {
    setYtDlpPath(ytdlpPath);
    log('info', `yt-dlp found at: ${ytdlpPath}`);
  }
} catch {
  log('warn', 'yt-dlp не найден через Python, используется системный');
}

async function cleanStaleDownloads(dir) {
  try {
    const files = await readdir(dir);
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    for (const f of files) {
      if (!f.endsWith('.mp4')) continue;
      const filePath = join(dir, f);
      try {
        const s = await stat(filePath);
        if (now - s.mtimeMs > ONE_HOUR) {
          await unlink(filePath).catch(() => {});
        }
      } catch {}
    }
  } catch {}
}

await cleanStaleDownloads(join(__dirname, 'downloads'));

const app = express();
app.use(cors());
app.use(express.json());

const downloadsDir = join(__dirname, 'downloads');
app.use('/api', createVideoRouter({ downloadsDir }));
app.use('/api', createYtDlpRouter({ downloadsDir }));

// Никогда не падаем из-за занятого порта — ищем ближайший свободный.
const port = await findFreePort(DEFAULT_PORT);
app.listen(port, () => {
  if (port !== DEFAULT_PORT) {
    log('warn', `порт ${DEFAULT_PORT} занят — используем резервный ${port}`);
  }
  log('info', `Server running on http://localhost:${port}`);
});

// Диагностика неожиданных ошибок — логируем, но не роняем процесс.
process.on('uncaughtException', (err) => {
  log('error', 'uncaughtException:', err.message);
});
process.on('unhandledRejection', (err) => {
  log('error', 'unhandledRejection:', err);
});
