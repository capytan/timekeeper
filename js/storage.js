// storage.js – localStorage persistence with debounce

import { getState, setState, subscribe } from './state.js';

const STORAGE_KEY = 'timekeeper_settings';
const DEBOUNCE_MS = 300;

// Keys to persist (timer runtime state is NOT persisted)
const PERSISTED_KEYS = [
  'theme',
  'soundEnabled',
  'soundVolume',
  'activePresetId',
  'notificationPoints',
];

let saveTimer = null;

function saveToStorage() {
  try {
    const s = getState();
    const data = {};
    for (const key of PERSISTED_KEYS) {
      data[key] = s[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Silent fallback: localStorage unavailable or full
  }
}

function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToStorage, DEBOUNCE_MS);
}

/**
 * Load persisted settings from localStorage into state.
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    const patch = {};

    for (const key of PERSISTED_KEYS) {
      if (key in data && data[key] !== undefined) {
        patch[key] = data[key];
      }
    }

    // Ensure notification points have correct structure
    if (Array.isArray(patch.notificationPoints)) {
      patch.notificationPoints = patch.notificationPoints.map((p) => ({
        id: p.id ?? crypto.randomUUID(),
        timeMs: Number(p.timeMs) || 0,
        label: String(p.label ?? ''),
        urgency: ['info', 'warning', 'urgent'].includes(p.urgency)
          ? p.urgency
          : 'info',
        fired: false, // Always reset on load
      }));
    }

    setState(patch);
  } catch {
    // Silent fallback
  }
}

/**
 * Start watching state changes and auto-save.
 */
export function initStorage() {
  loadSettings();
  subscribe(PERSISTED_KEYS, debouncedSave);
}
