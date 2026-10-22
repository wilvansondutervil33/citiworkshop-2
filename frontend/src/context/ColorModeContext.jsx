import { createContext, useContext, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from '../theme';

const STORAGE_KEY = 'colorMode';
const PREFERENCES = ['light', 'system', 'dark'];

const ColorModeContext = createContext(null);

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

// Light, dark, or follow the operating system; the choice is remembered in this browser
export function ColorModeProvider({ children }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const [preference, setPreferenceState] = useState(readPreference);

  const setPreference = (next) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private windows); the choice still applies for this visit
    }
  };

  const mode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ preference, setPreference, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (context === null) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return context;
}
