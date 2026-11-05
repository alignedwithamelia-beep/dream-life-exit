import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
const KEY = 'dream-life-theme';

/** The saved choice, otherwise dark (the default). index.html applies it before the app loads. */
export function initialTheme(): ThemeMode {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0f1521' : '#f7f2ea');
  }, [mode]);
  const toggle = () => setMode((m) => {
    const next = m === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    return next;
  });
  return { mode, toggle };
}
