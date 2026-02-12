// scheduler.js – Notification scheduling via Web Worker ticks

import { getState, setState, subscribe } from './state.js';
import { getElapsedMs } from './timer.js';

let worker = null;
let fallbackIntervalId = null;
let onNotificationFire = null; // callback(point)

// Worker source (inline Blob to avoid cross-origin issues)
const WORKER_SRC = `
let intervalId = null;
self.onmessage = function(e) {
  if (e.data.command === 'start') {
    if (intervalId != null) return;
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, 250);
  } else if (e.data.command === 'stop') {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
`;

/**
 * Initialize the scheduler.
 * @param {{ onFire: (point: object) => void }} opts
 */
export function initScheduler({ onFire }) {
  onNotificationFire = onFire;

  // Try creating a Web Worker
  try {
    const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = handleTick;
  } catch {
    // Fallback: no Worker support
    worker = null;
  }

  // Watch timer status to start/stop ticking and clear queue on reset
  subscribe('timerStatus', (s) => {
    if (s.timerStatus === 'running') {
      startTicking();
    } else {
      stopTicking();
      if (s.timerStatus === 'stopped') {
        clearFireQueue();
      }
    }
  });

  // Catch up on tab visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && getState().timerStatus === 'running') {
      checkNotifications();
    }
  });
}

function startTicking() {
  if (worker) {
    worker.postMessage({ command: 'start' });
  } else {
    // Fallback
    if (fallbackIntervalId != null) return;
    fallbackIntervalId = setInterval(handleTick, 250);
  }
}

function stopTicking() {
  if (worker) {
    worker.postMessage({ command: 'stop' });
  } else {
    if (fallbackIntervalId != null) {
      clearInterval(fallbackIntervalId);
      fallbackIntervalId = null;
    }
  }
}

function handleTick() {
  if (getState().timerStatus !== 'running') return;
  checkNotifications();
}

// Queue for staggered playback (500ms apart)
let fireQueue = [];
let fireTimerId = null;

function clearFireQueue() {
  fireQueue.length = 0;
  if (fireTimerId != null) {
    clearTimeout(fireTimerId);
    fireTimerId = null;
  }
}

function checkNotifications() {
  const s = getState();
  const elapsed = getElapsedMs();
  const points = s.notificationPoints;
  const toFire = [];

  for (const point of points) {
    if (!point.fired && elapsed >= point.timeMs) {
      toFire.push(point);
    }
  }

  if (toFire.length === 0) return;

  // Mark as fired in state
  const updated = points.map((p) => {
    if (toFire.some((f) => f.id === p.id)) {
      return { ...p, fired: true };
    }
    return p;
  });

  setState({ notificationPoints: updated });

  // Sort by time and queue for staggered playback
  toFire.sort((a, b) => a.timeMs - b.timeMs);
  fireQueue.push(...toFire);
  processFireQueue();
}

function processFireQueue() {
  if (fireTimerId != null || fireQueue.length === 0) return;

  const point = fireQueue.shift();
  if (onNotificationFire) {
    onNotificationFire(point);
  }

  if (fireQueue.length > 0) {
    fireTimerId = setTimeout(() => {
      fireTimerId = null;
      processFireQueue();
    }, 500);
  }
}
