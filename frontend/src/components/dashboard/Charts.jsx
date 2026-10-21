import { Box, Link, Typography } from '@mui/material';
import Panel from '../common/Panel.jsx';
import BarList from '../common/BarList.jsx';
import DonutChart from '../common/DonutChart.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { ISSUE_TYPES, ISSUE_TYPE_COLORS, PRIORITIES, PRIORITY_COLORS, STATUSES, STATUS_COLORS, countBy, isActive, statusLabel, ticketCode } from '../../utils/tickets';

// Categorical colours for buildings, assigned in a fixed order by building id
const BUILDING_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export function StatusChart({ tickets }) {
  const counts = countBy(tickets, (t) => t.status);
  const data = STATUSES.map((s) => ({ label: statusLabel(s), value: counts[s] || 0, color: STATUS_COLORS[s].fg }));
  return <Panel title="By status"><DonutChart data={data} /></Panel>;
}

export function PriorityChart({ tickets }) {
  const counts = countBy(tickets.filter(isActive), (t) => t.priority);
  const data = PRIORITIES.map((p) => ({ label: p, value: counts[p] || 0, color: PRIORITY_COLORS[p] }));
  return <Panel title="Active by priority"><DonutChart data={data} centerLabel="active" /></Panel>;
}

export function IssueTypeChart({ tickets }) {
  const counts = countBy(tickets, (t) => t.issue_type);
  const data = ISSUE_TYPES.map((t) => ({ label: t, value: counts[t] || 0, color: ISSUE_TYPE_COLORS[t] }));
  return <Panel title="Common issue types"><DonutChart data={data} /></Panel>;
}

export function BuildingChart({ tickets }) {
  const { buildings, floors, locate, buildingName } = useFacilityData();
  const counts = countBy(tickets, (t) => locate(t.location_id).buildingId);
  const ids = buildings.length
    ? buildings.map((b) => b.id)
    : [...new Set(floors.map((f) => f.building_id))];
  const sorted = [...ids].sort((a, b) => a - b);
  // Past eight buildings the extra ones fold into "Other buildings"
  const data = sorted.slice(0, BUILDING_COLORS.length - 1).map((id, i) => ({ label: buildingName(id), value: counts[id] || 0, color: BUILDING_COLORS[i] }));
  const rest = sorted.slice(BUILDING_COLORS.length - 1);
  if (rest.length === 1) {
    data.push({ label: buildingName(rest[0]), value: counts[rest[0]] || 0, color: BUILDING_COLORS.at(-1) });
  } else if (rest.length) {
    data.push({ label: 'Other buildings', value: rest.reduce((sum, id) => sum + (counts[id] || 0), 0), color: '#8a8f99' });
  }
  return <Panel title="Tickets by building"><DonutChart data={data} /></Panel>;
}

export function FloorHotspots({ tickets }) {
  const { locate } = useFacilityData();
  const counts = countBy(tickets, (t) => {
    const loc = locate(t.location_id);
    return loc.floorNumber ? `${loc.buildingName} · F${loc.floorNumber}` : loc.buildingName;
  });
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, segments: [{ key: label, value, color: STATUS_COLORS['In-Progress'].fg }] }));
  return <Panel title="Floor hotspots" subtitle={`Top ${rows.length} floors`}><BarList rows={rows} max={3} /></Panel>;
}

function Stat({ label, value, detail }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 700, fontSize: 26, lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{detail}</Typography>
    </Box>
  );
}

// How well reporters are kept informed: notes per ticket and active tickets with no update
export function CommunicationPanel({ tickets }) {
  const { notesFor, usersById, openTicket } = useFacilityData();
  const noteCounts = tickets.map((t) => ({ ticket: t, notes: notesFor(t.id).length }));
  const average = noteCounts.reduce((sum, x) => sum + x.notes, 0) / (noteCounts.length || 1);
  const silent = noteCounts.filter((x) => !x.notes && isActive(x.ticket));

  return (
    <Panel title="Reporter communication" subtitle="Are people kept informed?">
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 1.5 }}>
        <Stat label="Notes per ticket" value={average.toFixed(1)} detail="Average across all tickets" />
        <Stat label="Active, no update" value={silent.length} detail={silent.length ? 'Reporter has heard nothing' : 'Every active ticket has a note'} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {silent.map(({ ticket }) => (
          <Box key={ticket.id} sx={{ borderLeft: `2px solid ${STATUS_COLORS[ticket.status].fg}`, pl: 1.5 }}>
            <Link component="button" underline="hover" color="text.primary" onClick={() => openTicket(ticket.id)} sx={{ fontWeight: 600, textAlign: 'left' }}>
              {ticketCode(ticket.id)} · {ticket.title}
            </Link>
            <Typography variant="caption" display="block" color="text.secondary">Raised by {usersById[ticket.created_by_id]?.name ?? 'unknown'}</Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}
