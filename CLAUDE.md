# CLAUDE.md

## Development

No build tools, test runner, or linter. The only dev workflow is a local static server (ES modules require it):

```
npx serve .
# or
python3 -m http.server
```

## Architecture

All coordination flows through a **pub/sub reactive state** in `state.js`. Modules never call each other directly — they subscribe to state keys and react to changes. Data flow is unidirectional:

```
User action → setState() → subscribers notified → DOM/audio/storage react
```

Module roles:
- `state.js` — Single source of truth. Frozen snapshots, key-level subscriptions.
- `app.js` — Initialization, event wiring, orchestration. The only module that imports most others.
- `timer.js` — Start/pause/reset logic, elapsed-time calculation.
- `scheduler.js` — Drives notification checks via Web Worker ticks (250ms interval).
- `audio.js` — Synthesizes sounds per urgency level using Web Audio oscillators.
- `notifications.js` — Browser Notification API wrapper (fires only when tab is hidden).
- `ui.js` — DOM rendering via a `requestAnimationFrame` loop.
- `presets.js` — Built-in preset definitions, preset application logic.
- `storage.js` — Debounced localStorage persistence.
- `theme.js` — Dark/light/system theme cycling, OS preference detection.

## Key Patterns

**State is the single source of truth.** All modules read from `getState()` (returns a frozen snapshot) and write via `setState(partial)`. Only changed keys trigger subscriber callbacks. Signature: `fn(frozenState, changedKey)`.

**Inline Blob-based Web Worker.** `scheduler.js` embeds the worker source as a string and creates it via `new Worker(URL.createObjectURL(new Blob([WORKER_SRC])))`. No external worker file exists. Falls back to `setInterval` if Worker creation fails.

**Lazy AudioContext creation.** `ensureAudioContext()` in `audio.js` creates the AudioContext on first call (triggered by user gesture) to comply with browser autoplay policies. It also handles the `suspended` → `resume()` transition and the `webkitAudioContext` prefix.

**Debounced localStorage writes.** `storage.js` subscribes to persisted keys and writes after a 300ms debounce. Only user preferences are persisted (`theme`, `soundEnabled`, `soundVolume`, `activePresetId`, `notificationPoints`). Runtime state (`timerStatus`, `startTimestamp`, `pausedElapsed`) is never saved — the timer always starts fresh.

**`performance.now()` for time tracking.** `timer.js` uses `performance.now()` (monotonic, high-resolution) instead of `Date.now()`. On resume, `startTimestamp` is adjusted backward by `pausedElapsed` so elapsed calculation stays continuous without accumulating drift.

**Notification fire queue with 500ms stagger.** When multiple notification points fire simultaneously, `scheduler.js` queues them and processes one every 500ms to prevent audio/notification pile-up.

**Preset changes auto-detect passed points.** `applyPreset()` in `presets.js` checks elapsed time when the timer is running and marks already-passed notification points as `fired: true`, preventing retroactive alerts.

## State Schema

```js
{
  timerStatus: 'stopped',       // 'stopped' | 'running' | 'paused'
  startTimestamp: null,          // performance.now() value, or null
  pausedElapsed: 0,              // accumulated ms from previous run segments
  notificationPoints: [],        // [{ id, timeMs, label, urgency, fired }]
  activePresetId: null,          // preset ID string or 'custom'
  theme: 'system',               // 'light' | 'dark' | 'system'
  soundEnabled: true,            // boolean
  soundVolume: 0.7,              // 0.0–1.0
}
```

Each notification point:
```js
{ id: crypto.randomUUID(), timeMs: 300000, label: '5 min', urgency: 'info', fired: false }
//                                                          'info' | 'warning' | 'urgent'
```

## Browser API Dependencies

Required: ES6 modules, Web Audio API, `requestAnimationFrame`, `localStorage`, `crypto.randomUUID()`, `matchMedia`.

Optional (graceful degradation): Web Workers (falls back to `setInterval`), Notification API (skipped if unavailable or denied).
