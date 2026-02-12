// ui.js – DOM rendering and requestAnimationFrame loop

import { getState, subscribe } from './state.js';
import { getElapsedMs, formatTime, formatTimeShort } from './timer.js';

const $ = (sel) => document.querySelector(sel);

let rafId = null;
let onNotificationEdit = null;
let onNotificationDelete = null;

/**
 * Initialize UI bindings and start the render loop.
 */
export function initUI({ onEdit, onDelete }) {
  onNotificationEdit = onEdit;
  onNotificationDelete = onDelete;

  subscribe('timerStatus', renderControls);
  subscribe('notificationPoints', renderNotificationList);
  subscribe('soundEnabled', renderSoundToggle);
  subscribe('soundVolume', renderVolume);

  renderControls(getState());
  renderNotificationList(getState());
  renderSoundToggle(getState());
  renderVolume(getState());

  tick();
}

function tick() {
  const s = getState();

  if (s.timerStatus === 'running') {
    const elapsed = getElapsedMs();
    const display = formatTime(elapsed);

    const el = $('#timer-value');
    if (el && el.textContent !== display) {
      el.textContent = display;
    }

    document.title = `${display} - Timekeeper`;
  }

  rafId = requestAnimationFrame(tick);
}

function renderControls(s) {
  const btnStart = $('#btn-start');
  const btnPause = $('#btn-pause');
  const btnReset = $('#btn-reset');

  switch (s.timerStatus) {
    case 'stopped':
      btnStart.disabled = false;
      btnStart.textContent = 'Start';
      btnPause.disabled = true;
      btnReset.disabled = true;
      $('#timer-value').textContent = '00:00:00';
      document.title = 'Timekeeper';
      break;

    case 'running':
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnReset.disabled = false;
      break;

    case 'paused':
      btnStart.disabled = false;
      btnStart.textContent = 'Resume';
      btnPause.disabled = true;
      btnReset.disabled = false;
      break;
  }
}

function createNotificationItem(p) {
  const li = document.createElement('li');
  li.className = `notification-item${p.fired ? ' notification-item--fired' : ''}`;
  li.dataset.id = p.id;

  // Dot
  const dot = document.createElement('span');
  dot.className = `notification-item__dot notification-item__dot--${p.urgency}`;
  dot.setAttribute('aria-label', p.urgency);

  // Time
  const time = document.createElement('span');
  time.className = 'notification-item__time';
  time.textContent = formatTimeShort(p.timeMs);

  // Label
  const label = document.createElement('span');
  label.className = 'notification-item__label';
  label.textContent = p.label || '';

  // Actions container
  const actions = document.createElement('span');
  actions.className = 'notification-item__actions';

  // Preview button
  const previewBtn = document.createElement('button');
  previewBtn.className = 'btn btn--small';
  previewBtn.dataset.action = 'preview';
  previewBtn.dataset.urgency = p.urgency;
  previewBtn.setAttribute('aria-label', 'Preview sound');
  previewBtn.title = 'Preview sound';
  previewBtn.textContent = '\u25B6';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--small';
  editBtn.dataset.action = 'edit';
  editBtn.dataset.id = p.id;
  editBtn.setAttribute('aria-label', 'Edit');
  editBtn.title = 'Edit';
  editBtn.textContent = '\u270E';

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn--small btn--danger';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.id = p.id;
  deleteBtn.setAttribute('aria-label', 'Delete');
  deleteBtn.title = 'Delete';
  deleteBtn.textContent = '\u00D7';

  actions.append(previewBtn, editBtn, deleteBtn);
  li.append(dot, time, label, actions);

  return li;
}

function renderNotificationList(s) {
  const list = $('#notification-list');
  if (!list) return;

  const sorted = [...s.notificationPoints].sort(
    (a, b) => a.timeMs - b.timeMs
  );

  // Clear existing children
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  for (const p of sorted) {
    list.appendChild(createNotificationItem(p));
  }

  // Delegate click events
  list.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete' && onNotificationDelete) {
      onNotificationDelete(id);
    } else if (action === 'edit' && onNotificationEdit) {
      onNotificationEdit(id);
    } else if (action === 'preview') {
      const urgency = btn.dataset.urgency;
      window.dispatchEvent(
        new CustomEvent('timekeeper:preview', { detail: { urgency } })
      );
    }
  };
}

function renderSoundToggle(s) {
  const btn = $('#sound-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(s.soundEnabled));
}

function renderVolume(s) {
  const slider = $('#volume-slider');
  const display = $('#volume-value');
  if (slider) slider.value = Math.round(s.soundVolume * 100);
  if (display) display.textContent = `${Math.round(s.soundVolume * 100)}%`;
}

/**
 * Stop the render loop.
 */
export function stopUI() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
