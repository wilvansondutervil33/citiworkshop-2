import { Autocomplete, TextField } from '@mui/material';

const DEFAULT_SUGGESTIONS = 5;

// A dropdown you can type into. Empty box: the first few options. Typing: every option whose
// label (or extra searchText, e.g. an email) contains the text, ignoring case.
// options: [{ value: string, label: string, searchText?: string }]; value: the selected value or ''.
function SearchSelect({
  id, label, options, value, onChange, placeholder, disabled, size, error, helperText,
  noOptionsText = 'No matches', suggestions = DEFAULT_SUGGESTIONS, sx,
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  const filterOptions = (list, { inputValue }) => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return list.slice(0, suggestions);
    return list.filter((option) => `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(query));
  };

  return (
    <Autocomplete
      id={id}
      size={size}
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option ? option.value : '')}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, current) => option.value === current.value}
      filterOptions={filterOptions}
      noOptionsText={noOptionsText}
      disabled={disabled}
      sx={sx}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} error={error} helperText={helperText} />
      )}
    />
  );
}

export default SearchSelect;
