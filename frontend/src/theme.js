import { createTheme } from '@mui/material/styles';

const displayFont = '"Archivo", "Arial Narrow", system-ui, sans-serif';

export const monoFont = '"IBM Plex Mono", ui-monospace, monospace';

// Colours used by status chips, badges and charts. Components reference them as var(--name)
// (see utils/tickets.js), so they follow the light/dark mode without code changes.
const COLOR_VARS = {
  light: {
    '--status-open-fg': '#2f5bd3', '--status-open-bg': '#e6ecfb',
    '--status-progress-fg': '#b26a00', '--status-progress-bg': '#fbefd9',
    '--status-blocked-fg': '#c0362c', '--status-blocked-bg': '#fbe4e1',
    '--status-resolved-fg': '#1f7a4d', '--status-resolved-bg': '#dff2e7',
    '--status-closed-fg': '#5b6475', '--status-closed-bg': '#e9ebf0',
    // Categorical chart series, validated for colour-blind separation on the light surface
    '--series-1': '#2a78d6', '--series-2': '#eb6834', '--series-3': '#1baf7a', '--series-4': '#eda100',
    '--series-5': '#e87ba4', '--series-6': '#6250d6', '--series-7': '#008300', '--series-8': '#e34948',
    '--series-other': '#8a8f99',
  },
  dark: {
    '--status-open-fg': '#8eabff', '--status-open-bg': '#223058',
    '--status-progress-fg': '#f0b65a', '--status-progress-bg': '#3d3018',
    '--status-blocked-fg': '#ff8a7e', '--status-blocked-bg': '#47221f',
    '--status-resolved-fg': '#6fd29f', '--status-resolved-bg': '#1b3b2b',
    '--status-closed-fg': '#a5adbd', '--status-closed-bg': '#2a3040',
    // Same hues stepped for the dark surface, validated against #1a2030
    '--series-1': '#3987e5', '--series-2': '#d95926', '--series-3': '#199e70', '--series-4': '#c98500',
    '--series-5': '#d55181', '--series-6': '#9085e9', '--series-7': '#008300', '--series-8': '#e66767',
    '--series-other': '#7d869a',
  },
};

const PALETTES = {
  light: {
    primary: { main: '#2f5bd3' },
    background: { default: '#f3f4f7', paper: '#ffffff' },
    text: { primary: '#1b2230', secondary: '#4b5568' },
    divider: '#e1e4eb',
    rail: { main: '#1d2a44', contrastText: '#dfe5f2', muted: '#8f9bb6' },
  },
  dark: {
    primary: { main: '#7d9cff', contrastText: '#0d1220' },
    background: { default: '#12161f', paper: '#1a2030' },
    text: { primary: '#e6e9f0', secondary: '#aab2c3' },
    divider: '#2a3246',
    rail: { main: '#0d1220', contrastText: '#dfe5f2', muted: '#7f8aa5' },
  },
};

export function buildTheme(mode) {
  const theme = createTheme({
    palette: { mode, ...PALETTES[mode] },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 14,
      h4: { fontFamily: displayFont, fontWeight: 700, fontStretch: '85%', fontSize: '1.75rem' },
      h5: { fontFamily: displayFont, fontWeight: 700, fontSize: '1.25rem' },
      h6: { fontFamily: displayFont, fontWeight: 600, fontSize: '0.95rem' },
      overline: { fontFamily: monoFont, fontSize: '0.66rem', letterSpacing: '0.1em', lineHeight: 1.4 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiCssBaseline: { styleOverrides: { ':root': COLOR_VARS[mode] } },
    },
  });
  // Charts draw in SVG, where var() isn't reliable, so they look colours up here instead
  theme.colorVars = COLOR_VARS[mode];
  return theme;
}

// Turns 'var(--name)' into the current mode's colour value; other colours pass through
export function resolveColor(theme, color) {
  const match = /^var\((--[\w-]+)\)$/.exec(color ?? '');
  return match ? theme.colorVars?.[match[1]] ?? color : color;
}
