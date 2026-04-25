import { TextField } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface SmallFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiline?: boolean;
  endAdornment?: React.ReactNode;
  helperText?: React.ReactNode;
}

export function SmallField({
  label,
  value,
  onChange,
  multiline,
  endAdornment,
  helperText,
}: SmallFieldProps) {
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={onChange}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      fullWidth
      helperText={helperText}
      slotProps={endAdornment ? { input: { endAdornment } } : undefined}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          fontSize: '0.78rem',
          '& fieldset': { borderColor: alpha(brand[300], 0.35) },
          '&:hover fieldset': { borderColor: brand[400] },
          '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: '1.5px' },
        },
        '& .MuiOutlinedInput-input': { py: '6px', px: '10px' },
        '& .MuiInputLabel-root': {
          fontSize: '0.72rem',
          color: brand[700],
          '&.Mui-focused': { color: brand[500] },
        },
        '& .MuiFormHelperText-root': {
          fontSize: '0.62rem',
          color: alpha(brand[700], 0.6),
          mx: 0.5,
        },
      }}
    />
  );
}
