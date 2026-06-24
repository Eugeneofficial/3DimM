import React, { useEffect, useCallback, useState, useRef, Suspense } from 'react';
const VideoPlayer = React.lazy(() => import('./components/VideoPlayer'));
import UrlInput from './components/UrlInput';
import Sidebar from './components/Sidebar';
import PlatformGrid from './components/PlatformGrid';
import FeatureCards from './components/FeatureCards';
import DownloadsPanel from './components/DownloadsPanel';
import { useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store';
import { getTracks } from './api';
import { useQueueStore } from './queueStore';
import QueuePanel from './components/QueuePanel';
import SettingsPanel from './components/SettingsPanel';
import { colors, radius, shadow, font, transition } from './theme';
import { getRandomMessage } from './funMessages';

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: colors.bg,
    fontFamily: font.stack,
    color: colors.text,
  },
  main: {
    flex: 1,
    marginLeft: '240px',
    padding: '32px 40px',
    maxWidth: '900px',
    minHeight: '100vh',
  },
  hero: {
    marginBottom: '28px',
    animation: 'dimm-fade-in 0.6s ease-out',
  },
  heroTitle: {
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: '8px',
  },
  heroTitleAccent: {
    color: colors.accent,
  },
  heroSub: {
    fontSize: '14px',
    color: colors.textFaint,
    lineHeight: 1.5,
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: `1px solid ${colors.borderSoft}`,
  },
  tab: {
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: colors.textFaint,
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    marginBottom: '-1px',
    fontFamily: font.stack,
  },
  tabActive: {
    color: colors.text,
    borderBottomColor: colors.accent,
    fontWeight: 600,
  },
  downloadSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginTop: '16px',
  },
  downloadBtn: {
    padding: '12px 28px',
    fontSize: '14px',
    fontWeight: 600,
    background: colors.gradientDownload,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: `all ${transition.normal}`,
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    fontFamily: font.stack,
  },
  downloadBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  actionBtn: {
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    fontFamily: font.stack,
  },
  progressContainer: {
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: colors.borderSoft,
    borderRadius: radius.full,
    overflow: 'hidden',
    boxShadow: shadow.inner,
  },
  progressBarFill: {
    height: '100%',
    background: colors.gradient,
    borderRadius: radius.full,
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: shadow.progress,
  },
  progress: {
    color: colors.textMuted,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  funMessage: {
    fontSize: '13px',
    color: colors.textFaint,
    fontStyle: 'italic',
    animation: 'dimm-fade-in 0.3s ease',
    textAlign: 'center',
  },
  successMsg: {
    color: colors.success,
    fontWeight: 500,
    fontSize: '13px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: `2px solid ${colors.borderSoft}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'dimm-spin 0.7s linear infinite',
  },
  trackRow: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  trackLabel: {
    fontSize: '12px',
    color: colors.textFaint,
    fontWeight: 500,
  },
  trackSelect: {
    padding: '8px 14px',
    fontSize: '13px',
    backgroundColor: colors.surfaceSolid,
    color: colors.text,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontFamily: font.stack,
    outline: 'none',
  },
  dragOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    backdropFilter: 'blur(4px)',
    border: `3px dashed ${colors.accent}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
    pointerEvents: 'none',
  },
  dragText: {
    color: colors.accent,
    fontSize: '20px',
    fontWeight: 700,
    padding: '20px 40px',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    border: `1px solid ${colors.borderGlow}`,
  },
  supportedSites: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
  },
  supportedTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '12px',
  },
  supportedList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  supportedTag: {
    padding: '6px 14px',
    fontSize: '12px',
    color: colors.textMuted,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.full,
  },
  emptyHint: {
    textAlign: 'center',
    padding: '40px 0',
    color: colors.textFaint,
    fontSize: '14px',
  },
};

const supportedSitesList = [
  'YouTube', 'TikTok', 'Twitter / X', 'Instagram', 'Facebook', 'Twitch',
  'VK Video', 'OK.ru', 'Rutube', 'Reddit', 'Vimeo', 'Dailymotion',
  'SoundCloud', 'Telegram', 'Discord', 'Pinterest', 'Tumblr', 'Flickr',
  'Bandcamp', 'Break.com', 'Crunchyroll', 'Dailymotion', 'Facebook',
  'Flickr', 'IGN', 'Imgur', 'Kickstarter', 'LinkedIn', 'Medium',
  'Niconico', 'Odysee', 'OnlyFans', 'PeerTube', 'Pinterest', 'PornHub',
  'Rumble', 'Streamable', 'Twitch', 'Twitter/X', 'Vimeo', 'Vine',
  'VK', 'XboxClips', 'YouTube', 'TikTok', 'Instagram Reels', 'Snapchat',
];

function extractUrlFromText(text) {
  const m = text.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
  if (m) return m[0];
  const any = text.match(/https?:\/\/[^\s"']+/i);
  return any ? any[0] : text.trim();
}

export default function App() {
  const {
    m3u8Url, sourceUrl, isLoaded, downloading, downloadProgress, downloadedPath, activeTab,
    isElectron, loadUrl, setDownloading, setDownloadProgress, setDownloadedPath, setActiveTab,
  } = useAppStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [funMessage, setFunMessage] = useState('');
  const funTimerRef = useRef(null);
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const showToast = useToast();

  useEffect(() => {
    if (downloading) {
      setFunMessage(getRandomMessage(downloadProgress ? 'processing' : 'downloading'));
      funTimerRef.current = setInterval(() => {
        setFunMessage(getRandomMessage(downloadProgress ? 'processing' : 'downloading'));
      }, 3500);
      return () => clearInterval(funTimerRef.current);
    } else {
      setFunMessage('');
      if (funTimerRef.current) clearInterval(funTimerRef.current);
    }
  }, [downloading, downloadProgress]);

  useEffect(() => {
    if (!m3u8Url) return;
    setTracks([]);
    setSelectedTrack(null);
    getTracks(m3u8Url).then((data) => {
      if (data.tracks && data.tracks.length > 0) setTracks(data.tracks);
    }).catch(() => {});
  }, [m3u8Url]);

  const handleLoad = (url, src) => { loadUrl(url, src); };

  const handleDownload = useCallback(async () => {
    if (!m3u8Url) return;
    setDownloading(true);
    setDownloadProgress(null);
    let evtSource = null;
    try {
      let downloadUrl = m3u8Url;
      if (sourceUrl && !m3u8Url.includes('.m3u8')) {
        try {
          const refreshResp = await fetch(`/api/refresh?url=${encodeURIComponent(sourceUrl)}&source=player-iframe`);
          const refreshData = await refreshResp.json();
          if (refreshData.url) downloadUrl = refreshData.url;
        } catch {}
      }
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl, filename: `video_${Date.now()}.mp4` }),
      });
      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try { const err = await response.json(); errMsg = err.error || errMsg; } catch {}
        showToast(errMsg, 'error');
        return;
      }
      const data = await response.json();
      if (data.id) {
        evtSource = new EventSource(`/api/download/progress?id=${data.id}`);
        evtSource.onmessage = (e) => {
          try {
            const p = JSON.parse(e.data);
            if (p.status === 'done' || p.status === 'error') { evtSource.close(); setDownloadProgress(null); return; }
            setDownloadProgress(p);
          } catch {}
        };
        evtSource.onerror = () => { evtSource.close(); };
      }
      if (isElectron && data && data.path) {
        const result = await window.electronAPI.saveFile(null, data.name || `video_${Date.now()}.mp4`, data.path);
        if (!result || result.canceled) showToast('\u041E\u0442\u043C\u0435\u043D\u0430', 'info');
        else showToast('\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E', 'success');
        setDownloadedPath(data.path);
      } else {
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'video.mp4';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('\u0412\u0438\u0434\u0435\u043E \u0441\u043A\u0430\u0447\u0430\u043D\u043E', 'success');
      }
    } catch (err) {
      showToast('\u274C ' + err.message, 'error');
    } finally {
      if (evtSource) evtSource.close();
      setDownloading(false);
      setDownloadProgress(null);
    }
  }, [m3u8Url, sourceUrl, isElectron, showToast, setDownloading, setDownloadProgress, setDownloadedPath]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); if (m3u8Url && !downloading) handleDownload(); }
      if (e.key === 'Escape') setIsDragOver(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [m3u8Url, downloading, handleDownload]);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) { const url = extractUrlFromText(text); if (url) { handleLoad(url, url); return; } }
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].name.endsWith('.m3u8')) {
      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) { const url = extractUrlFromText(lines[0]); handleLoad(url, url); }
      };
      reader.readAsText(files[0]);
    }
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'home':
        return (
          <>
            <div style={styles.hero}>
              <div style={styles.heroTitle}>
                {'\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u0439\u0442\u0435 '}<span style={styles.heroTitleAccent}>{'\u0432\u0438\u0434\u0435\u043E'}</span>
                <br />{'\u0441 \u043B\u044E\u0431\u044B\u0445 \u0441\u0430\u0439\u0442\u043E\u0432'}
              </div>
              <div style={styles.heroSub}>
                {'\u041F\u0440\u043E\u0441\u0442\u043E \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0432\u0438\u0434\u0435\u043E, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u0445\u043E\u0442\u0438\u0442\u0435 \u0441\u043A\u0430\u0447\u0430\u0442\u044C'}
              </div>
            </div>

            <UrlInput onLoad={handleLoad} />

            <PlatformGrid />

            <FeatureCards />

            {isLoaded && (
              <div>
                <div style={styles.tabs}>
                  <button onClick={() => setActiveTab('player')} style={{ ...styles.tab, ...(activeTab === 'player' ? styles.tabActive : {}) }}>
                    {'\u041F\u043B\u0435\u0435\u0440'}
                  </button>
                  <button onClick={() => setActiveTab('downloads')} style={{ ...styles.tab, ...(activeTab === 'downloads' ? styles.tabActive : {}) }}>
                    {'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438'}
                  </button>
                </div>

                {activeTab === 'player' && (
                  <div>
                    <Suspense fallback={<div style={{ color: colors.textFaint, fontSize: '14px', padding: '40px', textAlign: 'center', backgroundColor: colors.surfaceCard, borderRadius: radius.lg, border: `1px solid ${colors.borderCard}` }}>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u043B\u0435\u0435\u0440\u0430\u2026'}</div>}>
                      <ErrorBoundary>
                        <VideoPlayer url={m3u8Url} />
                      </ErrorBoundary>
                    </Suspense>

                    {tracks.length > 0 && (
                      <div style={styles.trackRow}>
                        <span style={styles.trackLabel}>{'\uD83C\uDFB5 \u0414\u043E\u0440\u043E\u0436\u043A\u0438:'}</span>
                        <select value={selectedTrack || ''} onChange={(e) => { setSelectedTrack(e.target.value); if (e.target.value) handleLoad(e.target.value, m3u8Url); }} style={styles.trackSelect}>
                          {tracks.map((t, i) => (
                            <option key={i} value={t.url}>{t.name || t.resolution || `Track ${i + 1}`}{t.type === 'video' && t.resolution ? ` (${t.resolution})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={styles.downloadSection}>
                      <button onClick={handleDownload} disabled={downloading} style={{ ...styles.downloadBtn, ...(downloading ? styles.downloadBtnDisabled : {}) }}>
                        {downloading ? '\u23F3 \u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435\u2026' : '\u2B07\uFE0F \u0421\u043A\u0430\u0447\u0430\u0442\u044C MP4'}
                      </button>
                      <button onClick={() => { addToQueue(m3u8Url, `video_${Date.now()}.mp4`); showToast('\uD83D\uDCE6 \u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438', 'info'); }} style={styles.actionBtn}>
                        {'+ \u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u044C'}
                      </button>
                    </div>

                    {downloading && downloadProgress && (
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBarBg}>
                          <div style={{ ...styles.progressBarFill, width: `${downloadProgress.percent || 0}%` }} />
                        </div>
                        <p style={styles.progress}>
                          {Math.round(downloadProgress.percent || 0)}%
                          {downloadProgress.speed ? ` \u00B7 ${downloadProgress.speed}` : ''}
                        </p>
                        {funMessage && <p style={styles.funMessage}>{funMessage}</p>}
                      </div>
                    )}

                    {downloading && !downloadProgress && (
                      <div style={styles.progressContainer}>
                        <p style={styles.progress}><span style={styles.spinner} /> {'\u041A\u043E\u043D\u0432\u0435\u0440\u0442\u0438\u0440\u0443\u0435\u043C \u0432 \u0432\u0438\u0434\u0435\u043E\u2026'}</p>
                        {funMessage && <p style={styles.funMessage}>{funMessage}</p>}
                      </div>
                    )}

                    {downloadedPath && !downloading && (
                      <p style={styles.successMsg}>{'\u2705 \u0413\u043E\u0442\u043E\u0432\u043E!'} {getRandomMessage('success')}</p>
                    )}

                    <QueuePanel />
                  </div>
                )}

                {activeTab === 'downloads' && <DownloadsPanel />}
              </div>
            )}

            {!isLoaded && (
              <div style={styles.emptyHint}>
                {'\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u044B\u0448\u0435, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C'}
              </div>
            )}
          </>
        );

      case 'downloads':
        return <DownloadsPanel />;

      case 'history':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '16px' }}>{'\uD83D\uDD52 \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043E\u043A'}</h2>
            <DownloadsPanel />
          </div>
        );

      case 'favorites':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '16px' }}>{'\u2B50 \u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435'}</h2>
            <div style={{ color: colors.textFaint, fontSize: '14px', padding: '40px', textAlign: 'center' }}>
              {'\u0421\u043A\u043E\u0440\u043E \u0437\u0434\u0435\u0441\u044C \u0431\u0443\u0434\u0435\u0442 \u0432\u0430\u0448\u0430 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044F \u0432\u0438\u0434\u0435\u043E'}
            </div>
          </div>
        );

      case 'sites':
        return (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, marginBottom: '16px' }}>{'\uD83C\uDF10 \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u0441\u0430\u0439\u0442\u044B'}</h2>
            <div style={styles.supportedSites}>
              <div style={styles.supportedList}>
                {[...new Set(supportedSitesList)].map((site, idx) => (
                  <span key={idx} style={styles.supportedTag}>{site}</span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div>
            <SettingsPanel />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.layout} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragOver && (
        <div style={styles.dragOverlay}>
          <span style={styles.dragText}>{'\uD83D\uDCE4'} {'\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443'}</span>
        </div>
      )}

      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <main style={styles.main}>
        {renderContent()}
      </main>
    </div>
  );
}
