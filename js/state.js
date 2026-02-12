// state.js – Simple pub/sub reactive state management

const initialState = {
  timerStatus: 'stopped', // 'stopped' | 'running' | 'paused'
  startTimestamp: null,    // performance.now() when started
  pausedElapsed: 0,        // accumulated ms while paused
  notificationPoints: [],  // [{ id, timeMs, label, urgency, fired }]
  activePresetId: null,
  theme: 'system',         // 'light' | 'dark' | 'system'
  soundEnabled: true,
  soundVolume: 0.7,
};

let state = { ...initialState };
const listeners = new Map(); // key -> Set<callback>

/**
 * Get a frozen snapshot of the current state.
 */
export function getState() {
  return Object.freeze({ ...state });
}

/**
 * Update one or more state keys. Only notifies subscribers of changed keys.
 */
export function setState(partial) {
  const changedKeys = [];

  for (const [key, value] of Object.entries(partial)) {
    if (!(key in state)) continue;
    if (state[key] !== value) {
      state[key] = value;
      changedKeys.push(key);
    }
  }

  for (const key of changedKeys) {
    const subs = listeners.get(key);
    if (subs) {
      const frozen = getState();
      for (const fn of subs) {
        fn(frozen, key);
      }
    }
  }
}

/**
 * Subscribe to changes on specific state keys.
 * Returns an unsubscribe function.
 */
export function subscribe(keys, callback) {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key).add(callback);
  }

  return () => {
    for (const key of keyList) {
      listeners.get(key)?.delete(callback);
    }
  };
}

/**
 * Reset state to initial values (preserves persisted settings via callback).
 */
export function resetTimerState() {
  setState({
    timerStatus: 'stopped',
    startTimestamp: null,
    pausedElapsed: 0,
    notificationPoints: state.notificationPoints.map((p) => ({
      ...p,
      fired: false,
    })),
  });
}
