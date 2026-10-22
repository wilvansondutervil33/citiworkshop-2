import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, InputAdornment, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddUserDialog from '../components/users/AddUserDialog.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Panel from '../components/common/Panel.jsx';
import { useFacilityData } from '../context/FacilityDataContext.jsx';
import { STATUS_COLORS as TICKET_COLORS, isActive } from '../utils/tickets';
import { monoFont } from '../theme';

const PAGE_SIZE = 20;

const ROLES = ['Facility Admin', 'Employee', 'Engineer'];

// Reuse the ticket status colours so roles and account status follow light/dark mode
const ROLE_COLORS = {
  'Facility Admin': TICKET_COLORS.Open,
  Engineer: TICKET_COLORS.Resolved,
  Employee: TICKET_COLORS.Closed,
};

const STATUS_COLORS = {
  active: TICKET_COLORS.Resolved,
  inactive: TICKET_COLORS.Blocked,
};

function UsersPage() {
  const { users, engineers, tickets, me, setUserActive } = useFacilityData();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(0);

  // Any search or filter change goes back to the first page
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const rows = users.map((user) => {
    const engineer = engineers.find((e) => e.user_id === user.id);
    const active = engineer
      ? tickets.filter((t) => t.assigned_to_id === engineer.id && isActive(t)).length
      : tickets.filter((t) => t.created_by_id === user.id && isActive(t)).length;
    return { ...user, engineer, active };
  });

  const inactiveCount = rows.filter((r) => !r.is_active).length;

  const visible = rows.filter((r) => {
    if (role && r.role !== role) return false;
    if (status === 'active' && !r.is_active) return false;
    if (status === 'inactive' && r.is_active) return false;
    const q = query.trim().toLowerCase();
    return !q || [r.name, r.email, r.role].join(' ').toLowerCase().includes(q);
  });

  const lastPage = Math.max(0, Math.ceil(visible.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRows = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const changeStatus = async (user, active) => {
    setConfirming(null);
    setSavingId(user.id);
    await setUserActive(user, active);
    setSavingId(null);
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${users.length} people · ${inactiveCount ? `${inactiveCount} deactivated` : 'all active'}`}
        actions={<Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAdding(true)}>Add user</Button>}
      />
      <AddUserDialog open={adding} onClose={() => setAdding(false)} />
      <Panel title="All users" subtitle={`${visible.length} of ${rows.length}`}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <TextField
            id="user-search"
            size="small"
            placeholder="Search name or email…"
            value={query}
            onChange={(e) => withPageReset(setQuery)(e.target.value)}
            sx={{ flex: '1 1 220px' }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <TextField id="user-role" select size="small" label="Role" value={role} onChange={(e) => withPageReset(setRole)(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All roles</MenuItem>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField id="user-status" select size="small" label="Status" value={status} onChange={(e) => withPageReset(setStatus)(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Deactivated</MenuItem>
          </TextField>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Active tickets</TableCell>
                <TableCell align="right" aria-label="Actions" />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((r) => {
                const roleColors = ROLE_COLORS[r.role] ?? ROLE_COLORS.Employee;
                const statusColors = r.is_active ? STATUS_COLORS.active : STATUS_COLORS.inactive;
                const isMe = r.id === me?.id;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ opacity: r.is_active ? 1 : 0.6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}{isMe ? ' (you)' : ''}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: monoFont }}>{r.email}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={r.role} sx={{ color: roleColors.fg, bgcolor: roleColors.bg, fontWeight: 500 }} /></TableCell>
                    <TableCell>
                      <Chip size="small" label={r.is_active ? 'Active' : 'Deactivated'} sx={{ color: statusColors.fg, bgcolor: statusColors.bg, fontWeight: 500 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }}>
                      {r.engineer ? `${r.active}/${r.engineer.max_workload}` : r.role === 'Employee' ? r.active : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {r.is_active ? (
                        <Button
                          size="small" color="error" variant="outlined"
                          disabled={isMe || savingId === r.id}
                          title={isMe ? "You can't deactivate your own account" : undefined}
                          onClick={() => setConfirming(r)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" disabled={savingId === r.id} onClick={() => changeStatus(r, true)}>
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!visible.length && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                    No users match these filters. Clear the search or pick another role or status.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {visible.length > PAGE_SIZE && (
          <TablePagination
            component="div"
            count={visible.length}
            page={currentPage}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count} users`}
            showFirstButton
            showLastButton
          />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Active tickets: for engineers, open tickets assigned to them out of their limit; for employees, open tickets they reported.
        </Typography>
      </Panel>

      <Dialog open={Boolean(confirming)} onClose={() => setConfirming(null)}>
        <DialogTitle>Deactivate {confirming?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            They will be signed out and can't log in until you reactivate them. Their tickets and notes stay as they are.
            {confirming?.engineer && confirming.active > 0
              && ` They still have ${confirming.active} open ticket${confirming.active === 1 ? '' : 's'} assigned. Reassign ${confirming.active === 1 ? 'it' : 'them'} from the Tickets page.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirming(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => changeStatus(confirming, false)}>Deactivate</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default UsersPage;
