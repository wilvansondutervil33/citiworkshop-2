import { useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReportIssueDialog from './ReportIssueDialog.jsx';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';

function ReportIssueButton() {
  const { role } = useFacilityData();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>{role === 'Facility Admin' ? 'New ticket' : 'Report an issue'}</Button>
      <ReportIssueDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default ReportIssueButton;
