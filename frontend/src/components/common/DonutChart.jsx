import { Box, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { monoFont, resolveColor } from '../../theme';

function SliceTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: slice } = payload[0];
  return (
    <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: slice.color }} />
      <Typography variant="body2">{name}</Typography>
      <Typography variant="body2" sx={{ fontFamily: monoFont, fontWeight: 500 }}>
        {value} · {Math.round((value / total) * 100)}%
      </Typography>
    </Paper>
  );
}

// Part-to-whole donut with the total in the centre and a labelled legend,
// so each slice is identified by text as well as colour
function DonutChart({ data, centerLabel = 'tickets' }) {
  const theme = useTheme();
  // SVG fills need real colour values, not var(--…)
  const slices = data.filter((d) => d.value > 0).map((d) => ({ ...d, color: resolveColor(theme, d.color) }));
  const total = slices.reduce((sum, d) => sum + d.value, 0);

  if (!total) {
    return <Typography variant="body2" color="text.secondary">No tickets to chart yet.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: 160, height: 160, flex: 'none', mx: { xs: 'auto', sm: 0 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke={theme.palette.background.paper}
              strokeWidth={2}
              cornerRadius={2}
              isAnimationActive={false}
            >
              {slices.map((d) => <Cell key={d.label} fill={d.color} />)}
            </Pie>
            <Tooltip content={<SliceTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 700, fontSize: 26, lineHeight: 1 }}>{total}</Typography>
          <Typography variant="caption" color="text.secondary">{centerLabel}</Typography>
        </Box>
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {data.map((d) => (
          <Box component="li" key={d.label} sx={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, opacity: d.value ? 1 : 0.35 }} />
            <Typography variant="body2" noWrap title={d.label} color={d.value ? 'text.primary' : 'text.secondary'}>{d.label}</Typography>
            <Typography variant="body2" sx={{ fontFamily: monoFont, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
              {d.value} · {Math.round((d.value / total) * 100)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default DonutChart;
