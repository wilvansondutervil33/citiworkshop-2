import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { ISSUE_TYPES, PRIORITIES } from '../../utils/tickets';

const EMPTY = { buildingId: '', floorId: '', seatId: '', title: '', description: '', issueType: 'Other', priority: 'Low' };

function ReportIssueDialog({ open, onClose }) {
  const { floors, seats, buildingName, createTicket } = useFacilityData();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const buildingIds = [...new Set(floors.map((f) => f.building_id))].sort((a, b) => a - b);
  const floorOptions = floors.filter((f) => f.building_id === Number(form.buildingId)).sort((a, b) => a.floor_number - b.floor_number);
  const seatOptions = seats.filter((s) => s.floor_id === Number(form.floorId));
  const valid = form.seatId && form.title.trim() && form.description.trim();

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
      issue_type: form.issueType,
      location_id: Number(form.seatId),
    });
    setSubmitting(false);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: 'form', onSubmit: handleSubmit } }}>
      <DialogTitle>Report an issue</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField id="report-building" select label="Building" value={form.buildingId}
          onChange={(e) => setForm((prev) => ({ ...prev, buildingId: e.target.value, floorId: '', seatId: '' }))}>
          {buildingIds.map((id) => <MenuItem key={id} value={String(id)}>{buildingName(id)}</MenuItem>)}
        </TextField>
        <TextField id="report-floor" select label="Floor" value={form.floorId} disabled={!form.buildingId}
          onChange={(e) => setForm((prev) => ({ ...prev, floorId: e.target.value, seatId: '' }))}>
          {floorOptions.map((f) => <MenuItem key={f.id} value={String(f.id)}>Floor {f.floor_number}</MenuItem>)}
        </TextField>
        <TextField id="report-seat" select label="Seat or room" value={form.seatId} disabled={!form.floorId} onChange={set('seatId')}>
          {seatOptions.map((s) => <MenuItem key={s.id} value={String(s.id)}>Seat {s.id} · {s.seat_type}</MenuItem>)}
        </TextField>
        <TextField id="report-issue-type" select label="Issue type" value={form.issueType} onChange={set('issueType')}>
          {ISSUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField id="report-title" label="What's wrong?" value={form.title} onChange={set('title')} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextField id="report-description" label="Details" multiline minRows={3} value={form.description} onChange={set('description')}
          helperText={`${form.description.length}/255`} slotProps={{ htmlInput: { maxLength: 255 } }} />
        <TextField id="report-priority" select label="Priority" value={form.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!valid || submitting}>Submit issue</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportIssueDialog;
