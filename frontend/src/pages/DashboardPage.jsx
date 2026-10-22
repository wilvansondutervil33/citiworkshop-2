import { Box } from '@mui/material';
import PageHeader from '../components/common/PageHeader.jsx';
import KpiRow from '../components/dashboard/KpiRow.jsx';
import WorkflowStrip from '../components/dashboard/WorkflowStrip.jsx';
import TicketFeed from '../components/dashboard/TicketFeed.jsx';
import EngineerWorkload from '../components/dashboard/EngineerWorkload.jsx';
import ReportIssueButton from '../components/tickets/ReportIssueButton.jsx';
import { useFacilityData } from '../context/FacilityDataContext.jsx';
import { isActive } from '../utils/tickets';

const twoColumns = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' };

function DashboardPage() {
  const { role, me, myEngineer, scopedTickets, tickets } = useFacilityData();

  if (role === 'Facility Admin') {
    const attention = tickets.filter((t) => t.status === 'Blocked' || (t.priority === 'Critical' && isActive(t)));
    return (
      <>
        <PageHeader title="Operations overview" subtitle={`All buildings · ${tickets.length} tickets on record`} actions={<ReportIssueButton />} />
        <Box sx={{ display: 'grid', gap: 2 }}>
          <KpiRow tickets={tickets} />
          <WorkflowStrip tickets={tickets} />
          <Box sx={twoColumns}>
            <TicketFeed title="Needs attention" subtitle="Blocked or critical, most urgent first" tickets={attention} limit={10} />
            <EngineerWorkload />
          </Box>
        </Box>
      </>
    );
  }

  if (role === 'Employee') {
    const firstName = me?.name?.split(' ')[0] ?? 'there';
    return (
      <>
        <PageHeader
          title={`Hi ${firstName}, here are your tickets`}
          subtitle="Engineers post updates on your tickets as notes."
          actions={<ReportIssueButton />}
        />
        <Box sx={{ display: 'grid', gap: 2 }}>
          <WorkflowStrip tickets={scopedTickets} />
          <TicketFeed
            title="Latest updates"
            subtitle="Latest note on each ticket"
            tickets={scopedTickets.filter((t) => isActive(t) || t.status === 'Resolved')}
          />
        </Box>
      </>
    );
  }

  const active = scopedTickets.filter(isActive);
  const limit = myEngineer?.max_workload ?? 5;
  return (
    <>
      <PageHeader title="My queue" subtitle={`${active.length} active of ${limit} slots · ${active.length < limit ? 'Available' : 'Busy'}`} actions={<ReportIssueButton />} />
      <Box sx={{ display: 'grid', gap: 2 }}>
        <WorkflowStrip tickets={scopedTickets} />
        <TicketFeed title="Up next" subtitle="Active tickets, critical first" tickets={active} />
      </Box>
    </>
  );
}

export default DashboardPage;
