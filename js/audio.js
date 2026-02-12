// audio.js – Web Audio API sound generation

import { getState } from './state.js';

let audioCtx = null;
let masterGain = null;

/**
 * Ensure AudioContext is created and resumed.
 * Must be called from a user gesture handler.
 */
export async function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // Browser may deny resume outside user gesture
    }
  }

  updateVolume();
}

/**
 * Update master volume from state.
 */
export function updateVolume() {
  if (!masterGain) return;
  const s = getState();
  const vol = s.soundEnabled ? s.soundVolume : 0;
  masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
}

/**
 * Play notification sound by urgency level.
 * @param {'info' | 'warning' | 'urgent'} urgency
 */
export async function playSound(urgency) {
  await ensureAudioContext();
  updateVolume();

  switch (urgency) {
    case 'info':
      playInfoSound();
      break;
    case 'warning':
      playWarningSound();
      break;
    case 'urgent':
      playUrgentSound();
      break;
  }
}

/**
 * Info: Gentle double beep (880Hz sine wave x2)
 */
function playInfoSound() {
  const t = audioCtx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0, t + i * 0.2);
    gain.gain.linearRampToValueAtTime(0.3, t + i * 0.2 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.15);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t + i * 0.2);
    osc.stop(t + i * 0.2 + 0.15);
  }
}

/**
 * Warning: Rising 3-note chime (C5 → E5 → G5 arpeggio)
 */
function playWarningSound() {
  const t = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const start = t + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(start);
    osc.stop(start + 0.3);
  });
}

/**
 * Urgent: Short rapid beeps x4 (1046Hz square wave)
 */
function playUrgentSound() {
  const t = audioCtx.currentTime;

  for (let i = 0; i < 4; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1046.5, t); // C6

    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.01);
    gain.gain.setValueAtTime(0.2, start + 0.06);
    gain.gain.linearRampToValueAtTime(0, start + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(start);
    osc.stop(start + 0.1);
  }
}
