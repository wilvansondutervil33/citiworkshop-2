import { useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReportIssueDialog from './ReportIssueDialog.jsx';

function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Report an issue</Button>
      <ReportIssueDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default ReportIssueButton;
