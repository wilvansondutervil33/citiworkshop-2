import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { PRIORITIES } from '../../utils/tickets';

const EMPTY = { reporterId: '', buildingId: '', floorId: '', seatId: '', title: '', description: '', priority: 'Low' };

function ReportIssueDialog({ open, onClose }) {
  const { role, me, users, floors, seats, buildingName, buildingDepartment, createTicket } = useFacilityData();
  const isAdmin = role === 'Facility Admin';
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const buildingIds = [...new Set(floors.map((f) => f.building_id))].sort((a, b) => a - b);
  const floorOptions = floors.filter((f) => f.building_id === Number(form.buildingId)).sort((a, b) => a.floor_number - b.floor_number);
  const seatOptions = seats.filter((s) => s.floor_id === Number(form.floorId));
  const valid = form.seatId && form.title.trim() && form.description.trim();

  // Mirrors the API: the issue type comes from the building's department, which also picks the engineer
  const department = form.buildingId ? buildingDepartment(Number(form.buildingId)) : null;
  const autoAssigned = Boolean(department);
  let routingHint = null;
  if (form.buildingId) {
    routingHint = autoAssigned
      ? `Logged as a ${department} issue and sent to the least-busy engineer in this building.`
      : 'This building has no department, so the ticket is logged as Other and a facility admin will assign it.';
  }

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await createTicket({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      location_id: Number(form.seatId),
      ...(isAdmin && form.reporterId ? { created_by_id: Number(form.reporterId) } : {}),
    }, autoAssigned ? 'Issue reported and sent to an engineer' : 'Issue reported. A facility admin will assign it.');
    setSubmitting(false);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: 'form', onSubmit: handleSubmit } }}>
      <DialogTitle>{isAdmin ? 'New ticket' : 'Report an issue'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {isAdmin && (
          <TextField id="report-reporter" select label="Reported by" value={form.reporterId || String(me?.id ?? '')} onChange={set('reporterId')}>
            {users.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name} · {u.role}</MenuItem>)}
          </TextField>
        )}
        <TextField id="report-building" select label="Building" value={form.buildingId}
          onChange={(e) => setForm((prev) => ({ ...prev, buildingId: e.target.value, floorId: '', seatId: '' }))}>
          {buildingIds.map((id) => <MenuItem key={id} value={String(id)}>{buildingName(id)}{buildingDepartment(id) ? ` · ${buildingDepartment(id)}` : ''}</MenuItem>)}
        </TextField>
        <TextField id="report-floor" select label="Floor" value={form.floorId} disabled={!form.buildingId}
          onChange={(e) => setForm((prev) => ({ ...prev, floorId: e.target.value, seatId: '' }))}>
          {floorOptions.map((f) => <MenuItem key={f.id} value={String(f.id)}>Floor {f.floor_number}</MenuItem>)}
        </TextField>
        <TextField id="report-seat" select label="Seat or room" value={form.seatId} disabled={!form.floorId} onChange={set('seatId')}>
          {seatOptions.map((s) => <MenuItem key={s.id} value={String(s.id)}>Seat {s.id} · {s.seat_type}</MenuItem>)}
        </TextField>
        <TextField id="report-title" label="What's wrong?" value={form.title} onChange={set('title')} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextField id="report-description" label="Details" multiline minRows={3} value={form.description} onChange={set('description')}
          helperText={`${form.description.length}/255`} slotProps={{ htmlInput: { maxLength: 255 } }} />
        <TextField id="report-priority" select label="Priority" value={form.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        {routingHint && <Alert severity={autoAssigned ? 'success' : 'info'}>{routingHint}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!valid || submitting}>Submit issue</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportIssueDialog;
