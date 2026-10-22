import { useState } from 'react';
import {
  Alert, Box, Button, Divider, Drawer, IconButton, MenuItem, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PriorityLabel, StatusChip } from '../common/TicketBadges.jsx';
import SearchSelect from '../common/SearchSelect.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { ENGINEER_NEXT_STATUS, ISSUE_TYPES, PRIORITIES, STATUSES, formatAge, isActive, statusLabel, ticketCode } from '../../utils/tickets';
import { monoFont } from '../../theme';

const MAIN_FLOW = ['Open', 'In-Progress', 'Resolved', 'Closed'];
const ESCALATE_TO = { Low: 'Medium', Medium: 'Critical' };

function Detail({ label, children }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Box sx={{ typography: 'body2' }}>{children}</Box>
    </>
  );
}

function RoleControls({ ticket }) {
  const {
    role, engineers, tickets, locate, engineerName, engineerEmail, buildingName, buildingDepartment, updateTicket, setTicketStatus,
  } = useFacilityData();

  if (role === 'Facility Admin') {
    // Suggest engineers in the ticket's building first, then whoever has the most free slots
    const ticketBuilding = locate(ticket.location_id).buildingId;
    const engineerOptions = engineers
      .map((e) => {
        const load = tickets.filter((t) => t.assigned_to_id === e.id && isActive(t)).length;
        const free = e.max_workload - load;
        return {
          value: String(e.id),
          label: `${engineerName(e.id)} · ${buildingName(e.building_id)} · ${free > 0 ? `${free} free` : 'full'}`,
          searchText: `${engineerEmail(e.id) ?? ''} ${buildingDepartment(e.building_id) ?? ''}`,
          sameBuilding: e.building_id === ticketBuilding,
          free,
        };
      })
      .sort((a, b) => (b.sameBuilding - a.sameBuilding) || (b.free - a.free) || a.label.localeCompare(b.label));

    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <SearchSelect
          id="drawer-assignee"
          size="small"
          label="Assigned engineer"
          placeholder="Unassigned · type a name"
          options={engineerOptions}
          value={ticket.assigned_to_id ? String(ticket.assigned_to_id) : ''}
          onChange={(value) => {
            const id = value ? Number(value) : null;
            if (id === (ticket.assigned_to_id ?? null)) return;
            updateTicket(ticket, { assigned_to_id: id }, id ? `Assigned to ${engineerName(id)}` : 'Assignment removed');
          }}
          helperText="Empty box: 5 suggestions from this building first. Type to search all engineers by name or email."
          noOptionsText="No engineers match"
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField
            id="drawer-status" select size="small" label="Status" value={ticket.status}
            onChange={(e) => updateTicket(ticket, { status: e.target.value }, `Status set to ${statusLabel(e.target.value)}`)}
          >
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
          </TextField>
          <TextField
            id="drawer-priority" select size="small" label="Priority" value={ticket.priority}
            onChange={(e) => updateTicket(ticket, { priority: e.target.value }, `Priority set to ${e.target.value}`)}
          >
            {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField
            id="drawer-issue-type" select size="small" label="Issue type" value={ticket.issue_type}
            onChange={(e) => updateTicket(ticket, { issue_type: e.target.value }, `Issue type set to ${e.target.value}`)}
            sx={{ gridColumn: '1 / -1' }}
          >
            {ISSUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Box>
      </Box>
    );
  }

  if (role === 'Engineer') {
    const next = ENGINEER_NEXT_STATUS[ticket.status] ?? [];
    if (!next.length) return null;
    return (
      <Box>
        <Typography variant="overline" color="text.secondary">Move ticket to</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          {next.map((s) => (
            <Button key={s} variant="outlined" onClick={() => setTicketStatus(ticket, s, `Moved to ${statusLabel(s)}`)}>
              {statusLabel(s)}
            </Button>
          ))}
        </Box>
      </Box>
    );
  }

  if (ticket.status === 'Resolved') {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => setTicketStatus(ticket, 'Closed', 'Ticket closed')}>Confirm fixed and close</Button>
        <Button variant="outlined" onClick={() => setTicketStatus(ticket, 'In-Progress', 'Ticket reopened')}>Still broken, reopen</Button>
      </Box>
    );
  }

  if (isActive(ticket) && ESCALATE_TO[ticket.priority]) {
    const target = ESCALATE_TO[ticket.priority];
    return (
      <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => updateTicket(ticket, { priority: target }, `Escalated to ${target}`)}>
        Escalate to {target}
      </Button>
    );
  }
  return null;
}

