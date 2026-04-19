'use client';
import { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, Typography, Button, Snackbar, Alert,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import MicIcon from '@mui/icons-material/Mic';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { FONT_CUTE } from '@/theme';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/contexts/AuthContext';
import { XpDisplay } from './XpDisplay';
import { UserMenu } from './UserMenu';
import { EditNameDialog } from './EditNameDialog';

export function NavBar() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pathname = usePathname();
  const router = useRouter();
  const isHome        = pathname === '/';
  const isStats       = pathname === '/stats';
  const isShop        = pathname === '/shop';
  const isOhanashikai = pathname?.startsWith('/ohanashikai') ?? false;
  const isDecks       = pathname?.startsWith('/decks') ?? false;

  const { progress, newlyUnlocked, clearNewlyUnlocked } = useProgress();
  const { user, displayName, updateDisplayName } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const t = setTimeout(clearNewlyUnlocked, 4000);
      return () => clearTimeout(t);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  const openEdit = () => {
    setNameInput(displayName ?? '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    await updateDisplayName(nameInput);
    setSaving(false);
    setEditOpen(false);
  };

  const navBtn = {
    color: brand[700],
    fontWeight: 600,
    fontSize: '0.9rem',
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
    borderRadius: 6,
    px: 1.5,
    minWidth: 0,
    '&:hover': { bgcolor: alpha(brand[300], 0.18) },
  };

  const navBtnWithIcon = {
    ...navBtn,
    '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: surfaces.glass,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${alpha(brand[300], 0.35)}`,
          boxShadow: `0 2px 20px ${alpha(brand[300], 0.12)}`,
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
            sx={{ cursor: 'pointer', userSelect: 'none', mr: 'auto' }}
          >
            <Typography
              sx={{
                fontFamily: FONT_CUTE,
                fontWeight: 600,
                fontSize: { xs: '1.2rem', sm: '1.4rem' },
                color: brand[700],
                lineHeight: 1,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              🌸 Kannanao
            </Typography>
          </Box>

          {user && !isHome && (
            <Button onClick={() => router.push('/')} size="small" startIcon={<HomeIcon sx={{ fontSize: '1rem !important' }} />} sx={navBtnWithIcon}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Home</Box>
            </Button>
          )}

          {user && !isDecks && (
            <Button onClick={() => router.push('/decks')} size="small" startIcon={<LibraryBooksIcon sx={{ fontSize: '1rem !important' }} />} sx={navBtnWithIcon}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Decks</Box>
            </Button>
          )}

          {user && !isOhanashikai && (
            <Button onClick={() => router.push('/ohanashikai')} size="small" startIcon={<MicIcon sx={{ fontSize: '1rem !important' }} />} sx={navBtnWithIcon}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Speech</Box>
            </Button>
          )}

          {user && !isStats && (
            <Button onClick={() => router.push('/stats')} size="small" startIcon={<BarChartIcon sx={{ fontSize: '1rem !important' }} />} sx={navBtnWithIcon}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Stats</Box>
            </Button>
          )}

          {user && !isShop && (
            <Button onClick={() => router.push('/shop')} size="small" startIcon={<StorefrontIcon sx={{ fontSize: '1rem !important' }} />} sx={navBtnWithIcon}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Shop</Box>
            </Button>
          )}

          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
              <XpDisplay onClick={() => router.push('/shop')} />

              {progress && progress.streak_days > 0 && (
                <Box
                  onClick={() => router.push('/stats')}
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
                >
                  <Typography sx={{ fontSize: '0.85rem' }}>🔥</Typography>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#DC2626',
                      lineHeight: 1,
                    }}
                  >
                    {progress.streak_days}
                  </Typography>
                </Box>
              )}

              <UserMenu navBtnSx={navBtn} />
            </Box>
          ) : (
            <UserMenu navBtnSx={navBtn} />
          )}
        </Toolbar>
      </AppBar>

      <EditNameDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        nameInput={nameInput}
        onNameInputChange={setNameInput}
        onSave={handleSave}
        saving={saving}
      />

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
              bgcolor: surfaces.overlay,
              border: `1px solid ${alpha(brand[300], 0.5)}`,
              borderRadius: 3,
              boxShadow: `0 8px 32px ${alpha(brand[700], 0.18)}`,
              color: brand[700],
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
