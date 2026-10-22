import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import SearchSelect from '../common/SearchSelect.jsx';
import { ISSUE_TYPES, priorityForIssueType } from '../../utils/tickets';

const EMPTY = { reporterId: '', buildingId: '', floorId: '', seatId: '', title: '', description: '', issueType: '' };

function ReportIssueDialog({ open, onClose }) {
  const { role, me, users, tickets, floors, seats, buildingName, buildingDepartment, createTicket } = useFacilityData();
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

  // Mirrors the API: the issue type defaults to the building's department, engineers are only
  // auto-assigned when the two match, and the priority comes from the issue type's history
  const department = form.buildingId ? buildingDepartment(Number(form.buildingId)) : null;
  const issueType = form.issueType || department || 'Other';
  const autoAssigned = Boolean(department) && issueType === department;
  const expected = priorityForIssueType(tickets, issueType);
  let routingHint = null;
  if (form.buildingId) {
    const routing = autoAssigned
      ? `It goes to the least-busy ${department} engineer in this building.`
      : `This building's engineers handle ${department ?? 'no specific'} issues, so a facility admin will assign it.`;
    const priority = expected.count
      ? `Priority will be ${expected.priority}: ${issueType} issues take ${expected.days.toFixed(1)} days to close on average.`
      : `Priority will be Low: there are no closed ${issueType} tickets to go on yet.`;
    routingHint = `${routing} ${priority}`;
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
      issue_type: issueType,
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
          onChange={(value) => setForm((prev) => ({ ...prev, buildingId: value, floorId: '', seatId: '', issueType: '' }))}
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
        <TextField
          id="report-issue-type"
          select
          label="Issue type"
          value={issueType}
          onChange={set('issueType')}
          helperText={department ? `Defaults to this building's department (${department})` : 'Pick a building to see its department'}
        >
          {ISSUE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
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
