/**
 * ThemeSwitcher — manages dark/light theme via 'dark' class on <html> and localStorage.
 */

export type Theme = 'light' | 'dark';

export const THEMES: Theme[] = ['light', 'dark'];
const STORAGE_KEY = 'wm7:theme';

/** Apply a theme to the document and persist it. */
export function setTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Get the currently active theme. */
export function getTheme(): Theme {
  // Check local storage first
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved && THEMES.includes(saved)) {
    return saved;
  }
  // Fallback to checking the DOM
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Toggle between dark ↔ light. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Restore theme from localStorage (call once on app boot). */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved && THEMES.includes(saved)) {
    setTheme(saved);
  } else {
    // Optional: detect system preference?
    // For now, default to light or whatever CSS does (which seems to be light default)
    // If we want dark default, we'd set it here.
  }
}
