import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#F9A8D4',
      light: '#FDE8F3',
      dark: '#D946EF',
    },
    secondary: {
      main: '#C4B5FD',
      light: '#EDE9FE',
      dark: '#8B5CF6',
    },
    background: {
      default: '#FFF5FB',
      paper: '#FFF2F8',
    },
    text: {
      primary: '#5E2F6C',
      secondary: '#A86C99',
    },
    divider: '#F7D2E5',
    error: { main: '#FB7185' },
    success: { main: '#34D399' },
    info: { main: '#60C8F5' },
    warning: { main: '#FBBF24' },
  },
  typography: {
    fontFamily: '"Nunito", "Noto Sans JP", sans-serif',
    h1: { fontFamily: '"Nunito", sans-serif', fontWeight: 800, letterSpacing: '-0.01em' },
    h2: { fontFamily: '"Nunito", sans-serif', fontWeight: 800 },
    h3: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Nunito", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Nunito", sans-serif', fontWeight: 600 },
    body1: { fontFamily: '"Nunito", sans-serif', fontSize: '0.95rem', fontWeight: 500 },
    body2: { fontFamily: '"Nunito", sans-serif', fontSize: '0.85rem', fontWeight: 500 },
    button: {
      fontFamily: '"Nunito", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'none',
      fontSize: '0.9rem',
    },
    caption: { fontFamily: '"Nunito", sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' },
  },
  shape: { borderRadius: 24 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '10px 26px',
          boxShadow: '0 6px 18px rgba(249, 168, 212, 0.26)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 26px rgba(249, 168, 212, 0.35)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        contained: {
          background: 'linear-gradient(135deg, #FEE2F1, #F472B6)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg, #FBCFE8, #F472B6)',
          },
        },
        outlined: {
          borderColor: '#F9A8D4',
          color: '#BE185D',
          borderWidth: 2,
          '&:hover': {
            borderColor: '#EC4899',
            backgroundColor: 'rgba(249, 168, 212, 0.14)',
          },
        },
        text: {
          color: '#D946EF',
          '&:hover': { backgroundColor: 'rgba(249, 168, 212, 0.12)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFF2F8',
          border: '2px solid #FBCFE8',
          borderRadius: 28,
          boxShadow: '0 12px 28px rgba(249, 168, 212, 0.14)',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 242, 248, 0.95), rgba(255, 229, 241, 0.95))',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: '0 16px 40px rgba(249, 168, 212, 0.24)',
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
            fontSize: '0.95rem',
            borderRadius: 18,
            backgroundColor: '#FFF1F8',
            '& fieldset': { borderColor: '#FBCFE8', borderWidth: 2 },
            '&:hover fieldset': { borderColor: '#F9A8D4', borderWidth: 2 },
            '&.Mui-focused fieldset': { borderColor: '#EF4444', borderWidth: 2 },
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
          fontSize: '0.8rem',
          borderRadius: 999,
          backgroundColor: '#FCE7F3',
          border: '1px solid #F9A8D4',
          color: '#BE185D',
          '&:hover': { backgroundColor: '#FBCFE8' },
        },
        deleteIcon: {
          color: '#EC4899',
          '&:hover': { color: '#D946EF' },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#F7D2E5', borderWidth: 1.5 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#D946EF',
          transition: 'all 0.2s ease',
          '&:hover': {
            color: '#BE185D',
            backgroundColor: 'rgba(249,168,212,0.18)',
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: '0 4px 16px rgba(249,168,212,0.12)' },
        elevation2: { boxShadow: '0 8px 26px rgba(249,168,212,0.16)' },
        elevation3: { boxShadow: '0 12px 40px rgba(249,168,212,0.2)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: '"Nunito", sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          backgroundColor: '#BE185D',
          borderRadius: 14,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 50, backgroundColor: '#FAD2E6', height: 12 },
        bar: { background: 'linear-gradient(90deg, #F9A8D4, #F472B6, #C4B5FD)', borderRadius: 50 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: '"Nunito", sans-serif',
          fontWeight: 600,
          borderRadius: 18,
          border: '2px solid #FBCFE8',
          backgroundColor: '#FFF0F6',
        },
      },
    },
  },
});