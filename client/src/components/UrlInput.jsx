import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useToast } from './Toast';
import { detectUrl, getVideoInfo, universalDownload, subscribeUniversalProgress } from '../api';
import { colors, radius, shadow, font, transition } from '../theme';

const HISTORY_KEY = 'dimm_url_history';
const MAX_HISTORY = 10;
const SHOW_HISTORY = 5;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToHistory(url) {
  const history = loadHistory().filter((u) => u !== url);
  history.unshift(url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

const styles = {
  wrapper: {
    position: 'relative',
    marginBottom: '16px',
  },
  inputRow: {
    display: 'flex',
    gap: '0',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
    overflow: 'hidden',
    transition: `all ${transition.normal}`,
  },
  inputRowFocus: {
    borderColor: colors.accent,
    boxShadow: `0 0 0 3px ${colors.accentSoft}`,
  },
  inputIcon: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px',
    fontSize: '16px',
    color: colors.textFaint,
  },
  input: {
    flex: 1,
    padding: '16px 12px',
    fontSize: '14px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.text,
    outline: 'none',
    fontFamily: font.stack,
  },
  submitBtn: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    background: colors.gradientDownload,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: `all ${transition.normal}`,
    fontFamily: font.stack,
  },
  clearBtn: {
    position: 'absolute',
    right: '140px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: colors.textFaint,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '50%',
    zIndex: 1,
  },
  privacy: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
    fontSize: '12px',
    color: colors.textFaint,
  },
  historyChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '12px',
  },
  historyChip: {
    padding: '6px 14px',
    fontSize: '12px',
    color: colors.textFaint,
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    maxWidth: '260px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: font.stack,
  },

  videoInfo: {
    marginTop: '16px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
    overflow: 'hidden',
    animation: 'dimm-slide-up 0.3s ease-out',
  },
  videoThumb: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  videoBody: {
    padding: '16px 20px',
  },
  videoTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '6px',
  },
  videoMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: colors.textFaint,
    marginBottom: '12px',
  },
  videoMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  formatList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '160px',
    overflowY: 'auto',
    marginBottom: '14px',
  },
  formatItem: {
    padding: '10px 14px',
    borderRadius: radius.sm,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    transition: `all ${transition.fast}`,
    border: `1px solid transparent`,
  },
  formatItemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  downloadBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
    background: colors.gradientDownload,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: `all ${transition.normal}`,
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: font.stack,
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: colors.borderSoft,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: '10px',
  },
  progressFill: {
    height: '100%',
    background: colors.gradient,
    borderRadius: radius.full,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: colors.textMuted,
    marginTop: '6px',
    textAlign: 'center',
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
  loading: {
    marginTop: '14px',
    color: colors.accent,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  error: {
    marginTop: '12px',
    color: colors.danger,
    fontSize: '13px',
    padding: '12px 16px',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },

  results: {
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  resultItem: {
    padding: '12px 16px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    fontSize: '13px',
  },
};

function extractLabel(url) {
  try {
    const parsed = new URL(url);
    const p = parsed.pathname;
    const parts = p.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || p;
    if (last.length > 60) return last.slice(0, 57) + '\u2026';
    return last || parsed.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

function extractUrlFromText(text) {
  const m = text.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
  if (m) return m[0];
  const any = text.match(/https?:\/\/[^\s"']+/i);
  return any ? any[0] : text.trim();
}

export default function UrlInput({ onLoad }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [speedResults, setSpeedResults] = useState(null);
  const [speedTesting, setSpeedTesting] = useState(false);
  const [directM3u8, setDirectM3u8] = useState('');
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const [videoInfo, setVideoInfo] = useState(null);
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [universalDownloading, setUniversalDownloading] = useState(false);
  const [universalProgress, setUniversalProgress] = useState(null);
  const inputRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    setHistory(loadHistory());
    navigator.clipboard.readText().then((text) => {
      if (text) {
        const url = extractUrlFromText(text);
        if (url && (url.includes('.m3u8') || url.startsWith('http'))) {
          setValue(url);
        }
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setError('');
    setResults([]);
    setSpeedResults(null);
    setVideoInfo(null);
    setFormats([]);
    setSelectedFormat(null);

    setLoading(true);
    try {
      const detection = await detectUrl(trimmed);
      if (detection.type === 'm3u8') {
        setDirectM3u8(trimmed);
        saveToHistory(trimmed);
        setHistory(loadHistory());
        onLoad(trimmed, trimmed);
        setLoading(false);
        return;
      }
      if (detection.type === 'direct-video' || detection.type === 'direct-audio') {
        saveToHistory(trimmed);
        setHistory(loadHistory());
        onLoad(trimmed, trimmed);
        setLoading(false);
        return;
      }
      if (detection.type === 'supported-site' || detection.type === 'webpage') {
        let ytdlpError = null;
        try {
          const info = await getVideoInfo(trimmed);
          setVideoInfo(info);
          if (info.formats && info.formats.length > 0) {
            const filtered = info.formats.filter((f) => f.ext === 'mp4' || f.vcodec !== 'none');
            setFormats(filtered.length > 0 ? filtered : info.formats);
          }
          saveToHistory(trimmed);
          setHistory(loadHistory());
          setLoading(false);
          return;
        } catch (err) {
          ytdlpError = err.message;
        }
        try {
          const resp = await fetch(`/api/extract?url=${encodeURIComponent(trimmed)}`);
          const data = await resp.json();
          if (data.direct && data.urls && data.urls.length > 0) {
            saveToHistory(trimmed);
            setHistory(loadHistory());
            onLoad(data.urls[0], trimmed);
            setLoading(false);
            return;
          }
          if (data.urls && data.urls.length > 0) {
            setResults(data.urls.map((u) => ({ url: u, source: trimmed })));
            saveToHistory(trimmed);
            setHistory(loadHistory());
            setLoading(false);
            return;
          }
          showToast('\u26A0\uFE0F ' + (ytdlpError || 'Не удалось найти видео'), 'error');
        } catch {
          showToast('\u26A0\uFE0F ' + (ytdlpError || 'Не удалось найти видео'), 'error');
        }
        saveToHistory(trimmed);
        setHistory(loadHistory());
        setLoading(false);
        return;
      }
      const resp = await fetch(`/api/extract?url=${encodeURIComponent(trimmed)}`);
      const data = await resp.json();
      if (data.error && (!data.urls || data.urls.length === 0)) {
        showToast(data.error, 'error');
        setLoading(false);
        return;
      }
      if (data.direct && data.urls && data.urls.length > 0) {
        saveToHistory(trimmed);
        setHistory(loadHistory());
        onLoad(data.urls[0], trimmed);
        setLoading(false);
        return;
      }
      if (data.urls && data.urls.length > 0) {
        setResults(data.urls.map((u) => ({ url: u, source: trimmed })));
      } else {
        showToast('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 \u0432\u0438\u0434\u0435\u043E', 'error');
      }
    } catch (err) {
      showToast('\u274C ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUniversalDownload = async () => {
    if (!videoInfo) return;
    setUniversalDownloading(true);
    setUniversalProgress(null);
    try {
      const result = await universalDownload(videoInfo.webpage_url || value, selectedFormat, `${videoInfo.title || 'video'}.mp4`);
      if (result.id) {
        const unsub = subscribeUniversalProgress(result.id, (p) => {
          setUniversalProgress(p);
          if (p.status === 'done' || p.status === 'error') {
            unsub();
            setUniversalDownloading(false);
            if (p.status === 'done') showToast('\u2705 \u0412\u0438\u0434\u0435\u043E \u0441\u043A\u0430\u0447\u0430\u043D\u043E!', 'success');
          }
        });
      } else if (result.ok) {
        setUniversalDownloading(false);
        showToast('\u2705 \u0412\u0438\u0434\u0435\u043E \u0441\u043A\u0430\u0447\u0430\u043D\u043E!', 'success');
      }
    } catch (err) {
      showToast('\u274C ' + err.message, 'error');
      setUniversalDownloading(false);
    }
  };

  const handleSelect = (item) => {
    saveToHistory(item.url);
    setHistory(loadHistory());
    onLoad(item.url, item.source || '');
    setResults([]);
    setSpeedResults(null);
  };

  const handleHistoryClick = (url) => {
    setValue(url);
    setResults([]);
    setSpeedResults(null);
    setError('');
    setVideoInfo(null);
    onLoad(url, url);
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit}>
        <div
          style={{ ...styles.inputRow, ...(focused ? styles.inputRowFocus : {}) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <div style={styles.inputIcon}>{'\uD83D\uDD17'}</div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setResults([]); setError(''); setVideoInfo(null); }}
            placeholder={'\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0432\u0438\u0434\u0435\u043E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: https://www.youtube.com/watch?v=...'}
            spellCheck={false}
            style={styles.input}
          />
          {value && (
            <button type="button" onClick={() => { setValue(''); inputRef.current?.focus(); setVideoInfo(null); }} style={styles.clearBtn}>
              {'\u2715'}
            </button>
          )}
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? <span style={styles.spinner} /> : <span>{'\u2B07\uFE0F'}</span>}
            {loading ? '\u041F\u043E\u0438\u0441\u043A\u2026' : '\u0421\u043A\u0430\u0447\u0430\u0442\u044C'}
          </button>
        </div>
      </form>

      <div style={styles.privacy}>
        <span>{'\uD83D\uDD12'}</span>
        {'\u041C\u044B \u043D\u0435 \u0445\u0440\u0430\u043D\u0438\u043C \u0432\u0430\u0448\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043D\u0435 \u043D\u0430\u0440\u0443\u0448\u0430\u0435\u043C \u0430\u0432\u0442\u043E\u0440\u0441\u043A\u0438\u0435 \u043F\u0440\u0430\u0432\u0430'}
      </div>

      {history.length > 0 && !value && !loading && !results.length && !error && !videoInfo && (
        <div style={styles.historyChips}>
          {history.slice(0, SHOW_HISTORY).map((url, idx) => (
            <button key={idx} onClick={() => handleHistoryClick(url)} style={styles.historyChip} title={url}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.borderCard; e.currentTarget.style.color = colors.textFaint; }}>
              {extractLabel(url)}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={styles.loading}>
          <span style={styles.spinner} />
          {'\u041F\u0430\u0440\u0441\u0438\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443\u2026'}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {results.length > 1 && (
        <div style={styles.results}>
          <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 4px' }}>
            {'\u041D\u0430\u0439\u0434\u0435\u043D\u043E ' + results.length + ' \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432:'}
          </p>
          {results.map((item, idx) => (
            <div key={idx} onClick={() => handleSelect(item)} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ ...styles.resultItem, borderColor: hoveredIdx === idx ? colors.accent : colors.borderCard, backgroundColor: hoveredIdx === idx ? colors.surfaceHover : colors.surfaceCard }}>
              <div style={{ color: colors.text }}>{extractLabel(item.url)}</div>
              <div style={{ color: colors.textFaint, fontSize: '11px', marginTop: '2px' }}>{'\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F'}</div>
            </div>
          ))}
        </div>
      )}

      {videoInfo && (
        <div style={styles.videoInfo}>
          {videoInfo.thumbnail && <img src={videoInfo.thumbnail} alt="" style={styles.videoThumb} />}
          <div style={styles.videoBody}>
            <div style={styles.videoTitle}>{videoInfo.title || '\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F'}</div>
            <div style={styles.videoMeta}>
              {videoInfo.uploader && <span style={styles.videoMetaItem}>{'\uD83D\uDC64'} {videoInfo.uploader}</span>}
              {videoInfo.duration && <span style={styles.videoMetaItem}>{'\u23F1'} {formatDuration(videoInfo.duration)}</span>}
              {videoInfo.extractor && <span style={styles.videoMetaItem}>{videoInfo.extractor}</span>}
            </div>

            {formats.length > 0 && (
              <div style={styles.formatList}>
                {formats.map((f, idx) => (
                  <div key={idx} onClick={() => setSelectedFormat(f.formatId)}
                    style={{ ...styles.formatItem, ...(selectedFormat === f.formatId ? styles.formatItemActive : {}), backgroundColor: selectedFormat === f.formatId ? colors.accentSoft : colors.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: colors.text }}>{f.resolution || '\u0430\u0443\u0434\u0438\u043E'}</span>
                      {f.fps && <span style={{ color: colors.textFaint }}>{f.fps}fps</span>}
                      {f.vcodec && f.vcodec !== 'none' && <span style={{ color: colors.textFaint }}>{f.vcodec}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {f.filesize && <span style={{ color: colors.textFaint }}>{formatSize(f.filesize)}</span>}
                      <span style={{ color: colors.accent, fontWeight: 600, fontSize: '11px' }}>{f.formatId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleUniversalDownload} disabled={universalDownloading}
              style={{ ...styles.downloadBtn, opacity: universalDownloading ? 0.6 : 1, cursor: universalDownloading ? 'not-allowed' : 'pointer' }}>
              {universalDownloading ? '\u23F3 \u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435\u2026' : '\u2B07 \u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0432\u0438\u0434\u0435\u043E'}
            </button>

            {universalDownloading && universalProgress && (
              <div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${universalProgress.percent || 0}%` }} />
                </div>
                <div style={styles.progressText}>
                  {Math.round(universalProgress.percent || 0)}%
                  {universalProgress.speed ? ` \u00B7 ${universalProgress.speed}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

UrlInput.propTypes = { onLoad: PropTypes.func.isRequired };
