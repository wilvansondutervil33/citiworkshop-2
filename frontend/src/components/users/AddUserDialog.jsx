import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { PASSWORD_HINT, passwordProblem } from '../../utils/password';

const ROLES = ['Employee', 'Engineer', 'Facility Admin'];
const EMPTY = { name: '', email: '', password: '', role: 'Employee', buildingId: '', maxWorkload: '5' };

// Mirrors the API's rules so most mistakes are caught before submitting
function validate(form) {
  const errors = {};
  const name = form.name.split(/\s+/).filter(Boolean).join(' ');
  if (name.length < 2) errors.name = "Enter a name with at least 2 characters that aren't spaces.";
  else if (name.length > 25) errors.name = 'Use at most 25 characters.';
  if (!/^[^\s@]+@acme\.inc$/i.test(form.email.trim())) errors.email = 'Use an @acme.inc email address.';
  const passwordError = passwordProblem(form.password);
  if (passwordError) errors.password = passwordError;
  if (form.role === 'Engineer') {
    if (!form.buildingId) errors.buildingId = 'Pick the building they work in.';
    if (!(Number(form.maxWorkload) >= 1)) errors.maxWorkload = 'Use 1 or more.';
  }
  return errors;
}

function AddUserDialog({ open, onClose }) {
  const { floors, buildingName, buildingDepartment, createUser } = useFacilityData();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const errors = validate(form);
  const showError = (field) => (touched ? errors[field] : undefined);
  const buildingIds = [...new Set(floors.map((f) => f.building_id))].sort((a, b) => a - b);

  const handleClose = () => {
    setForm(EMPTY);
    setTouched(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    const ok = await createUser({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
    setSubmitting(false);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, noValidate: true } }}>
      <DialogTitle>Add user</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField id="new-user-name" label="Full name" value={form.name} onChange={set('name')}
          error={Boolean(showError('name'))} helperText={showError('name')} slotProps={{ htmlInput: { maxLength: 25 } }} />
        <TextField id="new-user-email" label="Email" type="email" placeholder="first.last@acme.inc" value={form.email} onChange={set('email')}
          error={Boolean(showError('email'))} helperText={showError('email')} />
        <TextField id="new-user-password" label="Temporary password" type="password" value={form.password} onChange={set('password')}
          error={Boolean(showError('password'))} helperText={showError('password') ?? `${PASSWORD_HINT} Share it with them so they can log in.`} autoComplete="new-password" />
        <TextField id="new-user-role" select label="Role" value={form.role} onChange={set('role')}>
          {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        {form.role === 'Engineer' && (
          <>
            <TextField id="new-user-building" select label="Building" value={form.buildingId} onChange={set('buildingId')}
              error={Boolean(showError('buildingId'))}
              helperText={showError('buildingId') ?? 'New tickets in this building are auto-assigned to its engineers.'}>
              {buildingIds.map((id) => (
                <MenuItem key={id} value={String(id)}>
                  {buildingName(id)}{buildingDepartment(id) ? ` · ${buildingDepartment(id)}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField id="new-user-workload" label="Max open tickets" type="number" value={form.maxWorkload} onChange={set('maxWorkload')}
              error={Boolean(showError('maxWorkload'))} helperText={showError('maxWorkload')} slotProps={{ htmlInput: { min: 1 } }} />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={submitting}>Add user</Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddUserDialog;
