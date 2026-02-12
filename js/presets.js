// presets.js – Built-in and custom preset definitions

import { getState, setState } from './state.js';
import { getElapsedMs } from './timer.js';

/**
 * @typedef {{ id: string, timeMs: number, label: string, urgency: 'info'|'warning'|'urgent', fired: boolean }} NotificationPoint
 * @typedef {{ id: string, name: string, points: Omit<NotificationPoint, 'id'|'fired'>[] }} Preset
 */

/** Built-in presets */
const BUILTIN_PRESETS = [
  {
    id: '30min',
    name: '30 min',
    points: [
      { timeMs: 15 * 60_000, label: 'Halfway', urgency: 'info' },
      { timeMs: 25 * 60_000, label: '5 min left', urgency: 'warning' },
      { timeMs: 29 * 60_000, label: '1 min left', urgency: 'urgent' },
      { timeMs: 30 * 60_000, label: 'Time!', urgency: 'urgent' },
    ],
  },
  {
    id: '60min',
    name: '60 min',
    points: [
      { timeMs: 30 * 60_000, label: 'Halfway', urgency: 'info' },
      { timeMs: 45 * 60_000, label: '15 min left', urgency: 'warning' },
      { timeMs: 55 * 60_000, label: '5 min left', urgency: 'urgent' },
      { timeMs: 60 * 60_000, label: 'Time!', urgency: 'urgent' },
    ],
  },
  {
    id: '90min',
    name: '90 min',
    points: [
      { timeMs: 45 * 60_000, label: 'Halfway', urgency: 'info' },
      { timeMs: 60 * 60_000, label: '30 min left', urgency: 'info' },
      { timeMs: 80 * 60_000, label: '10 min left', urgency: 'warning' },
      { timeMs: 88 * 60_000, label: '2 min left', urgency: 'urgent' },
      { timeMs: 90 * 60_000, label: 'Time!', urgency: 'urgent' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    points: [],
  },
];

/**
 * Get all available presets.
 */
export function getPresets() {
  return BUILTIN_PRESETS;
}

/**
 * Apply a preset: set notification points and active preset ID.
 */
export function applyPreset(presetId) {
  const preset = BUILTIN_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  if (presetId === 'custom') {
    // Custom: keep existing points, just mark as custom
    setState({ activePresetId: 'custom' });
    return;
  }

  const points = preset.points.map((p) => ({
    id: crypto.randomUUID(),
    timeMs: p.timeMs,
    label: p.label,
    urgency: p.urgency,
    fired: false,
  }));

  // If timer is running, mark already-passed points as fired
  const s = getState();
  if (s.timerStatus === 'running') {
    const elapsed = getElapsedMs();
    for (const p of points) {
      if (elapsed >= p.timeMs) {
        p.fired = true;
      }
    }
  }

  setState({
    activePresetId: presetId,
    notificationPoints: points,
  });
}
