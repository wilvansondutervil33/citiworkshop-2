import { Box, Link, Typography } from '@mui/material';
import Panel from '../common/Panel.jsx';
import { StatusChip } from '../common/TicketBadges.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { PRIORITIES, STATUS_COLORS, ticketCode } from '../../utils/tickets';

// A short list of tickets with the latest note on each, critical first
function TicketFeed({ title, subtitle, tickets }) {
  const { notesFor, noteAuthor, openTicket } = useFacilityData();
  const rows = [...tickets].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  return (
    <Panel title={title} subtitle={subtitle}>
      {!rows.length && <Typography variant="body2" color="text.secondary">Nothing here right now.</Typography>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {rows.map((ticket) => {
          const last = notesFor(ticket.id).at(-1);
          return (
            <Box key={ticket.id} sx={{ borderLeft: `2px solid ${STATUS_COLORS[ticket.status]?.fg}`, pl: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Link component="button" underline="hover" color="text.primary" onClick={() => openTicket(ticket.id)} sx={{ fontWeight: 600, textAlign: 'left' }}>
                  {ticketCode(ticket.id)} · {ticket.title}
                </Link>
                <StatusChip status={ticket.status} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {last ? `${noteAuthor(last)}: “${last.body}”` : 'No notes yet'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}

export default TicketFeed;
