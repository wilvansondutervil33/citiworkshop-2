import PageHeader from '../components/common/PageHeader.jsx';
import TicketTable from '../components/tickets/TicketTable.jsx';
import ReportIssueButton from '../components/tickets/ReportIssueButton.jsx';
import { useFacilityData } from '../context/FacilityDataContext.jsx';

const COPY = {
  'Facility Admin': ['All tickets', 'Search, filter and open any ticket to assign or update it.'],
  Employee: ['My tickets', 'Every issue you have reported.'],
  Engineer: ['Assigned to me', 'Open a ticket to change its status or add a note.'],
};

function TicketsPage() {
  const { role, scopedTickets } = useFacilityData();
  const [title, subtitle] = COPY[role] ?? COPY.Employee;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={role === 'Employee' ? <ReportIssueButton /> : null} />
      <TicketTable title={title} tickets={scopedTickets} />
    </>
  );
}

export default TicketsPage;
