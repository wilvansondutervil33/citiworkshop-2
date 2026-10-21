import { createTheme } from '@mui/material/styles';

const displayFont = '"Archivo", "Arial Narrow", system-ui, sans-serif';

const theme = createTheme({
  palette: {
    primary: { main: '#2f5bd3' },
    background: { default: '#f3f4f7', paper: '#ffffff' },
    text: { primary: '#1b2230', secondary: '#4b5568' },
    divider: '#e1e4eb',
    rail: { main: '#1d2a44', contrastText: '#dfe5f2', muted: '#8f9bb6' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 14,
    h4: { fontFamily: displayFont, fontWeight: 700, fontStretch: '85%', fontSize: '1.75rem' },
    h5: { fontFamily: displayFont, fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontFamily: displayFont, fontWeight: 600, fontSize: '0.95rem' },
    overline: { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: '0.66rem', letterSpacing: '0.1em', lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export const monoFont = '"IBM Plex Mono", ui-monospace, monospace';

export default theme;
