import { TextField } from '@mui/material';

interface SmallFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiline?: boolean;
  endAdornment?: React.ReactNode;
  helperText?: React.ReactNode;
}

export function SmallField({ label, value, onChange, multiline, endAdornment, helperText }: SmallFieldProps) {
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
                   '& fieldset': { borderColor: 'rgba(249,168,212,0.35)' },
          '&:hover fieldset': { borderColor: '#F472B6' },
          '&.Mui-focused fieldset': { borderColor: '#EC4899', borderWidth: '1.5px' },
        },
        '& .MuiOutlinedInput-input': { py: '6px', px: '10px' },
        '& .MuiInputLabel-root': {
          fontSize: '0.72rem',
                   color: '#BE185D',
          '&.Mui-focused': { color: '#EC4899' },
        },
        '& .MuiFormHelperText-root': {
          fontSize: '0.62rem',
                   color: '#C2709A',
          mx: 0.5,
        },
      }}
    />
  );
}
