const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // saveFile(data, defaultName, filePath?)
  // data:    Uint8Array (legacy) — рендерер держит весь файл в памяти
  // filePath: абсолютный путь к готовому файлу (новый) — копируется на диск, без буфера в renderer
  saveFile: (data, defaultName, filePath) =>
    ipcRenderer.invoke('save-file', { data, defaultName, filePath }),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  showItem: (filePath) => ipcRenderer.invoke('show-item', filePath),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  onDownloadCompleted: (cb) => {
    const listener = (_event, info) => cb(info);
    ipcRenderer.on('download:completed', listener);
    return () => ipcRenderer.removeListener('download:completed', listener);
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  onUpdateAvailable: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('update:available', listener);
    return () => ipcRenderer.removeListener('update:available', listener);
  },
  onUpdateDownloaded: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
  restartApp: () => ipcRenderer.invoke('restart-app'),
});
