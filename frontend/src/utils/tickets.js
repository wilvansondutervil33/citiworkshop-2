export const STATUSES = ['Open', 'In-Progress', 'Blocked', 'Resolved', 'Closed'];
export const ACTIVE_STATUSES = ['Open', 'In-Progress', 'Blocked'];
export const PRIORITIES = ['Critical', 'Medium', 'Low'];
export const ISSUE_TYPES = ['Software', 'Hardware', 'Network', 'Plumbing', 'Structural', 'Other'];

// Categorical colours for issue types, in the same fixed order as ISSUE_TYPES
export const ISSUE_TYPE_COLORS = {
  Software: '#2a78d6',
  Hardware: '#eb6834',
  Network: '#1baf7a',
  Plumbing: '#eda100',
  Structural: '#e87ba4',
  Other: '#6250d6',
};

export const STATUS_COLORS = {
  Open: { fg: '#2f5bd3', bg: '#e6ecfb' },
  'In-Progress': { fg: '#b26a00', bg: '#fbefd9' },
  Blocked: { fg: '#c0362c', bg: '#fbe4e1' },
  Resolved: { fg: '#1f7a4d', bg: '#dff2e7' },
  Closed: { fg: '#5b6475', bg: '#e9ebf0' },
};

export const PRIORITY_COLORS = {
  Critical: STATUS_COLORS.Blocked.fg,
  Medium: STATUS_COLORS['In-Progress'].fg,
  Low: STATUS_COLORS.Closed.fg,
};

// Status moves an engineer is allowed to make from each state
export const ENGINEER_NEXT_STATUS = {
  Open: ['In-Progress'],
  'In-Progress': ['Blocked', 'Resolved'],
  Blocked: ['In-Progress'],
  Resolved: [],
  Closed: [],
};

export const statusLabel = (status) => (status === 'In-Progress' ? 'In Progress' : status);

export const isActive = (ticket) => ACTIVE_STATUSES.includes(ticket.status);

export const ticketCode = (id) => `INC-${String(id).padStart(4, '0')}`;

export function countBy(list, keyFn) {
  return list.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function formatAge(iso, now = new Date()) {
  if (!iso) return '—';
  const hours = Math.round((now - new Date(iso)) / 36e5);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export function formatDuration(ms) {
  if (ms == null) return '—';
  const hours = ms / 36e5;
  const value = hours < 24 ? hours : hours / 24;
  return `${Number(value.toFixed(1))}${hours < 24 ? 'h' : 'd'}`;
}

// Average time between two timestamp fields, or null when no ticket has both
export function averageDuration(tickets, fromKey, toKey) {
  const spans = tickets
    .filter((t) => t[fromKey] && t[toKey])
    .map((t) => new Date(t[toKey]) - new Date(t[fromKey]));
  if (!spans.length) return { ms: null, count: 0 };
  return { ms: spans.reduce((a, b) => a + b, 0) / spans.length, count: spans.length };
}

export function apiErrorMessage(error) {
  const status = error.response?.status;
  if (status === 401) return 'Your session has expired. Log in again.';
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string' && !detail.startsWith('Role ')) return detail;
  if (status === 403) return 'Your role is not allowed to make this change. Ask a facility admin.';
  return error.message || 'The request failed. Check that the API is running and try again.';
}
