import { Box, Typography } from '@mui/material';
import { monoFont } from '../../theme';

// Horizontal bars; each row can stack several coloured segments
function BarList({ rows, max }) {
  const scale = Math.max(max ?? 0, ...rows.map((r) => r.segments.reduce((sum, s) => sum + s.value, 0)), 1);

  if (!rows.length) {
    return <Typography variant="body2" color="text.secondary">No tickets to chart yet.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {rows.map((row) => {
        const total = row.segments.reduce((sum, s) => sum + s.value, 0);
        return (
          <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: { xs: '90px 1fr 32px', sm: '130px 1fr 40px' }, alignItems: 'center', gap: 1.25 }}>
            <Typography variant="body2" noWrap title={row.label}>{row.label}</Typography>
            <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'background.default', overflow: 'hidden', display: 'flex' }}>
              {row.segments.map((s) => (
                <Box key={s.key} title={`${s.key}: ${s.value}`} sx={{ width: `${(s.value / scale) * 100}%`, bgcolor: s.color }} />
              ))}
            </Box>
            <Typography variant="body2" sx={{ fontFamily: monoFont, textAlign: 'right', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {total}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default BarList;
