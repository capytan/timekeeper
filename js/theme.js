// theme.js – Dark / Light / System theme toggle

import { getState, setState, subscribe } from './state.js';

const CYCLE = ['system', 'light', 'dark'];
const THEME_ICONS = { system: '\u2600', light: '\u2600', dark: '\u263E' };
const META_COLORS = { light: '#ffffff', dark: '#0f172a' };

/**
 * Initialize theme from state and listen for changes.
 */
export function initTheme() {
  subscribe('theme', applyTheme);
  applyTheme(getState());
}

/**
 * Cycle to the next theme: system → light → dark → system
 */
export function toggleTheme() {
  const current = getState().theme;
  const idx = CYCLE.indexOf(current);
  const next = CYCLE[(idx + 1) % CYCLE.length];
  setState({ theme: next });
}

function applyTheme(s) {
  const theme = s.theme;
  document.documentElement.setAttribute('data-theme', theme);

  // Update theme-color meta
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      meta.content = prefersDark ? META_COLORS.dark : META_COLORS.light;
    } else {
      meta.content = META_COLORS[theme] || META_COLORS.light;
    }
  }

  // Update icon
  const icon = document.querySelector('#theme-toggle .icon-btn__icon');
  if (icon) {
    icon.textContent = THEME_ICONS[theme] || THEME_ICONS.system;
  }

  // Update button title
  const btn = document.querySelector('#theme-toggle');
  if (btn) {
    btn.title = `Theme: ${theme} (click to change)`;
  }
}

/**
 * Listen for system color scheme changes to update meta tag.
 */
export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (getState().theme === 'system') {
      applyTheme(getState());
    }
  });
}
