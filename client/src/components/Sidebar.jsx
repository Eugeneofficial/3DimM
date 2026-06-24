import React from 'react';
import { colors, radius, transition, navItems } from '../theme';

const styles = {
  sidebar: {
    width: '220px',
    height: '100vh',
    backgroundColor: colors.sidebar,
    borderRight: `1px solid ${colors.borderSoft}`,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    padding: '24px 12px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 12px 28px',
    borderBottom: `1px solid ${colors.borderSoft}`,
    marginBottom: '20px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: radius.md,
    background: colors.gradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#fff',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '14px',
    fontWeight: 700,
    color: colors.text,
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '11px',
    color: colors.textFaint,
    fontWeight: 400,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: radius.md,
    cursor: 'pointer',
    transition: `all ${transition.fast}`,
    fontSize: '13px',
    color: colors.textMuted,
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  navItemActive: {
    backgroundColor: colors.sidebarActive,
    color: colors.accentBright,
    fontWeight: 600,
  },
  navIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  premium: {
    marginTop: 'auto',
    padding: '20px',
    borderRadius: radius.lg,
    background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.08) 100%)',
    border: `1px solid ${colors.premium}20`,
  },
  premiumIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  premiumTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '8px',
  },
  premiumFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
  },
  premiumFeature: {
    fontSize: '11px',
    color: colors.textFaint,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  premiumBtn: {
    width: '100%',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 600,
    background: colors.gradient,
    color: '#fff',
    border: 'none',
    borderRadius: radius.sm,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    fontSize: '12px',
    color: colors.textFaint,
    borderTop: `1px solid ${colors.borderSoft}`,
    marginTop: '16px',
  },
};

export default function Sidebar({ activeNav, onNavChange }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>{'\u2B07\uFE0F'}</div>
        <div>
          <div style={styles.logoText}>Video</div>
          <div style={styles.logoText}>Downloader</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            style={{
              ...styles.navItem,
              ...(activeNav === item.id ? styles.navItemActive : {}),
            }}
            onMouseEnter={(e) => {
              if (activeNav !== item.id) e.currentTarget.style.backgroundColor = colors.sidebarHover;
            }}
            onMouseLeave={(e) => {
              if (activeNav !== item.id) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={styles.premium}>
        <div style={styles.premiumIcon}>{'\uD83D\uDC51'}</div>
        <div style={styles.premiumTitle}>{'\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 Premium'}</div>
        <div style={styles.premiumFeatures}>
          <div style={styles.premiumFeature}>{'\u2713'} {'\u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442\u043D\u044B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438'}</div>
          <div style={styles.premiumFeature}>{'\u2713'} {'\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432 8K/4K'}</div>
          <div style={styles.premiumFeature}>{'\u2713'} {'\u0411\u0435\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u044B'}</div>
          <div style={styles.premiumFeature}>{'\u2713'} {'\u0412\u044B\u0441\u043E\u043A\u0430\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C'}</div>
        </div>
        <button style={styles.premiumBtn}>{'\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E'}</button>
      </div>
    </div>
  );
}
