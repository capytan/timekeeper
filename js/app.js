// app.js – Entry point: wires all modules together

import { getState, setState, subscribe } from './state.js';
import { initStorage } from './storage.js';
import { startTimer, pauseTimer, resetTimer, getElapsedMs } from './timer.js';
import { initUI } from './ui.js';
import { initScheduler } from './scheduler.js';
import { ensureAudioContext, playSound, updateVolume } from './audio.js';
import { getPresets, applyPreset } from './presets.js';
import { initTheme, toggleTheme, watchSystemTheme } from './theme.js';
import {
  requestPermission,
  getPermissionState,
  sendBrowserNotification,
} from './notifications.js';

const $ = (sel) => document.querySelector(sel);

// ────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────
function init() {
  // 1. Load persisted settings
  initStorage();

  // 2. Theme
  initTheme();
  watchSystemTheme();

  // 3. Render presets
  renderPresets();

  // 4. Scheduler
  initScheduler({
    onFire: handleNotificationFire,
  });

  // 5. UI (render loop + notification list)
  initUI({
    onEdit: handleEditNotification,
    onDelete: handleDeleteNotification,
  });

  // 6. Bind events
  bindEvents();

  // 7. Update browser notification status display
  updateNotificationStatus();
}

// ────────────────────────────────────────────
// Event bindings
// ────────────────────────────────────────────
function bindEvents() {
  // Timer controls
  $('#btn-start').addEventListener('click', async () => {
    await ensureAudioContext();
    startTimer();
  });

  $('#btn-pause').addEventListener('click', () => {
    pauseTimer();
  });

  $('#btn-reset').addEventListener('click', () => {
    resetTimer();
  });

  // Theme toggle
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Sound toggle
  $('#sound-toggle').addEventListener('click', () => {
    const s = getState();
    setState({ soundEnabled: !s.soundEnabled });
    updateVolume();
  });

  // Volume slider
  $('#volume-slider').addEventListener('input', (e) => {
    setState({ soundVolume: Number(e.target.value) / 100 });
    updateVolume();
  });

  // Add notification button
  $('#btn-add-notification').addEventListener('click', () => {
    showNotificationForm();
  });

  // Notification form save/cancel
  $('#nf-save').addEventListener('click', saveNotificationForm);
  $('#nf-cancel').addEventListener('click', hideNotificationForm);

  // Browser notifications
  $('#btn-enable-notifications').addEventListener('click', async () => {
    const result = await requestPermission();
    updateNotificationStatus();
  });

  // Preview sound events from notification list
  window.addEventListener('timekeeper:preview', async (e) => {
    await ensureAudioContext();
    playSound(e.detail.urgency);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't interfere with form inputs
    if (e.target.closest('input, textarea, select')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      const s = getState();
      if (s.timerStatus === 'running') {
        pauseTimer();
      } else {
        ensureAudioContext().then(() => startTimer());
      }
    } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      resetTimer();
    }
  });
}

// ────────────────────────────────────────────
// Presets rendering
// ────────────────────────────────────────────
function renderPresets() {
  const container = $('#preset-list');
  const presets = getPresets();
  const activeId = getState().activePresetId;

  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(preset.id === activeId));
    btn.textContent = preset.name;
    btn.dataset.presetId = preset.id;

    btn.addEventListener('click', () => {
      applyPreset(preset.id);
    });

    container.appendChild(btn);
  }

  // Update selection when activePresetId changes
  subscribe('activePresetId', (s) => {
    updatePresetSelection(s.activePresetId);
  });
}

function updatePresetSelection(activeId) {
  const buttons = document.querySelectorAll('.preset-btn');
  for (const btn of buttons) {
    btn.setAttribute(
      'aria-checked',
      String(btn.dataset.presetId === activeId)
    );
  }
}

// ────────────────────────────────────────────
// Notification form
// ────────────────────────────────────────────
let editingPointId = null;

function showNotificationForm(pointId) {
  const form = $('#notification-form');
  form.hidden = false;
  editingPointId = pointId || null;

  if (pointId) {
    // Populate with existing point data
    const s = getState();
    const point = s.notificationPoints.find((p) => p.id === pointId);
    if (point) {
      $('#nf-minutes').value = Math.floor(point.timeMs / 60_000);
      $('#nf-seconds').value = Math.floor((point.timeMs % 60_000) / 1000);
      $('#nf-label').value = point.label || '';
      const radio = document.querySelector(
        `input[name="nf-urgency"][value="${point.urgency}"]`
      );
      if (radio) radio.checked = true;
    }
  } else {
    // Clear form
    $('#nf-minutes').value = '';
    $('#nf-seconds').value = '';
    $('#nf-label').value = '';
    document.querySelector(
      'input[name="nf-urgency"][value="info"]'
    ).checked = true;
  }

  $('#nf-minutes').focus();
}

function hideNotificationForm() {
  const form = $('#notification-form');
  form.hidden = true;
  editingPointId = null;
}

function saveNotificationForm() {
  const minutes = parseInt($('#nf-minutes').value, 10) || 0;
  const seconds = parseInt($('#nf-seconds').value, 10) || 0;
  const totalMs = (minutes * 60 + seconds) * 1000;
  const label = $('#nf-label').value.trim().slice(0, 50);
  const urgency =
    document.querySelector('input[name="nf-urgency"]:checked')?.value ||
    'info';

  // Validation
  if (totalMs < 60_000 || totalMs > 480 * 60_000) {
    alert('Time must be between 1 minute and 480 minutes.');
    return;
  }

  const s = getState();
  let points = [...s.notificationPoints];

  // Check if already fired (timer is running and time has passed)
  let fired = false;
  if (s.timerStatus === 'running') {
    const elapsed = getElapsedMs();
    if (elapsed >= totalMs) {
      fired = true;
    }
  }

  if (editingPointId) {
    // Update existing
    points = points.map((p) => {
      if (p.id === editingPointId) {
        return { ...p, timeMs: totalMs, label, urgency, fired };
      }
      return p;
    });
  } else {
    // Add new
    points.push({
      id: crypto.randomUUID(),
      timeMs: totalMs,
      label,
      urgency,
      fired,
    });
  }

  setState({
    notificationPoints: points,
    activePresetId: 'custom',
  });

  hideNotificationForm();
}

// ────────────────────────────────────────────
// Notification point actions
// ────────────────────────────────────────────
function handleEditNotification(id) {
  showNotificationForm(id);
}

function handleDeleteNotification(id) {
  const s = getState();
  setState({
    notificationPoints: s.notificationPoints.filter((p) => p.id !== id),
    activePresetId: 'custom',
  });
}

// ────────────────────────────────────────────
// Notification firing
// ────────────────────────────────────────────
function handleNotificationFire(point) {
  const s = getState();

  // Play sound
  if (s.soundEnabled) {
    playSound(point.urgency);
  }

  // Browser notification (when tab is hidden)
  sendBrowserNotification(point);
}

// ────────────────────────────────────────────
// Browser notification status
// ────────────────────────────────────────────
function updateNotificationStatus() {
  const el = $('#notification-status');
  const btn = $('#btn-enable-notifications');
  const perm = getPermissionState();

  switch (perm) {
    case 'granted':
      el.textContent = 'Notifications enabled';
      btn.hidden = true;
      break;
    case 'denied':
      el.textContent = 'Notifications blocked (change in browser settings)';
      btn.hidden = true;
      break;
    case 'unsupported':
      el.textContent = 'Browser notifications not supported';
      btn.hidden = true;
      break;
    default:
      el.textContent = '';
      btn.hidden = false;
  }
}

// ────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
