export const STATUSES = ['Open', 'In-Progress', 'Blocked', 'Resolved', 'Closed'];
export const ACTIVE_STATUSES = ['Open', 'In-Progress', 'Blocked'];
export const PRIORITIES = ['Critical', 'Medium', 'Low'];
export const ISSUE_TYPES = ['Software', 'Hardware', 'Network', 'Plumbing', 'Structural', 'Other'];

// Colours are CSS variables defined per light/dark mode in theme.js

// Categorical colours for issue types, in the same fixed order as ISSUE_TYPES
export const ISSUE_TYPE_COLORS = {
  Software: 'var(--series-1)',
  Hardware: 'var(--series-2)',
  Network: 'var(--series-3)',
  Plumbing: 'var(--series-4)',
  Structural: 'var(--series-5)',
  Other: 'var(--series-6)',
};

export const STATUS_COLORS = {
  Open: { fg: 'var(--status-open-fg)', bg: 'var(--status-open-bg)' },
  'In-Progress': { fg: 'var(--status-progress-fg)', bg: 'var(--status-progress-bg)' },
  Blocked: { fg: 'var(--status-blocked-fg)', bg: 'var(--status-blocked-bg)' },
  Resolved: { fg: 'var(--status-resolved-fg)', bg: 'var(--status-resolved-bg)' },
  Closed: { fg: 'var(--status-closed-fg)', bg: 'var(--status-closed-bg)' },
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

// New tickets get a priority from how long their issue type usually takes to close.
// Mirrors priority_for_days in the backend (app/routes/ticket.py).
export const LOW_PRIORITY_MAX_DAYS = 2;
export const MEDIUM_PRIORITY_MAX_DAYS = 3;

export function priorityForIssueType(tickets, issueType) {
  const { ms, count } = averageDuration(tickets.filter((t) => t.issue_type === issueType), 'created_at', 'closed_at');
  const days = count ? ms / 86400000 : null;
  let priority = 'Low';
  if (days !== null && days >= LOW_PRIORITY_MAX_DAYS) priority = days <= MEDIUM_PRIORITY_MAX_DAYS ? 'Medium' : 'Critical';
  return { priority, days, count };
}

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
  // FastAPI validation errors arrive as a list of { msg } objects
  if (Array.isArray(detail) && detail.length) return detail.map((d) => d.msg.replace(/^Value error, /, '')).join('. ');
  if (status === 403) return 'Your role is not allowed to make this change. Ask a facility admin.';
  return error.message || 'The request failed. Check that the API is running and try again.';
}
