import { Box, ButtonBase, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Panel from '../common/Panel.jsx';
import { STATUS_COLORS, countBy, statusLabel } from '../../utils/tickets';

const MAIN_FLOW = [
  ['Open', 'Waiting to be picked up'],
  ['In-Progress', 'Engineer working on it'],
  ['Resolved', 'Fixed, awaiting confirmation'],
  ['Closed', 'Confirmed by reporter'],
];

function StageButton({ status, hint, count, sx }) {
  const navigate = useNavigate();
  const colors = STATUS_COLORS[status];
  return (
    <ButtonBase
      onClick={() => navigate(`/tickets?status=${status}`)}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25,
        p: 1.5, pl: 2, bgcolor: colors.bg, borderTop: `4px solid ${colors.fg}`, textAlign: 'left',
        '&:hover': { filter: 'brightness(0.97)' },
        ...sx,
      }}
    >
      <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 700, fontSize: 30, lineHeight: 1, color: colors.fg }}>{count}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{statusLabel(status)}</Typography>
      <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </ButtonBase>
  );
}

// Visual ticket lifecycle; each stage links to the ticket list filtered by that status
function WorkflowStrip({ tickets }) {
  const counts = countBy(tickets, (t) => t.status);
  return (
    <Panel title="Ticket workflow" subtitle="Select a stage to see its tickets">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '1px', borderRadius: 1, overflow: 'hidden' }}>
        {MAIN_FLOW.map(([status, hint]) => (
          <StageButton key={status} status={status} hint={hint} count={counts[status] || 0} />
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, mt: 1, alignItems: 'center', gap: 1.5 }}>
        <StageButton status="Blocked" hint="Waiting on parts or access" count={counts.Blocked || 0} sx={{ gridColumn: { md: 2 }, borderRadius: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ gridColumn: { md: '3 / 5' } }}>
          A blocked ticket returns to In Progress once the blocker clears.
        </Typography>
      </Box>
    </Panel>
  );
}

export default WorkflowStrip;
