import { Box, Chip, Typography } from '@mui/material';
import Panel from '../common/Panel.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { STATUS_COLORS, isActive } from '../../utils/tickets';

function EngineerWorkload() {
  const { engineers, tickets, engineerName, buildingName } = useFacilityData();

  const rows = engineers
    .map((engineer) => ({
      engineer,
      load: tickets.filter((t) => t.assigned_to_id === engineer.id && isActive(t)).length,
    }))
    .sort((a, b) => b.load - a.load);

  return (
    <Panel title="Engineer workload" subtitle="Active tickets against each engineer's limit">
      {!rows.length && <Typography variant="body2" color="text.secondary">No engineer profiles yet.</Typography>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {rows.map(({ engineer, load }) => {
          const available = load < engineer.max_workload;
          const colors = available ? STATUS_COLORS.Resolved : STATUS_COLORS['In-Progress'];
          return (
            <Box key={engineer.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2">
                  {engineerName(engineer.id)}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">{buildingName(engineer.building_id)}</Typography>
                </Typography>
                <Chip size="small" label={`${load}/${engineer.max_workload} · ${available ? 'Available' : 'Busy'}`} sx={{ color: colors.fg, bgcolor: colors.bg, fontWeight: 500 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${engineer.max_workload}, 1fr)`, gap: '3px' }}>
                {Array.from({ length: engineer.max_workload }, (_, i) => (
                  <Box key={i} sx={{ height: 6, borderRadius: '2px', bgcolor: i < load ? 'primary.main' : 'background.default' }} />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}

export default EngineerWorkload;
