import { useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Divider, FormControlLabel, InputAdornment, ListItemIcon,
  Menu, MenuItem, Paper, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import DeskIcon from '@mui/icons-material/Chair';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WeekendIcon from '@mui/icons-material/Weekend';
import PlaceIcon from '@mui/icons-material/Place';
import PageHeader from '../components/common/PageHeader.jsx';
import {
  AddSeatsDialog, BuildingDialog, ConfirmDeactivateDialog, EditSeatDialog, FloorDialog, activeSeatCount,
} from '../components/facilities/FacilityDialogs.jsx';
import { useFacilityData } from '../context/FacilityDataContext.jsx';
import { STATUS_COLORS, isActive, ticketCode } from '../utils/tickets';
import { monoFont } from '../theme';

const SEAT_ICONS = {
  Desk: <DeskIcon fontSize="small" />,
  'Meeting Room': <MeetingRoomIcon fontSize="small" />,
  'Common Area': <WeekendIcon fontSize="small" />,
  Other: <PlaceIcon fontSize="small" />,
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const isOn = (item) => item.is_active !== false;

const deactivatedChip = <Chip size="small" label="Deactivated" sx={{ color: STATUS_COLORS.Blocked.fg, bgcolor: STATUS_COLORS.Blocked.bg }} />;

function SeatChip({ seat, openTickets, usable, onSelect }) {
  const hasIssue = openTickets.length > 0;
  const label = `#${seat.id} ${seat.seat_type}`;
  let sx = { justifyContent: 'flex-start', fontFamily: monoFont };
  if (!isOn(seat)) sx = { ...sx, opacity: 0.5, textDecoration: 'line-through' };
  else if (hasIssue) sx = { ...sx, color: STATUS_COLORS.Blocked.fg, bgcolor: STATUS_COLORS.Blocked.bg, '& .MuiChip-icon': { color: STATUS_COLORS.Blocked.fg } };

  const chip = (
    <Chip
      icon={SEAT_ICONS[seat.seat_type] ?? SEAT_ICONS.Other}
      label={hasIssue ? `${label} · ${openTickets.length}` : label}
      size="small"
      variant={hasIssue && isOn(seat) ? 'filled' : 'outlined'}
      onClick={usable || hasIssue ? (e) => onSelect(e.currentTarget, seat, openTickets) : undefined}
      sx={sx}
    />
  );
  if (!hasIssue) return chip;
  return (
    <Tooltip title={openTickets.map((t) => `${ticketCode(t.id)} · ${t.title}`).join('\n')} slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line' } } }}>
      {chip}
    </Tooltip>
  );
}

function FacilitiesPage() {
  const {
    allBuildings, allFloors, allSeats, tickets, engineers, buildingDepartment, openTicket, setFacilityActive,
  } = useFacilityData();
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  // Which dialog is open: { type, ...context }
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [seatMenu, setSeatMenu] = useState(null);

  const openBySeat = {};
  tickets.filter(isActive).forEach((t) => {
    (openBySeat[t.location_id] ??= []).push(t);
  });

  const q = query.trim().toLowerCase();
  const visibleBuildings = allBuildings
    .filter((b) => showInactive || isOn(b))
    .filter((b) => !q || [b.name, b.address, b.department].join(' ').toLowerCase().includes(q));

  const activeCounts = {
    buildings: allBuildings.filter(isOn).length,
    inactive: allBuildings.filter((b) => !isOn(b)).length + allFloors.filter((f) => !isOn(f)).length + allSeats.filter((s) => !isOn(s)).length,
  };

  const askDeactivate = (kind, item, label, description, openCount) => setConfirm({
    kind,
    item,
    label,
    description,
    warning: openCount ? `It has ${plural(openCount, 'open ticket')}, which stay open and keep their engineer.` : '',
  });

  const reactivate = (kind, item, label) => setFacilityActive(kind, item, true, label);

  return (
    <>
      <PageHeader
        title="Facilities"
        subtitle={`${plural(activeCounts.buildings, 'active building')}${activeCounts.inactive ? ` · ${activeCounts.inactive} deactivated items` : ''}`}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: 'building' })}>Add building</Button>}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          id="facility-search"
          size="small"
          placeholder="Search building, address or department…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 360 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <FormControlLabel
          control={<Switch id="show-inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
          label="Show deactivated"
        />
      </Box>

      {!visibleBuildings.length && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          {allBuildings.length ? 'No buildings match that search.' : 'No buildings yet. Select Add building to create the first one.'}
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {visibleBuildings.map((building, index) => {
          const buildingOn = isOn(building);
          const buildingFloors = allFloors
            .filter((f) => f.building_id === building.id && (showInactive || isOn(f)))
            .sort((a, b) => a.floor_number - b.floor_number);
          const floorIds = new Set(allFloors.filter((f) => f.building_id === building.id).map((f) => f.id));
          const buildingSeats = allSeats.filter((s) => floorIds.has(s.floor_id));
          const openCount = buildingSeats.reduce((sum, s) => sum + (openBySeat[s.id]?.length ?? 0), 0);
          const engineerCount = engineers.filter((e) => e.building_id === building.id).length;
          const department = buildingDepartment(building.id);
          const activeFloorCount = allFloors.filter((f) => f.building_id === building.id && isOn(f)).length;
          const activeSeatTotal = buildingSeats.filter(isOn).length;

          return (
            <Accordion key={building.id} defaultExpanded={index === 0} disableGutters variant="outlined"
              sx={{ '&::before': { display: 'none' }, borderRadius: 1, ...(buildingOn ? {} : { bgcolor: 'background.default' }) }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 0.5, width: '100%', pr: 1, opacity: buildingOn ? 1 : 0.7 }}>
                  <Box sx={{ minWidth: 0, flex: '1 1 220px' }}>
                    <Typography variant="h6" component="h2">{building.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{building.address}</Typography>
                  </Box>
                  {!buildingOn && deactivatedChip}
                  {department && <Chip size="small" label={department} color="primary" variant="outlined" />}
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {plural(activeFloorCount, 'floor')} · {plural(activeSeatTotal, 'seat')} · {plural(engineerCount, 'engineer')}
                  </Typography>
                  <Chip
                    size="small"
                    label={openCount ? plural(openCount, 'open ticket') : 'No open tickets'}
                    sx={openCount
                      ? { color: STATUS_COLORS.Blocked.fg, bgcolor: STATUS_COLORS.Blocked.bg, fontWeight: 500 }
                      : { color: STATUS_COLORS.Resolved.fg, bgcolor: STATUS_COLORS.Resolved.bg }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {buildingOn ? (
                    <>
                      <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setDialog({ type: 'floor', building })}>Add floor</Button>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => setDialog({ type: 'building', building })}>Edit building</Button>
                      <Button size="small" color="error" startIcon={<BlockIcon />}
                        onClick={() => askDeactivate('buildings', building, building.name,
                          'Its floors and seats will no longer appear when people report issues, and new tickets can\'t be logged there.', openCount)}>
                        Deactivate building
                      </Button>
                    </>
                  ) : (
                    <Button size="small" variant="outlined" startIcon={<RestoreIcon />} onClick={() => reactivate('buildings', building, building.name)}>
                      Reactivate building
                    </Button>
                  )}
                </Box>

                {!buildingFloors.length && <Typography variant="body2" color="text.secondary">No floors in this building yet.</Typography>}
                {buildingFloors.map((floor) => {
                  const floorOn = isOn(floor);
                  const usable = buildingOn && floorOn;
                  const floorSeats = allSeats
                    .filter((s) => s.floor_id === floor.id && (showInactive || isOn(s)))
                    .sort((a, b) => a.id - b.id);
                  const seatsUsed = activeSeatCount(allSeats, floor.id);
                  const full = seatsUsed >= floor.capacity;
                  const floorOpen = floorSeats.reduce((sum, s) => sum + (openBySeat[s.id]?.length ?? 0), 0);
                  const floorLabel = `${building.name} · Floor ${floor.floor_number}`;

                  return (
                    <Box key={floor.id} sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, opacity: floorOn ? 1 : 0.6 }}>Floor {floor.floor_number}</Typography>
                        {!floorOn && deactivatedChip}
                        <Typography variant="caption" color={full && floorOn ? 'error' : 'text.secondary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {seatsUsed} of {floor.capacity} seats{full && floorOn ? ' · full' : ''}
                          {floorOpen ? ` · ${plural(floorOpen, 'open ticket')}` : ''}
                        </Typography>
                        <Box sx={{ ml: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {usable && (
                            <Tooltip title={full ? `Floor is at capacity (${floor.capacity}). Raise its capacity or deactivate a seat first.` : ''}>
                              <span>
                                <Button size="small" startIcon={<AddIcon />} disabled={full}
                                  onClick={() => setDialog({ type: 'seats', floor, buildingName: building.name })}>
                                  {full ? 'Full' : 'Add seats'}
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                          {buildingOn && floorOn && (
                            <>
                              <Button size="small" startIcon={<EditIcon />} onClick={() => setDialog({ type: 'floor', building, floor })}>Edit</Button>
                              <Button size="small" color="error" startIcon={<BlockIcon />}
                                onClick={() => askDeactivate('floors', floor, floorLabel,
                                  'Its seats will no longer appear when people report issues.', floorOpen)}>
                                Deactivate
                              </Button>
                            </>
                          )}
                          {buildingOn && !floorOn && (
                            <Button size="small" startIcon={<RestoreIcon />} onClick={() => reactivate('floors', floor, floorLabel)}>Reactivate</Button>
                          )}
                        </Box>
                      </Box>
                      {floorSeats.length ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1, opacity: usable ? 1 : 0.6 }}>
                          {floorSeats.map((seat) => (
                            <SeatChip
                              key={seat.id}
                              seat={seat}
                              openTickets={openBySeat[seat.id] ?? []}
                              usable={usable}
                              onSelect={(anchor, s, open) => setSeatMenu({ anchor, seat: s, openTickets: open, usable, full })}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No seats on this floor yet.</Typography>
                      )}
                    </Box>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Select a seat to edit or deactivate it. Red seats have open tickets. Crossed-out seats are deactivated.
      </Typography>

      <Menu anchorEl={seatMenu?.anchor} open={Boolean(seatMenu)} onClose={() => setSeatMenu(null)}>
        {seatMenu?.openTickets.map((t) => (
          <MenuItem key={t.id} onClick={() => { setSeatMenu(null); openTicket(t.id); }}>
            <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
            {ticketCode(t.id)} · {t.title}
          </MenuItem>
        ))}
        {seatMenu?.openTickets.length > 0 && seatMenu?.usable && <Divider />}
        {seatMenu?.usable && isOn(seatMenu.seat) && [
          <MenuItem key="edit" onClick={() => { setDialog({ type: 'seat', seat: seatMenu.seat }); setSeatMenu(null); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Edit seat type
          </MenuItem>,
          <MenuItem key="deactivate" sx={{ color: 'error.main' }} onClick={() => {
            const { seat, openTickets } = seatMenu;
            setSeatMenu(null);
            askDeactivate('seats', seat, `seat #${seat.id}`, 'It will no longer appear when people report issues.', openTickets.length);
          }}>
            <ListItemIcon><BlockIcon fontSize="small" color="error" /></ListItemIcon>Deactivate seat
          </MenuItem>,
        ]}
        {seatMenu?.usable && !isOn(seatMenu.seat) && (
          <MenuItem disabled={seatMenu.full} onClick={() => { reactivate('seats', seatMenu.seat, `Seat #${seatMenu.seat.id}`); setSeatMenu(null); }}>
            <ListItemIcon><RestoreIcon fontSize="small" /></ListItemIcon>
            {seatMenu.full ? 'Floor is full, raise capacity to reactivate' : 'Reactivate seat'}
          </MenuItem>
        )}
      </Menu>

      {dialog?.type === 'building' && (
        <BuildingDialog key={dialog.building?.id ?? 'new'} open building={dialog.building} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'floor' && (
        <FloorDialog key={dialog.floor?.id ?? `new-${dialog.building.id}`} building={dialog.building} floor={dialog.floor} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'seats' && (
        <AddSeatsDialog key={dialog.floor.id} floor={dialog.floor} buildingName={dialog.buildingName} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'seat' && <EditSeatDialog key={dialog.seat.id} seat={dialog.seat} onClose={() => setDialog(null)} />}

      <ConfirmDeactivateDialog
        target={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const { kind, item, label } = confirm;
          setConfirm(null);
          setFacilityActive(kind, item, false, label.charAt(0).toUpperCase() + label.slice(1));
        }}
      />
    </>
  );
}

export default FacilitiesPage;
