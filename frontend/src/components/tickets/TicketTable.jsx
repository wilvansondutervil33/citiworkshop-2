import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Chip, InputAdornment, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Panel from '../common/Panel.jsx';
import { PriorityLabel, StatusChip } from '../common/TicketBadges.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { ISSUE_TYPES, PRIORITIES, STATUSES, formatAge, statusLabel, ticketCode } from '../../utils/tickets';
import { monoFont } from '../../theme';

function TicketTable({ title, tickets }) {
  const { role, usersById, locate, engineerName, openTicket, buildingName, floors } = useFacilityData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [building, setBuilding] = useState('');
  const [issueType, setIssueType] = useState('');

  const status = searchParams.get('status') ?? '';
  const setStatus = (value) => setSearchParams(value ? { status: value } : {});

  const isAdmin = role === 'Facility Admin';
  const isEngineer = role === 'Engineer';
  const showRaised = tickets.some((t) => t.created_at);
  const buildingIds = [...new Set(floors.map((f) => f.building_id))].sort((a, b) => a - b);

  const rows = tickets.filter((t) => {
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (issueType && t.issue_type !== issueType) return false;
    const loc = locate(t.location_id);
    if (building && loc.buildingId !== Number(building)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      ticketCode(t.id), t.title, t.description, t.issue_type, loc.buildingName, loc.code,
      usersById[t.created_by_id]?.name, engineerName(t.assigned_to_id) ?? 'unassigned',
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  return (
    <Panel title={title} subtitle={`${rows.length} of ${tickets.length}`}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <TextField
          id="ticket-search"
          size="small"
          placeholder="Search title, seat code, person…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: '1 1 220px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField id="ticket-priority" select size="small" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Any priority</MenuItem>
          {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField id="ticket-issue-type" select size="small" label="Issue type" value={issueType} onChange={(e) => setIssueType(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Any type</MenuItem>
          {ISSUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        {isAdmin && (
          <TextField id="ticket-building" select size="small" label="Building" value={building} onChange={(e) => setBuilding(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All buildings</MenuItem>
            {buildingIds.map((id) => <MenuItem key={id} value={String(id)}>{buildingName(id)}</MenuItem>)}
          </TextField>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Chip label="All" onClick={() => setStatus('')} color={status ? 'default' : 'primary'} variant={status ? 'outlined' : 'filled'} />
        {STATUSES.map((s) => (
          <Chip key={s} label={statusLabel(s)} onClick={() => setStatus(s)} color={status === s ? 'primary' : 'default'} variant={status === s ? 'filled' : 'outlined'} />
        ))}
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Issue</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>{isEngineer ? 'Reported by' : 'Assignee'}</TableCell>
              {showRaised && <TableCell>Raised</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((t) => {
              const loc = locate(t.location_id);
              const assignee = engineerName(t.assigned_to_id);
              return (
                <TableRow
                  key={t.id}
                  hover
                  tabIndex={0}
                  onClick={() => openTicket(t.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openTicket(t.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontFamily: monoFont, color: 'text.secondary', whiteSpace: 'nowrap' }}>{ticketCode(t.id)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.issue_type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: monoFont, whiteSpace: 'nowrap' }}>{loc.code}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {loc.buildingName}{loc.floorNumber ? ` · F${loc.floorNumber}` : ''}{loc.seatType ? ` · ${loc.seatType}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell><PriorityLabel priority={t.priority} /></TableCell>
                  <TableCell><StatusChip status={t.status} /></TableCell>
                  <TableCell>
                    {isEngineer
                      ? usersById[t.created_by_id]?.name
                      : assignee ?? <Typography component="span" variant="body2" color="error">Unassigned</Typography>}
                  </TableCell>
                  {showRaised && <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{formatAge(t.created_at)}</TableCell>}
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  No tickets match these filters. Clear the search or pick another status.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Panel>
  );
}

export default TicketTable;
