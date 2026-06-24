const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { join } = require('path');
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { mkdir, unlink, stat, readdir, writeFile, readFile } = require('fs/promises');
const { createReadStream } = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let boundPort = null;
const PREFERRED_PORT = parseInt(process.env.DIMM_PORT || '3001', 10);
const appRoot = app.isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '..');
const downloadsDir = join(app.getPath('userData'), 'downloads');
const settingsPath = join(app.getPath('userData'), 'settings.json');

const defaultSettings = {
  downloadsPath: downloadsDir,
  maxConcurrent: 2,
  port: 3001,
};

let settings = { ...defaultSettings };

async function loadSettings() {
  try {
    const data = await readFile(settingsPath, 'utf8');
    settings = { ...defaultSettings, ...JSON.parse(data) };
  } catch {}
}

async function saveSettings() {
  await writeFile(settingsPath, JSON.stringify(settings, null, 2)).catch(() => {});
}

async function cleanStaleDownloads(dir) {
  try {
    await mkdir(dir, { recursive: true });
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

// ffmpeg-static: в dev берём из node_modules, в packaged — из resourcesPath.
function resolveFfmpegPath() {
  try {
    if (app.isPackaged) {
      return join(process.resourcesPath, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    }
    const staticPath = require('ffmpeg-static');
    return staticPath;
  } catch (err) {
    console.warn('[electron] ffmpeg-static не найден:', err.message);
    return null;
  }
}

async function startServer() {
  const serverApp = express();
  serverApp.use(cors());
  serverApp.use(express.json());

  const clientDist = join(appRoot, 'client', 'dist');
  serverApp.use(express.static(clientDist));

  // shared/videoRouter.js — ESM, импортируем динамически из CommonJS-контекста.
  const sharedPath = app.isPackaged
    ? join(process.resourcesPath, 'shared', 'videoRouter.js')
    : path.join(__dirname, '..', 'shared', 'videoRouter.js');
  const sharedUrl = 'file://' + sharedPath.replace(/\\/g, '/');

  const { createVideoRouter, setFfmpegPath, findFreePort } = await import(sharedUrl);
  const { createYtDlpRouter } = await import(sharedUrl.replace('videoRouter.js', 'ytDlpRouter.js'));

  const ffmpegPath = resolveFfmpegPath();
  if (ffmpegPath) setFfmpegPath(ffmpegPath);

  // Electron-режим: keepDownloads=true — файл остаётся на диске,
  // клиент забирает его через IPC save-file (без двойной буферизации в рендерере).
  const videoRouter = createVideoRouter({
    downloadsDir,
    keepDownloads: true,
    onDownloadEnd: (info) => {
      if (mainWindow && info.ok) {
        mainWindow.webContents.send('download:completed', {
          name: info.outputName,
          size: info.size,
          url: info.url,
          outputPath: info.outputPath,
          ok: true,
        });
      }
    },
  });
  serverApp.use('/api', videoRouter);

  const ytDlpRouter = createYtDlpRouter({
    downloadsDir,
    onDownloadEnd: (info) => {
      if (mainWindow && info.ok) {
        mainWindow.webContents.send('download:completed', {
          name: info.outputName,
          size: info.size,
          url: info.url,
          outputPath: info.outputPath,
          ok: true,
        });
      }
    },
  });
  serverApp.use('/api', ytDlpRouter);

  // findFreePort никогда не бросает — возвращает свободный порт или 0 (ОС назначит).
  const port = await findFreePort(PREFERRED_PORT);

  return new Promise((resolve, reject) => {
    const httpServer = serverApp.listen(port, () => {
      // Реальный порт (может отличаться от запрошенного, если port=0).
      const addr = httpServer.address();
      const realPort = typeof addr === 'object' && addr ? addr.port : port;
      boundPort = realPort;
      if (realPort !== PREFERRED_PORT) {
        console.warn(
          `[electron] порт ${PREFERRED_PORT} занят — используем резервный ${realPort}`
        );
      }
      console.log(`Embedded server running on http://localhost:${realPort}`);
      resolve(realPort);
    });
    // На случай, если listen всё же упадёт синхронно (маловероятно после findFreePort,
    // но guard обязателен — иначе снова получим uncaught exception).
    httpServer.once('error', (err) => reject(err));
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: join(appRoot, 'icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ------------------------------ IPC ------------------------------ */

// saveFile принимает путь к уже скачанному файлу (в userData/downloads) и копирует
// его в выбранное пользователем место — без загрузки всего буфера в renderer.
ipcMain.handle('save-file', async (event, payload) => {
  // Поддерживаем оба формата: {data,defaultName} (старый) и {filePath,defaultName} (новый)
  const { data, filePath, defaultName } = payload || {};

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить видео',
    defaultPath: defaultName || 'video.mp4',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
  });

  if (!result.canceled && result.filePath) {
    if (filePath) {
      // Новый путь: копируем файл с диска (быстро, без памяти рендерера).
      const { copyFile } = require('fs/promises');
      await copyFile(filePath, result.filePath);
    } else if (data) {
      await writeFile(result.filePath, Buffer.from(data));
    }
    return { path: result.filePath };
  }
  return { canceled: true };
});

ipcMain.handle('get-downloads-path', () => downloadsDir);

ipcMain.handle('show-item', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('get-downloads', async () => {
  try {
    await mkdir(downloadsDir, { recursive: true });
    const files = await readdir(downloadsDir);
    const fileInfos = await Promise.all(
      files
        .filter((f) => f.endsWith('.mp4'))
        .map(async (f) => {
          const st = await stat(join(downloadsDir, f)).catch(() => null);
          return { name: f, size: st ? st.size : 0, path: join(downloadsDir, f) };
        })
    );
    return fileInfos;
  } catch {
    return [];
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  await shell.openPath(filePath);
});

ipcMain.handle('get-settings', () => {
  return { ...settings };
});

ipcMain.handle('set-settings', (event, newSettings) => {
  if (newSettings.downloadsPath !== undefined) settings.downloadsPath = newSettings.downloadsPath;
  if (newSettings.maxConcurrent !== undefined) settings.maxConcurrent = newSettings.maxConcurrent;
  if (newSettings.port !== undefined) settings.port = newSettings.port;
  saveSettings();
  return { ok: true };
});

ipcMain.handle('restart-app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Выберите папку загрузок',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

/* ------------------------------ App lifecycle ------------------------------ */

async function bootstrap() {
  try {
    await loadSettings();
    await cleanStaleDownloads(downloadsDir);
    const port = await startServer();
    createWindow(port);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('[electron] failed to start:', msg);
    // Показываем понятный диалог вместо молчаливого краха.
    dialog.showErrorBox(
      '3DimM — не удалось запустить',
      `Встроенный сервер не запустился.\n\n${msg}\n\n` +
        'Проверьте, что порты не заблокированы антивирусом/файрволом, ' +
        'и перезапустите приложение.'
    );
    app.quit();
  }
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update:available');
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update:downloaded');
  }
});

autoUpdater.on('error', (err) => {
  console.error('[updater] error:', err.message);
});

app.whenReady().then(() => {
  bootstrap();
  autoUpdater.checkForUpdates().catch(() => {});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && boundPort) {
      createWindow(boundPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Глобальный guard: любая неперехваченная ошибка в main-процессе теперь
// логируется и показывает диалог, а не роняет приложение с «Uncaught Exception».
process.on('uncaughtException', (err) => {
  const msg = err && err.message ? err.message : String(err);
  console.error('[electron] uncaughtException:', msg);
  try {
    dialog.showErrorBox('3DimM — неожиданная ошибка', msg);
  } catch {}
});

process.on('unhandledRejection', (err) => {
  const msg = err && err.message ? err.message : String(err);
  console.error('[electron] unhandledRejection:', msg);
});
