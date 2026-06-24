export const colors = {
  bg: '#0b0e1a',
  bgGradient: 'linear-gradient(135deg, #0b0e1a 0%, #111827 100%)',
  sidebar: '#10131f',
  sidebarHover: '#1a1d2e',
  sidebarActive: 'rgba(99, 102, 241, 0.12)',
  surface: 'rgba(17, 24, 39, 0.8)',
  surfaceSolid: '#141824',
  surfaceHover: 'rgba(26, 29, 46, 0.9)',
  surfaceGlass: 'rgba(255, 255, 255, 0.03)',
  surfaceCard: '#131620',
  border: 'rgba(55, 65, 81, 0.5)',
  borderSoft: 'rgba(55, 65, 81, 0.3)',
  borderCard: 'rgba(55, 65, 81, 0.4)',
  borderGlow: 'rgba(99, 102, 241, 0.3)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  accent: '#6366f1',
  accentHover: '#818cf8',
  accentSoft: 'rgba(99, 102, 241, 0.12)',
  accentGlow: 'rgba(99, 102, 241, 0.4)',
  accentBright: '#818cf8',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
  gradientDownload: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  gradientSubtle: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(168,85,247,0.15) 100%)',
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.1)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.1)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.1)',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  card: '0 4px 24px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  cardHover: '0 8px 32px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
  glow: '0 0 20px rgba(99, 102, 241, 0.15)',
  glowStrong: '0 0 30px rgba(99, 102, 241, 0.25)',
  accent: '0 0 0 3px rgba(99, 102, 241, 0.2)',
  inner: 'inset 0 1px 2px rgba(0,0,0,0.2)',
  glass: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
  progress: '0 0 8px rgba(99, 102, 241, 0.4)',
};

export const font = {
  stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
};

export const transition = {
  fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export const platforms = [
  { name: 'YouTube', icon: '\uD83C\uDFA5', color: '#FF0000', bg: 'rgba(255,0,0,0.12)', url: 'https://youtube.com' },
  { name: 'Instagram', icon: '\uD83D\uDCF7', color: '#E4405F', bg: 'rgba(228,64,95,0.12)', url: 'https://instagram.com' },
  { name: 'TikTok', icon: '\uD83C\uDFB5', color: '#00F2EA', bg: 'rgba(0,242,234,0.12)', url: 'https://tiktok.com' },
  { name: 'Facebook', icon: '\uD83D\uDC68\u200D\uD83D\uDCBB', color: '#1877F2', bg: 'rgba(24,119,242,0.12)', url: 'https://facebook.com' },
  { name: 'Twitter', icon: '\uD83D\uDC26', color: '#1DA1F2', bg: 'rgba(29,161,242,0.12)', url: 'https://x.com' },
  { name: 'Vimeo', icon: '\u25B6', color: '#1AB7EA', bg: 'rgba(26,183,234,0.12)', url: 'https://vimeo.com' },
  { name: 'Twitch', icon: '\uD83D\uDC7E', color: '#9146FF', bg: 'rgba(145,70,255,0.12)', url: 'https://twitch.tv' },
  { name: '+1000', icon: '\u2728', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', url: null },
];

export const navItems = [
  { id: 'home', icon: '\uD83C\uDFE0', label: '\u0413\u043B\u0430\u0432\u043D\u0430\u044F' },
  { id: 'downloads', icon: '\u2B07\uFE0F', label: '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438' },
  { id: 'history', icon: '\uD83D\uDD52', label: '\u0418\u0441\u0442\u043E\u0440\u0438\u044F' },
  { id: 'favorites', icon: '\u2B50', label: '\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435' },
  { id: 'sites', icon: '\uD83C\uDF10', label: '\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435' },
  { id: 'settings', icon: '\u2699\uFE0F', label: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438' },
];

export const features = [
  { icon: '\u26A1', title: '\u0411\u044B\u0441\u0442\u0440\u043E', desc: '\u0412\u044B\u0441\u043E\u043A\u0430\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439' },
  { icon: '\uD83D\uDEE1\uFE0F', title: '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E', desc: '100% \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u0438 \u0431\u0435\u0437 \u0432\u0440\u0435\u0434\u043E\u043D\u043E\u0441\u043D\u044B\u0445 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C' },
  { icon: '\uD83C\uDFC6', title: '\u0412\u044B\u0441\u043E\u043A\u043E\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E', desc: '\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 8K, 4K, 1080p, 720p \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0439' },
  { icon: '\uD83D\uDCC1', title: '\u041B\u044E\u0431\u043E\u0439 \u0444\u043E\u0440\u043C\u0430\u0442', desc: '\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u0439\u0442\u0435 \u0432 MP4, MP3, WEBM, MOV \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u0444\u043E\u0440\u043C\u0430\u0442\u044B' },
];
