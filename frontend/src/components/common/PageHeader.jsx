import { Box, Typography } from '@mui/material';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';

function PageHeader({ title, subtitle, actions }) {
  const { role } = useFacilityData();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">{role}</Typography>
        <Typography variant="h4" component="h1" sx={{ textWrap: 'balance' }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions}
    </Box>
  );
}

export default PageHeader;
