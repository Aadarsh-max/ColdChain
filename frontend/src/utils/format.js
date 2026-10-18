const isNil = (value) => value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatNumber = (value, digits = 1) => (isNil(value) ? '--' : Number(value).toFixed(digits));

export const formatTime = (value, withSeconds = false) => {
  const date = toDate(value);
  if (!date) return '--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: true
  });
};

export const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return '--';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return '--';
  return `${formatDate(date)}, ${formatTime(date)}`;
};

export const formatWeekday = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
};

export const durationText = (seconds) => {
  if (isNil(seconds)) return '--';
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h`;
};

export const timeAgo = (seconds) => {
  if (isNil(seconds)) return 'never';
  if (seconds < 5) return 'just now';
  return `${durationText(seconds)} ago`;
};

export const secondsSince = (value, now = Date.now()) => {
  const date = toDate(value);
  return date ? Math.max(0, Math.round((now - date.getTime()) / 1000)) : null;
};

export const formatCoordinate = (value) => (isNil(value) ? '--' : Number(value).toFixed(4));