import { create } from 'zustand';

export const useAppStore = create((set) => ({
  m3u8Url: '',
  sourceUrl: '',
  isLoaded: false,
  downloading: false,
  downloadProgress: null,
  downloadedPath: null,
  activeTab: 'player',
  isElectron: typeof window !== 'undefined' && !!window.electronAPI,

  setM3u8Url: (url) => set({ m3u8Url: url }),
  setSourceUrl: (src) => set({ sourceUrl: src }),
  setIsLoaded: (v) => set({ isLoaded: v }),
  setDownloading: (v) => set({ downloading: v }),
  setDownloadProgress: (p) => set({ downloadProgress: p }),
  setDownloadedPath: (p) => set({ downloadedPath: p }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  loadUrl: (url, src) =>
    set({
      m3u8Url: url,
      sourceUrl: src || '',
      isLoaded: true,
      downloadedPath: null,
      downloadProgress: null,
      activeTab: 'player',
    }),
}));
