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

export default function Sidebar({ activeNav, onNavChange, className }) {
  return (
    <div style={styles.sidebar} className={className}>
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

      <div style={{ marginTop: 'auto', padding: '16px', borderTop: `1px solid ${colors.borderSoft}` }}>
        <div style={{ fontSize: '11px', color: colors.textFaint, textAlign: 'center', lineHeight: 1.5 }}>
          {'\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u0439\u0442\u0435 \u0432\u0438\u0434\u0435\u043E \u0441 1000+ \u0441\u0430\u0439\u0442\u043E\u0432 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E'}
        </div>
      </div>
    </div>
  );
}
