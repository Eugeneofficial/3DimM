import React from 'react';
import { useQueueStore } from '../queueStore';
import { colors, radius, transition } from '../theme';

const statusConfig = {
  pending: { icon: '\u23F3', color: colors.textFaint },
  downloading: { icon: '\u2B07\uFE0F', color: colors.accent },
  done: { icon: '\u2705', color: colors.success },
  error: { icon: '\u274C', color: colors.danger },
};

const styles = {
  container: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '13px',
    color: colors.textMuted,
    fontWeight: 600,
  },
  clearBtn: {
    fontSize: '11px',
    color: colors.textFaint,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  item: {
    padding: '10px 14px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  name: {
    color: colors.text,
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  statusArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '11px',
    fontWeight: 500,
  },
  miniProgress: {
    width: '50px',
    height: '3px',
    backgroundColor: colors.borderSoft,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    background: colors.gradient,
    borderRadius: radius.full,
    transition: 'width 0.3s ease',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: colors.textFaint,
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: radius.sm,
  },
};

export default function QueuePanel() {
  const queue = useQueueStore((s) => s.queue);
  const clearDone = useQueueStore((s) => s.clearDone);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);

  if (queue.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>{'\uD83D\uDCCB \u041E\u0447\u0435\u0440\u0435\u0434\u044C'} ({queue.length})</span>
        <button onClick={clearDone} style={styles.clearBtn}>{'\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C'}</button>
      </div>
      <div style={styles.list}>
        {queue.map((item) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          return (
            <div key={item.id} style={styles.item}>
              <span style={styles.name}>{item.filename}</span>
              <div style={styles.statusArea}>
                {item.status === 'downloading' && item.progress && (
                  <div style={styles.miniProgress}>
                    <div style={{ ...styles.miniProgressFill, width: `${item.progress.percent || 0}%` }} />
                  </div>
                )}
                <span style={{ ...styles.statusText, color: cfg.color }}>
                  {cfg.icon} {item.status === 'downloading' && item.progress ? `${Math.round(item.progress.percent || 0)}%` : ''}
                </span>
                {item.status === 'pending' && <button onClick={() => removeFromQueue(item.id)} style={styles.removeBtn}>{'\u2715'}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
