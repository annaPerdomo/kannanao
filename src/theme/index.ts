import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#F472B6',
      light: '#FDE8F3',
      dark: '#BE185D',
    },
    secondary: {
      main: '#C4B5FD',
      light: '#EDE9FE',
      dark: '#8B5CF6',
    },
    background: {
      default: '#FFF5FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#5E2F6C',
      secondary: '#A86C99',
    },
    divider: 'rgba(249,168,212,0.35)',
    error: { main: '#FB7185' },
    success: { main: '#34D399' },
    info: { main: '#60C8F5' },
    warning: { main: '#FBBF24' },
  },
  typography: {
    fontFamily: '"Nunito", "Noto Sans JP", sans-serif',
    h1: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.015em' },
    h3: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Nunito", sans-serif', fontWeight: 600 },
    body1: { fontFamily: '"Nunito", sans-serif', fontSize: '0.95rem', fontWeight: 500 },
    body2: { fontFamily: '"Nunito", sans-serif', fontSize: '0.85rem', fontWeight: 500 },
    button: {
      fontFamily: '"Nunito", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.02em',
      textTransform: 'none',
      fontSize: '0.875rem',
    },
    caption: { fontFamily: '"Nunito", sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em' },
  },
  // Keep shape borderRadius low — components override individually as needed
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // Base: tasteful pill for most buttons, overridden per-context with sx
          borderRadius: 10,
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.18s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 16px rgba(249,168,212,0.28)',
          },
          '&:active': { transform: 'translateY(0)', boxShadow: 'none' },
          '&.Mui-disabled': { opacity: 0.45, transform: 'none', boxShadow: 'none' },
        },
        contained: {
          background: 'linear-gradient(135deg, #FBCFE8 0%, #F472B6 100%)',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(244,114,182,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 100%)',
            boxShadow: '0 6px 18px rgba(244,114,182,0.38)',
          },
        },
        outlined: {
          borderColor: 'rgba(249,168,212,0.7)',
          borderWidth: '1.5px',
          color: '#BE185D',
          '&:hover': {
            borderColor: '#F472B6',
            borderWidth: '1.5px',
            backgroundColor: 'rgba(249,168,212,0.08)',
          },
        },
        text: {
          color: '#BE185D',
          '&:hover': { backgroundColor: 'rgba(249,168,212,0.1)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1.5px solid rgba(249,168,212,0.3)',
          borderRadius: 14,
          boxShadow: '0 2px 10px rgba(249,168,212,0.12)',
          backgroundImage: 'none',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(249,168,212,0.22)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 600,
            fontSize: '0.9rem',
            borderRadius: 10,
            backgroundColor: '#FFF8FC',
            '& fieldset': { borderColor: 'rgba(249,168,212,0.5)', borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: '#F9A8D4', borderWidth: '1.5px' },
            '&.Mui-focused fieldset': { borderColor: '#F472B6', borderWidth: '1.5px' },
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Nunito", sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#BE74A5',
            '&.Mui-focused': { color: '#EC4899' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Nunito", sans-serif',
          fontWeight: 700,
          fontSize: '0.75rem',
          borderRadius: 8,
          backgroundColor: '#FCE7F3',
          border: '1px solid rgba(249,168,212,0.6)',
          color: '#BE185D',
          height: 24,
          '&:hover': { backgroundColor: '#FBCFE8' },
        },
        deleteIcon: {
          color: '#EC4899',
          fontSize: '14px !important',
          '&:hover': { color: '#BE185D' },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(249,168,212,0.3)', borderWidth: 1 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#EC4899',
          borderRadius: 8,
          transition: 'all 0.18s ease',
          '&:hover': {
            color: '#BE185D',
            backgroundColor: 'rgba(249,168,212,0.14)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: '0 2px 10px rgba(249,168,212,0.1)' },
        elevation2: { boxShadow: '0 4px 16px rgba(249,168,212,0.14)' },
        elevation3: { boxShadow: '0 8px 28px rgba(249,168,212,0.18)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: '"Nunito", sans-serif',
          fontWeight: 600,
          fontSize: '0.78rem',
          backgroundColor: '#BE185D',
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, backgroundColor: '#FAD2E6', height: 8 },
        bar: { background: 'linear-gradient(90deg, #F9A8D4, #F472B6)', borderRadius: 6 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: '"Nunito", sans-serif',
          fontWeight: 600,
          borderRadius: 10,
          border: '1.5px solid rgba(249,168,212,0.4)',
          backgroundColor: '#FFF5FB',
        },
      },
    },
  },
});