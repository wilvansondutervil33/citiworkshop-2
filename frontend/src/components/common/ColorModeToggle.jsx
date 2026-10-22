import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useColorMode } from '../../context/ColorModeContext.jsx';

const OPTIONS = [
  { value: 'light', label: 'Light mode', icon: <LightModeIcon fontSize="small" /> },
  { value: 'system', label: 'Match my computer', icon: <SettingsBrightnessIcon fontSize="small" /> },
  { value: 'dark', label: 'Dark mode', icon: <DarkModeIcon fontSize="small" /> },
];

function ColorModeToggle({ sx }) {
  const { preference, setPreference } = useColorMode();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={preference}
      onChange={(_, next) => next && setPreference(next)}
      aria-label="Colour mode"
      sx={sx}
    >
      {OPTIONS.map((option) => (
        <Tooltip key={option.value} title={option.label}>
          <ToggleButton value={option.value} aria-label={option.label} sx={{ color: 'inherit', px: 1.25 }}>
            {option.icon}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}

export default ColorModeToggle;
