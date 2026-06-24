import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { colors, radius, transition } from '../theme';

const HISTORY_KEY = 'dimm_download_history';
const MAX_HISTORY = 50;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveToHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '\u2014';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const styles = {
  title: { fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: {
    padding: '14px 16px', backgroundColor: colors.surfaceCard, border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
    animation: 'dimm-slide-up 0.3s ease-out',
  },
  name: { color: colors.text, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  meta: { fontSize: '11px', color: colors.textFaint, marginTop: '4px' },
  actions: { display: 'flex', gap: '6px', flexShrink: 0 },
  btn: { padding: '7px 14px', fontSize: '11px', fontWeight: 500, border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontFamily: 'inherit', transition: `all ${transition.fast}` },
  openBtn: { background: colors.gradientDownload, color: '#fff' },
  folderBtn: { backgroundColor: colors.surfaceCard, color: colors.textMuted, border: `1px solid ${colors.borderCard}` },
  empty: { textAlign: 'center', color: colors.textFaint, fontSize: '13px', padding: '40px 20px' },
  emptyIcon: { fontSize: '36px', marginBottom: '12px', opacity: 0.5 },
};

export default function DownloadsPanel() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const isElectron = useAppStore((s) => s.isElectron);

  useEffect(() => {
    if (!isElectron) return;
    setLoading(true);
    window.electronAPI.getDownloads().then((r) => setFiles(r || [])).catch(() => setFiles([])).finally(() => setLoading(false));
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const unsub = window.electronAPI.onDownloadCompleted?.((info) => {
      if (info && info.ok) { saveToHistory({ name: info.name, size: info.size, url: info.url, date: Date.now(), path: info.outputPath }); }
    });
    return () => unsub && unsub();
  }, [isElectron]);

  if (!isElectron) return <div style={styles.empty}><div style={styles.emptyIcon}>{'\uD83D\uDCC1'}</div>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0434\u0435\u0441\u043A\u0442\u043E\u043F\u043D\u043E\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438'}</div>;
  if (loading) return <div style={styles.empty}><div style={styles.emptyIcon}>{'\u23F3'}</div>{'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026'}</div>;
  if (files.length === 0) return <div style={styles.empty}><div style={styles.emptyIcon}>{'\uD83C\uDFAC'}</div>{'\u041D\u0435\u0442 \u0441\u043A\u0430\u0447\u0430\u043D\u043D\u044B\u0445 \u0432\u0438\u0434\u0435\u043E'}</div>;

  return (
    <div>
      <div style={styles.title}>{'\uD83D\uDCC1 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438'} ({files.length})</div>
      <div style={styles.list}>
        {files.map((file, idx) => (
          <div key={idx} style={styles.card}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.name}>{'\uD83C\uDFAC'} {file.name}</div>
              <div style={styles.meta}>{formatSize(file.size)}</div>
            </div>
            <div style={styles.actions}>
              <button onClick={() => window.electronAPI.openFile(file.path)} style={{ ...styles.btn, ...styles.openBtn }}>{'\u25B6 \u041E\u0442\u043A\u0440\u044B\u0442\u044C'}</button>
              <button onClick={() => window.electronAPI.showItem(file.path)} style={{ ...styles.btn, ...styles.folderBtn }}>{'\uD83D\uDCC2 \u041F\u0430\u043F\u043A\u0430'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
