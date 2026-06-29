import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'forever_theme';

export const SEASONAL_THEMES = [
  { id: 'dark', label: 'Midnight', emoji: '🌙' },
  { id: 'light', label: 'Daylight', emoji: '☀️' },
  { id: 'valentine', label: "Valentine's rose", emoji: '🌹' },
  { id: 'monsoon', label: 'Monsoon blues', emoji: '🌧️' },
  { id: 'diwali', label: 'Diwali gold', emoji: '✨' },
];

const THEME_VARS = {
  dark: {},
  light: {},
  valentine: {
    '--color-ink': '#1a0a12',
    '--color-surface': '#2d1520',
    '--color-card': '#3a1a28',
    '--color-accent': '#ff6b8a',
    '--color-accent-soft': '#ffb3c6',
    '--color-gold': '#ffd166',
  },
  monsoon: {
    '--color-ink': '#0a1628',
    '--color-surface': '#0f2847',
    '--color-card': '#14325a',
    '--color-accent': '#5eb3ff',
    '--color-accent-soft': '#9fd4ff',
    '--color-gold': '#7ec8e3',
  },
  diwali: {
    '--color-ink': '#1a1208',
    '--color-surface': '#2a1f0a',
    '--color-card': '#3d2e10',
    '--color-accent': '#ff9933',
    '--color-accent-soft': '#ffcc66',
    '--color-gold': '#ffe066',
  },
};

function applyThemeVars(theme) {
  const root = document.documentElement;
  const allKeys = new Set();
  Object.values(THEME_VARS).forEach((v) => Object.keys(v).forEach((k) => allKeys.add(k)));
  allKeys.forEach((k) => root.style.removeProperty(k));

  const vars = THEME_VARS[theme];
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = { valentine: '#ff6b8a', monsoon: '#5eb3ff', diwali: '#ff9933', light: '#f1f5f9' };
    meta.content = colors[theme] || '#ff4d6d';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(KEY) || 'dark');

  useEffect(() => {
    localStorage.setItem(KEY, theme);
    applyThemeVars(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme !== 'light',
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      setTheme,
      seasonalThemes: SEASONAL_THEMES,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme requires ThemeProvider');
  return ctx;
}
