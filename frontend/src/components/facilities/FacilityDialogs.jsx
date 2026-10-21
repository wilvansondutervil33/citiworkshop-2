import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';

const DEPARTMENTS = ['Software', 'Hardware', 'Network', 'Plumbing', 'Structural'];
export const SEAT_TYPES = ['Desk', 'Meeting Room', 'Common Area', 'Other'];

// Active seats on a floor; capacity limits count these only
export const activeSeatCount = (allSeats, floorId) => allSeats.filter((s) => s.floor_id === floorId && s.is_active !== false).length;

// Shared shell: a form dialog that closes itself when onSubmit resolves true
function FormDialog({ open, title, submitLabel, onClose, onSubmit, children }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit();
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, noValidate: true } }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={submitting}>{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

// Add a building, or edit one when `building` is given
export function BuildingDialog({ open, building, onClose }) {
  const { createBuilding, updateBuilding } = useFacilityData();
  const [form, setForm] = useState({
    name: building?.name ?? '',
    address: building?.address ?? '',
    department: building?.department ?? '',
  });
  const [touched, setTouched] = useState(false);

  const errors = {};
  if (form.name.trim().length < 2 || form.name.trim().length > 25) errors.name = 'Use 2 to 25 characters.';
  if (form.address.trim().length < 5) errors.address = 'Use at least 5 characters.';
  const err = (f) => (touched ? errors[f] : undefined);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return false;
    const payload = { name: form.name.trim(), address: form.address.trim(), department: form.department || null };
    return building ? updateBuilding(building, payload) : createBuilding(payload);
  };

  return (
    <FormDialog open={open} title={building ? `Edit ${building.name}` : 'Add building'} submitLabel={building ? 'Save changes' : 'Add building'} onClose={onClose} onSubmit={submit}>
      <TextField id="building-name" label="Name" value={form.name} onChange={set('name')}
        error={Boolean(err('name'))} helperText={err('name')} slotProps={{ htmlInput: { maxLength: 25 } }} />
      <TextField id="building-address" label="Address" value={form.address} onChange={set('address')}
        error={Boolean(err('address'))} helperText={err('address')} slotProps={{ htmlInput: { maxLength: 200 } }} />
      <TextField id="building-department" select label="Department" value={form.department} onChange={set('department')}
        helperText="New tickets here are logged as this issue type and auto-assigned to the building's engineers.">
        <MenuItem value="">None (tickets stay unassigned)</MenuItem>
        {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
      </TextField>
    </FormDialog>
  );
}

// Add a floor to `building`, or edit `floor` when given
export function FloorDialog({ building, floor, onClose }) {
  const { allFloors, allSeats, createFloor, updateFloor } = useFacilityData();
  const taken = allFloors
    .filter((f) => f.building_id === building.id && f.is_active !== false && f.id !== floor?.id)
    .map((f) => f.floor_number);
  const seatsInUse = floor ? activeSeatCount(allSeats, floor.id) : 0;
  const [form, setForm] = useState({
    floorNumber: String(floor?.floor_number ?? (taken.length ? Math.max(...taken) + 1 : 1)),
    capacity: String(floor?.capacity ?? 10),
  });
  const [touched, setTouched] = useState(false);

  const number = Number(form.floorNumber);
  const capacity = Number(form.capacity);
  const errors = {};
  if (!Number.isInteger(number) || number < 1 || number > 100) errors.floorNumber = 'Use a whole number from 1 to 100.';
  else if (taken.includes(number)) errors.floorNumber = `Floor ${number} already exists in this building.`;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) errors.capacity = 'Use a whole number from 1 to 100.';
  else if (capacity < seatsInUse) errors.capacity = `This floor has ${seatsInUse} active seats. Deactivate some before lowering capacity.`;
  const err = (f) => (touched ? errors[f] : undefined);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return false;
    const payload = { building_id: building.id, floor_number: number, capacity };
    return floor ? updateFloor(floor, payload) : createFloor(payload);
  };

  return (
    <FormDialog
      open
      title={floor ? `Edit ${building.name} · Floor ${floor.floor_number}` : `Add floor to ${building.name}`}
      submitLabel={floor ? 'Save changes' : 'Add floor'}
      onClose={onClose}
      onSubmit={submit}
    >
      <TextField id="floor-number" label="Floor number" type="number" value={form.floorNumber} onChange={set('floorNumber')}
        error={Boolean(err('floorNumber'))} helperText={err('floorNumber')} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
      <TextField id="floor-capacity" label="Capacity (seats)" type="number" value={form.capacity} onChange={set('capacity')}
        error={Boolean(err('capacity'))}
        helperText={err('capacity') ?? (floor ? `${seatsInUse} active seats on this floor.` : undefined)}
        slotProps={{ htmlInput: { min: Math.max(1, seatsInUse), max: 100 } }} />
    </FormDialog>
  );
}

// Add seats to a floor, limited to the room left under its capacity
export function AddSeatsDialog({ floor, buildingName, onClose }) {
  const { allSeats, createSeats } = useFacilityData();
  const existing = activeSeatCount(allSeats, floor.id);
  const remaining = Math.max(0, floor.capacity - existing);
  const [form, setForm] = useState({ seatType: 'Desk', count: String(Math.min(1, remaining)) });
  const [touched, setTouched] = useState(false);

  const count = Number(form.count);
  const errors = {};
  if (!Number.isInteger(count) || count < 1) errors.count = 'Add at least 1 seat.';
  else if (count > remaining) errors.count = `Only ${remaining} seat${remaining === 1 ? '' : 's'} left before this floor reaches its capacity of ${floor.capacity}.`;
  const err = (f) => (touched ? errors[f] : undefined);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return false;
    return createSeats(floor.id, form.seatType, count);
  };

  return (
    <FormDialog
      open
      title={`Add seats to ${buildingName} · Floor ${floor.floor_number}`}
      submitLabel={count > 1 ? `Add ${count} seats` : 'Add seat'}
      onClose={onClose}
      onSubmit={submit}
    >
      <TextField id="seat-type" select label="Seat type" value={form.seatType} onChange={set('seatType')}>
        {SEAT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
      <TextField id="seat-count" label="How many" type="number" value={form.count} onChange={set('count')}
        error={Boolean(err('count'))}
        helperText={err('count') ?? `${existing} of ${floor.capacity} seats used · ${remaining} left`}
        slotProps={{ htmlInput: { min: 1, max: remaining } }} />
    </FormDialog>
  );
}

export function EditSeatDialog({ seat, onClose }) {
  const { updateSeat } = useFacilityData();
  const [seatType, setSeatType] = useState(seat.seat_type);

  return (
    <FormDialog open title={`Edit seat #${seat.id}`} submitLabel="Save changes" onClose={onClose}
      onSubmit={() => updateSeat(seat, { floor_id: seat.floor_id, seat_type: seatType })}>
      <TextField id="edit-seat-type" select label="Seat type" value={seatType} onChange={(e) => setSeatType(e.target.value)}>
        {SEAT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
    </FormDialog>
  );
}

// Confirmation before deactivating; `warning` adds context such as open tickets
export function ConfirmDeactivateDialog({ target, onCancel, onConfirm }) {
  return (
    <Dialog open={Boolean(target)} onClose={onCancel}>
      <DialogTitle>Deactivate {target?.label}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {target?.description}
          {target?.warning && ` ${target.warning}`}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Deactivate</Button>
      </DialogActions>
    </Dialog>
  );
}
