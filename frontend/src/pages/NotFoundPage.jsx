import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const NOT_FOUND_IMAGE = 'https://media.istockphoto.com/photos/error-page-not-found-picture-id1153372686?b=1&k=20&m=1153372686&s=170667a&w=0&h=4veHHEjI5rq2qpYWMXcHSzXfrp22SMwa79DsqqiYfAw=';

function NotFoundPage() {
  const { pathname } = useLocation();
  // Hide the image if the external host blocks or removes it, so the page still reads cleanly
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, py: { xs: 4, md: 8 } }}>
      {!imageFailed && (
        <Box
          component="img"
          src={NOT_FOUND_IMAGE}
          alt="Page not found"
          onError={() => setImageFailed(true)}
          sx={{ width: '100%', maxWidth: 480, borderRadius: 1 }}
        />
      )}
      <Typography variant="h4" component="h1">Page not found</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        There's nothing at <Box component="code" sx={{ fontFamily: 'monospace' }}>{pathname}</Box>. Check the address, or go back to your dashboard.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">Back to dashboard</Button>
    </Box>
  );
}

export default NotFoundPage;
