import { Box, Chip } from '@mui/material';
import { PRIORITY_COLORS, STATUS_COLORS, statusLabel } from '../../utils/tickets';

export function StatusChip({ status }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.Closed;
  return (
    <Chip
      label={statusLabel(status)}
      size="small"
      sx={{ color: colors.fg, bgcolor: colors.bg, fontWeight: 600 }}
    />
  );
}

export function PriorityLabel({ priority }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ width: 4, height: 14, borderRadius: 1, bgcolor: PRIORITY_COLORS[priority] ?? 'text.disabled' }} />
      {priority}
    </Box>
  );
}
