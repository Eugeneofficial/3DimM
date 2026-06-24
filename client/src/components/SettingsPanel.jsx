import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useToast } from './Toast';
import { colors, radius, shadow, font, transition } from '../theme';

const styles = {
  container: {
    marginTop: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '20px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
    gap: '16px',
    padding: '14px 16px',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    border: `1px solid ${colors.borderCard}`,
  },
  label: {
    fontSize: '13px',
    color: colors.textMuted,
    flex: '0 0 180px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  labelIcon: {
    fontSize: '16px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '13px',
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.sm,
    fontFamily: font.stack,
    outline: 'none',
  },
  select: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '13px',
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.sm,
    fontFamily: font.stack,
    cursor: 'pointer',
    outline: 'none',
  },
  browseBtn: {
    padding: '10px 18px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    border: `1px solid ${colors.accent}30`,
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontFamily: font.stack,
  },
  saveBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    background: colors.gradientDownload,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    fontFamily: font.stack,
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
  },
  pathPreview: {
    marginTop: '4px',
    marginBottom: '14px',
    padding: '10px 14px',
    fontSize: '12px',
    color: colors.textFaint,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    border: `1px solid ${colors.borderSoft}`,
    fontFamily: font.mono,
    wordBreak: 'break-all',
  },
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState({ downloadsPath: '', maxConcurrent: 2, port: 3001 });
  const isElectron = useAppStore((s) => s.isElectron);
  const showToast = useToast();

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.getSettings().then(setSettings).catch(() => {});
  }, [isElectron]);

  const handleSave = async () => {
    if (!isElectron) return;
    try { await window.electronAPI.setSettings(settings); showToast('\u2705 \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E', 'success'); }
    catch { showToast('\u274C \u041E\u0448\u0438\u0431\u043A\u0430', 'error'); }
  };

  const handleBrowse = async () => {
    if (!isElectron) return;
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setSettings((s) => ({ ...s, downloadsPath: dir }));
  };

  if (!isElectron) {
    return <div style={{ color: colors.textFaint, fontSize: '13px', padding: '20px', textAlign: 'center' }}>{'\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0434\u0435\u0441\u043A\u0442\u043E\u043F\u043D\u043E\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438'}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>{'\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438'}</div>

      <div style={styles.row}>
        <span style={styles.label}><span style={styles.labelIcon}>{'\uD83D\uDCC1'}</span>{'\u041F\u0430\u043F\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043E\u043A'}</span>
        <button onClick={handleBrowse} style={styles.browseBtn}>{'\u041E\u0431\u0437\u043E\u0440\u2026'}</button>
      </div>
      {settings.downloadsPath && <div style={styles.pathPreview}>{settings.downloadsPath}</div>}

      <div style={styles.row}>
        <span style={styles.label}><span style={styles.labelIcon}>{'\u26A1'}</span>{'\u041C\u0430\u043A\u0441. \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0445'}</span>
        <select value={settings.maxConcurrent} onChange={(e) => setSettings((s) => ({ ...s, maxConcurrent: parseInt(e.target.value) }))} style={styles.select}>
          <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={5}>5</option>
        </select>
      </div>

      <div style={styles.row}>
        <span style={styles.label}><span style={styles.labelIcon}>{'\uD83D\uDD0C'}</span>{'\u041F\u043E\u0440\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0430'}</span>
        <input type="number" value={settings.port} onChange={(e) => setSettings((s) => ({ ...s, port: parseInt(e.target.value) || 3001 }))} style={styles.input} min={1024} max={65535} />
      </div>

      <button onClick={handleSave} style={styles.saveBtn}>{'\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C'}</button>
    </div>
  );
}
