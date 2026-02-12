// timer.js – Timer logic (start / pause / reset)

import { getState, setState, resetTimerState } from './state.js';

/**
 * Start or resume the timer.
 */
export function startTimer() {
  const s = getState();

  if (s.timerStatus === 'running') return;

  const now = performance.now();

  if (s.timerStatus === 'paused') {
    // Resume: set startTimestamp back by pausedElapsed so getElapsedMs() is continuous
    setState({
      timerStatus: 'running',
      startTimestamp: now - s.pausedElapsed,
      pausedElapsed: 0,
    });
  } else {
    // Fresh start
    setState({
      timerStatus: 'running',
      startTimestamp: now,
      pausedElapsed: 0,
      notificationPoints: s.notificationPoints.map((p) => ({
        ...p,
        fired: false,
      })),
    });
  }
}

/**
 * Pause the timer, accumulating elapsed time.
 */
export function pauseTimer() {
  const s = getState();
  if (s.timerStatus !== 'running') return;

  const elapsed = getElapsedMs();

  setState({
    timerStatus: 'paused',
    pausedElapsed: elapsed,
    startTimestamp: null,
  });
}

/**
 * Reset the timer to zero.
 */
export function resetTimer() {
  resetTimerState();
}

/**
 * Get total elapsed milliseconds.
 */
export function getElapsedMs() {
  const s = getState();

  if (s.timerStatus === 'running' && s.startTimestamp != null) {
    return performance.now() - s.startTimestamp + s.pausedElapsed;
  }

  return s.pausedElapsed;
}

/**
 * Format milliseconds to HH:MM:SS string.
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;

  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Format milliseconds to MM:SS string (for notification point display).
 */
export function formatTimeShort(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;

  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
