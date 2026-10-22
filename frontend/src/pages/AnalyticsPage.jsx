import { Box } from '@mui/material';
import PageHeader from '../components/common/PageHeader.jsx';
import KpiRow from '../components/dashboard/KpiRow.jsx';
import EngineerWorkload from '../components/dashboard/EngineerWorkload.jsx';
import {
  BuildingChart, CommunicationPanel, FloorHotspots, IssueTypeChart, PriorityChart, ResolutionTimeByType, StatusChart,
} from '../components/dashboard/Charts.jsx';
import { useFacilityData } from '../context/FacilityDataContext.jsx';

const SUBTITLES = {
  'Facility Admin': 'Trends across every building, floor and engineer.',
  Employee: 'How your reported issues have been handled.',
  Engineer: 'How your assigned tickets are moving.',
};

const twoColumns = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' };
const columns = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, alignItems: 'start' };

function AnalyticsPage() {
  const { role, scopedTickets } = useFacilityData();
  const isAdmin = role === 'Facility Admin';

  return (
    <>
      <PageHeader title="Analytics" subtitle={SUBTITLES[role]} />
      <Box sx={{ display: 'grid', gap: 2 }}>
        <KpiRow tickets={scopedTickets} />
        <Box sx={columns}>
          <StatusChart tickets={scopedTickets} />
          <PriorityChart tickets={scopedTickets} />
          {isAdmin ? <BuildingChart tickets={scopedTickets} /> : <IssueTypeChart tickets={scopedTickets} />}
        </Box>
        {isAdmin ? (
          <>
            <Box sx={columns}>
              <IssueTypeChart tickets={scopedTickets} />
              <FloorHotspots tickets={scopedTickets} />
              <CommunicationPanel tickets={scopedTickets} />
            </Box>
            <Box sx={twoColumns}>
              <ResolutionTimeByType tickets={scopedTickets} />
              <EngineerWorkload />
            </Box>
          </>
        ) : (
          <Box sx={twoColumns}>
            <ResolutionTimeByType tickets={scopedTickets} />
            <CommunicationPanel tickets={scopedTickets} />
          </Box>
        )}
      </Box>
    </>
  );
}

export default AnalyticsPage;
