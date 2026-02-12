// notifications.js – Browser Notification API integration

/**
 * Request notification permission from the user.
 * Returns the permission state.
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const result = await Notification.requestPermission();
  return result;
}

/**
 * Get current notification permission state.
 */
export function getPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Send a browser notification (only when tab is hidden).
 * @param {{ label: string, urgency: string, timeMs: number }} point
 */
export function sendBrowserNotification(point) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return; // Only notify when tab is not visible

  const urgencyLabels = {
    info: 'Info',
    warning: 'Warning',
    urgent: 'Urgent',
  };

  const minutes = Math.floor(point.timeMs / 60_000);
  const seconds = Math.floor((point.timeMs % 60_000) / 1000);
  const timeStr =
    seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;

  const title = `Timekeeper - ${urgencyLabels[point.urgency] || 'Notification'}`;
  const body = point.label
    ? `${point.label} (${timeStr})`
    : `Timer reached ${timeStr}`;

  const notification = new Notification(title, {
    body,
    icon: undefined,
    requireInteraction: point.urgency === 'urgent',
    tag: `timekeeper-${point.id}`,
  });

  // Auto-close non-urgent notifications after 5 seconds
  if (point.urgency !== 'urgent') {
    setTimeout(() => notification.close(), 5000);
  }
}
