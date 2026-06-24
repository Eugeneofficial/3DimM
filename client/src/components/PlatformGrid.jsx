import React from 'react';
import { colors, radius, transition, platforms } from '../theme';

const styles = {
  section: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text,
  },
  seeAll: {
    fontSize: '12px',
    color: colors.accent,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
    cursor: 'pointer',
    transition: `all ${transition.normal}`,
    minWidth: '80px',
    animation: 'dimm-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  name: {
    fontSize: '11px',
    fontWeight: 500,
    color: colors.textMuted,
    whiteSpace: 'nowrap',
  },
};

export default function PlatformGrid() {
  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <span style={styles.title}>{'\uD83C\uDF10 \u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0435 \u0441\u0430\u0439\u0442\u044B'}</span>
        <button style={styles.seeAll}>{'\u0412\u0441\u0435 \u0441\u0430\u0439\u0442\u044B \u2192'}</button>
      </div>
      <div style={styles.grid}>
        {platforms.map((p, idx) => (
          <div
            key={p.name}
            style={{ ...styles.card, animationDelay: `${idx * 60}ms`, cursor: p.url ? 'pointer' : 'default' }}
            onClick={() => p.url && window.open(p.url, '_blank')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = p.color + '50';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 4px 20px ${p.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.borderCard;
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ ...styles.icon, backgroundColor: p.bg }}>{p.icon}</div>
            <span style={styles.name}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
