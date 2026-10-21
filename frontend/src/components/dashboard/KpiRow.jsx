import { Box, Paper, Typography } from '@mui/material';
import { averageDuration, formatDuration, isActive } from '../../utils/tickets';

function Kpi({ label, value, detail }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 700, fontSize: 26, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{detail}</Typography>
    </Paper>
  );
}

function KpiRow({ tickets }) {
  const active = tickets.filter(isActive);
  const critical = active.filter((t) => t.priority === 'Critical').length;
  const unassigned = active.filter((t) => !t.assigned_to_id).length;
  const ack = averageDuration(tickets, 'created_at', 'opened_at');
  const close = averageDuration(tickets, 'created_at', 'closed_at');

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
      <Kpi label="Active tickets" value={active.length} detail={`${critical} critical`} />
      <Kpi label="Unassigned" value={unassigned} detail={unassigned ? 'Need an engineer' : 'All tickets have an owner'} />
      <Kpi label="Time to acknowledge" value={formatDuration(ack.ms)} detail={ack.count ? `Average over ${ack.count} tickets` : 'No timing data from the API yet'} />
      <Kpi label="Time to close" value={formatDuration(close.ms)} detail={close.count ? `Average over ${close.count} closed` : 'No timing data from the API yet'} />
    </Box>
  );
}

export default KpiRow;
