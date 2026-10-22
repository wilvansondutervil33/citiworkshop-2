import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, InputAdornment, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import Panel from '../common/Panel.jsx';
import SearchSelect from '../common/SearchSelect.jsx';
import { PriorityLabel, StatusChip } from '../common/TicketBadges.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { ISSUE_TYPES, PRIORITIES, STATUSES, formatAge, statusLabel, ticketCode } from '../../utils/tickets';
import { monoFont } from '../../theme';

const PAGE_SIZE = 50;
// Today's date as YYYY-MM-DD in the viewer's timezone, the format date inputs use
const todayInput = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function TicketTable({ title, tickets }) {
  const { role, usersById, locate, engineerName, engineerEmail, openTicket, buildingName, floors } = useFacilityData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [building, setBuilding] = useState('');
  const [issueType, setIssueType] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(0);

  // Any filter change goes back to the first page of results
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const status = searchParams.get('status') ?? '';
  const setStatus = withPageReset((value) => setSearchParams(value ? { status: value } : {}));

  const hasFilters = Boolean(query || priority || issueType || building || createdFrom || createdTo || status);
  const clearFilters = () => {
    setQuery('');
    setPriority('');
    setIssueType('');
    setBuilding('');
    setCreatedFrom('');
    setCreatedTo('');
    setStatus('');
  };

  const isAdmin = role === 'Facility Admin';
  const isEngineer = role === 'Engineer';
  const showRaised = tickets.some((t) => t.created_at);
  const buildingOptions = [...new Set(floors.map((f) => f.building_id))]
    .sort((a, b) => a - b)
    .map((id) => ({ value: String(id), label: buildingName(id) }));

  // "Created from" / "Created to" include the whole of both days, in the viewer's local time
  const createdSince = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
  const createdUntil = createdTo ? new Date(`${createdTo}T23:59:59.999`) : null;

  const rows = tickets.filter((t) => {
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (issueType && t.issue_type !== issueType) return false;
    if (createdSince && !(t.created_at && new Date(t.created_at) >= createdSince)) return false;
    if (createdUntil && !(t.created_at && new Date(t.created_at) <= createdUntil)) return false;
    const loc = locate(t.location_id);
    if (building && loc.buildingId !== Number(building)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      ticketCode(t.id), t.title, t.description, t.issue_type, loc.buildingName, loc.code,
      usersById[t.created_by_id]?.name, engineerName(t.assigned_to_id) ?? 'unassigned', engineerEmail(t.assigned_to_id),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRows = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <Panel title={title} subtitle={`${rows.length} of ${tickets.length}`}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <TextField
          id="ticket-search"
          size="small"
          placeholder="Search title, seat code, person…"
          value={query}
          onChange={(e) => withPageReset(setQuery)(e.target.value)}
          sx={{ flex: '1 1 220px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField id="ticket-priority" select size="small" label="Priority" value={priority} onChange={(e) => withPageReset(setPriority)(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Any priority</MenuItem>
          {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField id="ticket-issue-type" select size="small" label="Issue type" value={issueType} onChange={(e) => withPageReset(setIssueType)(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Any type</MenuItem>
          {ISSUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField
          id="ticket-created-from"
          type="date"
          size="small"
          label="Created from"
          value={createdFrom}
          onChange={(e) => withPageReset(setCreatedFrom)(e.target.value)}
          sx={{ minWidth: 170 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: createdTo || todayInput() } }}
        />
        <TextField
          id="ticket-created-to"
          type="date"
          size="small"
          label="Created to"
          value={createdTo}
          onChange={(e) => withPageReset(setCreatedTo)(e.target.value)}
          sx={{ minWidth: 170 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: createdFrom || undefined, max: todayInput() } }}
        />
        {isAdmin && (
          <SearchSelect
            id="ticket-building"
            size="small"
            label="Building"
            placeholder="All buildings"
            options={buildingOptions}
            value={building}
            onChange={withPageReset(setBuilding)}
            noOptionsText="No buildings match"
            sx={{ minWidth: 220 }}
          />
        )}
        <Button variant="text" startIcon={<FilterAltOffIcon />} onClick={clearFilters} disabled={!hasFilters}>
          Clear filters
        </Button>
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
            {pageRows.map((t) => {
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
                      : assignee
                        ? (
                          <>
                            {assignee}
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: monoFont }}>
                              {engineerEmail(t.assigned_to_id)}
                            </Typography>
                          </>
                        )
                        : <Typography component="span" variant="body2" color="error">Unassigned</Typography>}
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
      {rows.length > PAGE_SIZE && (
        <TablePagination
          component="div"
          count={rows.length}
          page={currentPage}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count} tickets`}
          showFirstButton
          showLastButton
        />
      )}
    </Panel>
  );
}

export default TicketTable;
