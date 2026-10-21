import { Box, Paper, Typography } from '@mui/material';

function Panel({ title, subtitle, action, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0, ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2">{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          {action}
        </Box>
      )}
      {children}
    </Paper>
  );
}

export default Panel;
