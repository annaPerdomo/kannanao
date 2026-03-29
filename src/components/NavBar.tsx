'use client';
import {
  AppBar, Toolbar, Box, Typography, Button, useScrollTrigger, Slide,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePathname, useRouter } from 'next/navigation';
import { useDeckDialog } from '@/contexts/DeckDialogContext';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const { openNewDeckDialog } = useDeckDialog();

  const trigger = useScrollTrigger({ threshold: 10 });

  return (
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

          {/* Home — only shown away from home */}
          {!isHome && (
            <Button
              onClick={() => router.push('/')}
              size="small"
              sx={{
                color: '#BE185D',
                fontFamily: '"DM Serif Display", serif',
                fontWeight: 400,
                fontSize: '0.9rem',
                textTransform: 'none',
                letterSpacing: '0.01em',
                borderRadius: 6,
                px: 1.5,
                minWidth: 0,
                '&:hover': { bgcolor: 'rgba(249,168,212,0.18)' },
              }}
            >
              🏠 <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>Home</Box>
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
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New Deck</Box>
          </Button>
        </Toolbar>
      </AppBar>
    </Slide>
  );
}