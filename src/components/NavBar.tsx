'use client';
import {
  AppBar, Toolbar, Box, Typography, Button, useScrollTrigger, Slide,
  Snackbar, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import { usePathname, useRouter } from 'next/navigation';
import { useDeckDialog } from '@/contexts/DeckDialogContext';
import { useProgress } from '@/hooks/useProgess';
import { useEffect } from 'react';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const isStats = pathname === '/stats';
  const { openNewDeckDialog } = useDeckDialog();
  const { progress, newlyUnlocked, clearNewlyUnlocked } = useProgress();

  const trigger = useScrollTrigger({ threshold: 10 });

  // Auto-dismiss toast after 4 s
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const t = setTimeout(clearNewlyUnlocked, 4000);
      return () => clearTimeout(t);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  const navBtn = {
    color: '#BE185D',
    fontFamily: '"DM Serif Display", serif',
    fontWeight: 400,
    fontSize: '0.9rem',
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
    borderRadius: 6,
    px: 1.5,
    minWidth: 0,
    '&:hover': { bgcolor: 'rgba(249,168,212,0.18)' },
  };

  return (
    <>
      <Slide appear={false} direction="down" in={!trigger}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 242, 248, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(249,168,212,0.35)',
            boxShadow: '0 2px 20px rgba(249,168,212,0.12)',
          }}
        >
          <Toolbar
            sx={{
              maxWidth: 1100,
              width: '100%',
              mx: 'auto',
              px: { xs: 2, sm: 4 },
              minHeight: { xs: 56, sm: 64 },
              gap: 1.5,
            }}
          >
            {/* Brand */}
            <Box
              onClick={() => router.push('/')}
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                mr: 'auto',
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.75,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: { xs: '1.2rem', sm: '1.4rem' },
                  color: '#BE185D',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                🌸 Kannanao
              </Typography>
            </Box>

            {/* Streak pill — shown when streak > 0 */}
            {progress && progress.streak_days > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  bgcolor: 'rgba(254,226,226,0.7)',
                  border: '1px solid rgba(252,165,165,0.5)',
                  borderRadius: 6,
                  px: 1.25,
                  py: 0.4,
                  cursor: 'pointer',
                }}
                onClick={() => router.push('/stats')}
              >
                <Typography sx={{ fontSize: '0.85rem' }}>🔥</Typography>
                <Typography
                  sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '0.85rem',
                    color: '#DC2626',
                    lineHeight: 1,
                  }}
                >
                  {progress.streak_days}
                </Typography>
              </Box>
            )}

            {/* Home — only shown away from home */}
            {!isHome && (
              <Button onClick={() => router.push('/')} size="small" sx={navBtn}>
                🏠{' '}
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                  Home
                </Box>
              </Button>
            )}

            {/* Stats */}
            {!isStats && (
              <Button
                onClick={() => router.push('/stats')}
                size="small"
                startIcon={<BarChartIcon sx={{ fontSize: '1rem !important' }} />}
                sx={{
                  ...navBtn,
                  bgcolor: isStats ? 'rgba(249,168,212,0.18)' : 'transparent',
                  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Stats
                </Box>
              </Button>
            )}

            {/* New Deck */}
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={openNewDeckDialog}
              sx={{
                bgcolor: '#BE185D',
                color: 'text.primary',
                fontFamily: '"DM Serif Display", serif',
                fontWeight: 400,
                fontSize: '0.85rem',
                textTransform: 'none',
                borderRadius: 6,
                px: { xs: 1.25, sm: 2 },
                py: 0.75,
                boxShadow: '0 4px 14px rgba(190,24,93,0.22)',
                whiteSpace: 'nowrap',
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
                '&:hover': {
                  bgcolor: '#9D174D',
                  boxShadow: '0 6px 18px rgba(190,24,93,0.32)',
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                New Deck
              </Box>
            </Button>
          </Toolbar>
        </AppBar>
      </Slide>

      {/* Achievement unlock toast */}
      {newlyUnlocked.map((ach, i) => (
        <Snackbar
          key={ach.key}
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 16 + i * 72, sm: 24 + i * 72 } }}
        >
          <Alert
            severity="success"
            icon={false}
            sx={{
              bgcolor: 'rgba(255,242,248,0.97)',
              border: '1px solid rgba(249,168,212,0.5)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(190,24,93,0.18)',
              color: '#BE185D',
              fontFamily: '"DM Serif Display", serif',
              fontSize: '0.95rem',
              px: 2.5,
              py: 1,
            }}
          >
            {ach.emoji} Achievement unlocked: <strong>{ach.label}</strong>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}