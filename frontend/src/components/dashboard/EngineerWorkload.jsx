import { useState } from 'react';
import { Box, Chip, Link, Typography } from '@mui/material';
import Panel from '../common/Panel.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { STATUS_COLORS, isActive } from '../../utils/tickets';

// Lists engineers who can still take tickets (most free slots first); full ones are hidden
// behind "Show all" so it's easy to see who to assign work to
function EngineerWorkload() {
  const { engineers, tickets, engineerName, buildingName, buildingDepartment } = useFacilityData();
  const [showAll, setShowAll] = useState(false);

  const rows = engineers
    .map((engineer) => {
      const load = tickets.filter((t) => t.assigned_to_id === engineer.id && isActive(t)).length;
      return { engineer, load, free: engineer.max_workload - load };
    })
    .sort((a, b) => b.free - a.free || a.engineer.id - b.engineer.id);

  const withRoom = rows.filter((r) => r.free > 0);
  const atCapacity = rows.length - withRoom.length;
  const shown = showAll ? rows : withRoom;

  let summary = 'No engineer profiles yet.';
  if (rows.length) {
    summary = withRoom.length
      ? `${withRoom.length} of ${rows.length} engineers can take more tickets${atCapacity ? ` · ${atCapacity} at capacity` : ''}`
      : `All ${rows.length} engineers are at capacity. New tickets stay unassigned until someone frees up.`;
  }

  return (
    <Panel title="Engineer workload" subtitle={showAll ? 'All engineers' : 'Engineers with room for more tickets'}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{summary}</Typography>
        {atCapacity > 0 && (
          <Link component="button" type="button" variant="body2" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show only engineers with room' : 'Show all'}
          </Link>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {shown.map(({ engineer, load, free }) => {
          const available = free > 0;
          const colors = available ? STATUS_COLORS.Resolved : STATUS_COLORS['In-Progress'];
          return (
            <Box key={engineer.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2">
                  {engineerName(engineer.id)}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">{buildingName(engineer.building_id)}{buildingDepartment(engineer.building_id) ? ` · ${buildingDepartment(engineer.building_id)}` : ''}</Typography>
                </Typography>
                <Chip
                  size="small"
                  label={available ? `${free} free · ${load}/${engineer.max_workload}` : `Full · ${load}/${engineer.max_workload}`}
                  sx={{ color: colors.fg, bgcolor: colors.bg, fontWeight: 500 }}
                />
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
