export const compactToggleSx = {
  '& .MuiToggleButton-root': {
    px: 0.8,
    py: 0.25,
    fontSize: '0.65rem',
    fontWeight: 800,
       lineHeight: 1,
    minWidth: 0,
    border: '1px solid rgba(249,168,212,0.4)',
    color: '#C2709A',
    '&.Mui-selected': {
      bgcolor: 'rgba(249,168,212,0.2)',
      color: '#BE185D',
      borderColor: 'rgba(236,72,153,0.5)',
    },
    '&:hover:not(.Mui-selected)': {
      bgcolor: 'rgba(249,168,212,0.06)',
    },
  },
} as const;
