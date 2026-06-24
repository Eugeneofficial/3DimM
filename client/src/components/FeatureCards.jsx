import React from 'react';
import { colors, radius, shadow, transition, features } from '../theme';

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '32px',
  },
  card: {
    padding: '20px 16px',
    backgroundColor: colors.surfaceCard,
    border: `1px solid ${colors.borderCard}`,
    borderRadius: radius.lg,
    transition: `all ${transition.normal}`,
    cursor: 'default',
  },
  icon: {
    fontSize: '24px',
    marginBottom: '10px',
    display: 'block',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '6px',
  },
  desc: {
    fontSize: '12px',
    color: colors.textFaint,
    lineHeight: 1.5,
  },
};

export default function FeatureCards() {
  return (
    <div style={styles.grid}>
      {features.map((f, idx) => (
        <div
          key={idx}
          style={styles.card}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.accent + '30';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadow.glow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.borderCard;
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={styles.icon}>{f.icon}</span>
          <div style={styles.title}>{f.title}</div>
          <div style={styles.desc}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}
