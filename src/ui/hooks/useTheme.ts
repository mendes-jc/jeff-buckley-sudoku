import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from '../../game/persistence';

export type Theme = Settings['theme'];

/** 'system' removes data-theme so the CSS prefers-color-scheme media query decides. */
export function applyTheme(theme: Theme): void {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => loadSettings().theme);

  useEffect(() => applyTheme(theme), [theme]);

  const setTheme = useCallback((t: Theme) => {
    saveSettings({ ...loadSettings(), theme: t });
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
