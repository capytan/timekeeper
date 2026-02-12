[English](README.md) | [日本語](README.ja.md)

# Timekeeper

A meeting timer web app with smart notifications. Set a duration, add notification points at key moments, and get audio/visual alerts — all in the browser with zero dependencies.

## Features

- **Timer** — Start, pause, resume, reset. Elapsed time shown in HH:MM:SS and mirrored in the browser tab title.
- **Presets** — Built-in 30 / 60 / 90-minute presets with sensible notification points, plus a custom mode.
- **Notification points** — Add alerts at any time with a label and one of three urgency levels (info, warning, urgent).
- **Web Audio sounds** — Synthesized tones per urgency: gentle beep (info), rising chime (warning), rapid beeps (urgent). Adjustable volume.
- **Browser notifications** — Desktop alerts via the Notification API when the tab is in the background.
- **Themes** — Dark, light, or system (follows OS preference). Persisted across sessions.
- **Keyboard shortcuts** — `Space` start/pause, `R` reset.
- **Persistence** — Theme, volume, sound toggle, active preset, and notification points saved to localStorage.

## Getting Started

No build step required — Timekeeper is a static site using ES6 modules.
A local server is needed because browsers block ES module imports over the `file://` protocol.

```
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or the port shown).

## Project Structure

```
├── index.html        # Entry point
├── css/
│   └── styles.css    # Styling with dark/light theme support
└── js/
    ├── app.js        # Initialization & event wiring
    ├── timer.js      # Timer logic (start/pause/reset)
    ├── presets.js     # Built-in & custom preset definitions
    ├── ui.js         # DOM rendering & animation loop
    ├── state.js      # Pub/sub reactive state management
    ├── theme.js      # Theme toggle & OS preference detection
    ├── audio.js      # Web Audio API sound synthesis
    ├── scheduler.js  # Web Worker notification scheduler
    ├── notifications.js  # Browser Notification API wrapper
    └── storage.js    # localStorage persistence with debounce
```

## Browser Requirements

A modern browser supporting:

- ES6 modules (`<script type="module">`)
- Web Audio API
- Web Workers (falls back to setInterval)
- Notification API (optional — graceful degradation)
- `crypto.randomUUID()`