function NoteForm({ ticket }) {
  const { role, addNote } = useFacilityData();
  const [body, setBody] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (await addNote(ticket, body.trim())) setBody('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1 }}>
      <TextField
        id="note-body" label="Add a note" multiline minRows={3} value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={role === 'Employee' ? 'Add details for the engineer…' : 'Update the reporter on progress…'}
      />
      <Button type="submit" variant="contained" disabled={!body.trim()} sx={{ justifySelf: 'start' }}>Post note</Button>
    </Box>
  );
}

function TicketDrawer() {
  const { tickets, selectedTicketId, closeTicket, locate, usersById, engineerName, engineerEmail, notesFor, noteAuthor, buildingDepartment, me } = useFacilityData();
  const ticket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <Drawer anchor="right" open={Boolean(ticket)} onClose={closeTicket} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}>
      {ticket && (() => {
        const loc = locate(ticket.location_id);
        const notes = notesFor(ticket.id);
        const blocked = ticket.status === 'Blocked';
        const activeStep = blocked ? 1 : MAIN_FLOW.indexOf(ticket.status);
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 2.5, pb: 2 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">{ticketCode(ticket.id)} · {ticket.issue_type}</Typography>
                <Typography variant="h5" component="h2">{ticket.title}</Typography>
              </Box>
              <IconButton onClick={closeTicket} aria-label="Close" sx={{ alignSelf: 'flex-start' }}><CloseIcon /></IconButton>
            </Box>
            <Divider />
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, overflowY: 'auto' }}>
              <Box>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {MAIN_FLOW.map((s, i) => (
                    <Step key={s} completed={i < activeStep || ticket.status === 'Closed'}>
                      <StepLabel error={blocked && i === 1}>{blocked && i === 1 ? 'Blocked' : statusLabel(s)}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                {blocked && <Alert severity="error" sx={{ mt: 1.5 }}>Blocked while in progress. {notes.at(-1)?.body}</Alert>}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1, columnGap: 1.5 }}>
                <Detail label="Status"><StatusChip status={ticket.status} /></Detail>
                <Detail label="Priority"><PriorityLabel priority={ticket.priority} /></Detail>
                <Detail label="Issue type">{ticket.issue_type}</Detail>
                <Detail label="Location">
                  {loc.buildingName}{loc.floorNumber ? ` › Floor ${loc.floorNumber}` : ''}{loc.seatType ? ` › ${loc.seatType}` : ''}
                  <Typography variant="caption" display="block" sx={{ fontFamily: monoFont }} color="text.secondary">
                    {loc.code}{buildingDepartment(loc.buildingId) ? ` · ${buildingDepartment(loc.buildingId)} department` : ''}
                  </Typography>
                </Detail>
                <Detail label="Reported by">
                  {usersById[ticket.created_by_id]?.name ?? 'Unknown'}{ticket.created_at ? ` · ${formatAge(ticket.created_at)}` : ''}
                </Detail>
                <Detail label="Engineer">
                  {engineerName(ticket.assigned_to_id) ?? <Typography component="span" variant="body2" color="error">Unassigned</Typography>}
                  {engineerEmail(ticket.assigned_to_id) && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: monoFont }}>
                      {engineerEmail(ticket.assigned_to_id)}
                    </Typography>
                  )}
                </Detail>
                <Detail label="Description">{ticket.description}</Detail>
              </Box>

              <RoleControls ticket={ticket} />

              <Box>
                <Typography variant="overline" color="text.secondary">Notes · {notes.length}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 0.5 }}>
                  {!notes.length && <Typography variant="body2" color="text.secondary">No notes yet.</Typography>}
                  {notes.map((n) => (
                    <Box key={n.id} sx={{ borderLeft: 2, borderColor: n.author_id === me?.id ? 'primary.main' : 'divider', pl: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {n.author_id === me?.id ? 'You' : noteAuthor(n)} · {usersById[n.author_id]?.role ?? 'User'}
                      </Typography>
                      <Typography variant="body2">{n.body}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {(isActive(ticket) || ticket.status === 'Resolved') && <NoteForm key={ticket.id} ticket={ticket} />}
            </Box>
          </>
        );
      })()}
    </Drawer>
  );
}

export default TicketDrawer;
