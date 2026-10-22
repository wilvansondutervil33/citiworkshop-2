import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import SearchSelect from '../common/SearchSelect.jsx';
import { PRIORITIES } from '../../utils/tickets';

const EMPTY = { reporterId: '', buildingId: '', floorId: '', seatId: '', title: '', description: '', priority: 'Low' };

function ReportIssueDialog({ open, onClose }) {
  const { role, me, users, floors, seats, buildingName, buildingDepartment, createTicket } = useFacilityData();
  const isAdmin = role === 'Facility Admin';
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const reporterOptions = users
    .filter((u) => u.is_active !== false)
    .map((u) => ({ value: String(u.id), label: `${u.name} · ${u.role}`, searchText: u.email }));
  const buildingOptions = [...new Set(floors.map((f) => f.building_id))]
    .sort((a, b) => a - b)
    .map((id) => ({
      value: String(id),
      label: `${buildingName(id)}${buildingDepartment(id) ? ` · ${buildingDepartment(id)}` : ''}`,
    }));
  const floorOptions = floors
    .filter((f) => f.building_id === Number(form.buildingId))
    .sort((a, b) => a.floor_number - b.floor_number)
    .map((f) => ({ value: String(f.id), label: `Floor ${f.floor_number}` }));
  const seatOptions = seats
    .filter((s) => s.floor_id === Number(form.floorId))
    .sort((a, b) => a.id - b.id)
    .map((s) => ({ value: String(s.id), label: `Seat ${s.id} · ${s.seat_type}` }));
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
          <SearchSelect
            id="report-reporter"
            label="Reported by"
            placeholder="Type a name or email"
            options={reporterOptions}
            value={form.reporterId || String(me?.id ?? '')}
            onChange={(value) => setForm((prev) => ({ ...prev, reporterId: value }))}
            helperText={form.reporterId ? undefined : 'Defaults to you'}
            noOptionsText="No people match"
          />
        )}
        <SearchSelect
          id="report-building"
          label="Building"
          placeholder="Type a building name"
          options={buildingOptions}
          value={form.buildingId}
          onChange={(value) => setForm((prev) => ({ ...prev, buildingId: value, floorId: '', seatId: '' }))}
          noOptionsText="No buildings match"
        />
        <SearchSelect
          id="report-floor"
          label="Floor"
          placeholder={form.buildingId ? 'Type a floor number' : 'Pick a building first'}
          options={floorOptions}
          value={form.floorId}
          disabled={!form.buildingId}
          onChange={(value) => setForm((prev) => ({ ...prev, floorId: value, seatId: '' }))}
          noOptionsText="No floors match"
        />
        <SearchSelect
          id="report-seat"
          label="Seat or room"
          placeholder={form.floorId ? 'Type a seat number or type' : 'Pick a floor first'}
          options={seatOptions}
          value={form.seatId}
          disabled={!form.floorId}
          onChange={(value) => setForm((prev) => ({ ...prev, seatId: value }))}
          noOptionsText="No seats match"
        />
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
