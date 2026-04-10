'use client';
import {
  AppBar, Toolbar, Box, Typography, Button,
  Snackbar, Alert, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Divider,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import MicIcon from '@mui/icons-material/Mic';
import HomeIcon from '@mui/icons-material/Home';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useProgress } from '@/hooks/useProgess';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme, schemeInfo, type ColorScheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export function NavBar() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pathname = usePathname();
  const router = useRouter();
  const isHome        = pathname === '/';
  const isStats       = pathname === '/stats';
  const isOhanashikai = pathname?.startsWith('/ohanashikai') ?? false;


  const { progress, newlyUnlocked, clearNewlyUnlocked } = useProgress();
  const { user, displayName, signOut, updateDisplayName } = useAuth();
  const { scheme, setScheme } = useColorScheme();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [editOpen, setEditOpen]     = useState(false);
  const [nameInput, setNameInput]   = useState('');
  const [saving, setSaving]         = useState(false);

  // Reset menu when user changes (fixes dropdown appearing open after login)
  useEffect(() => {
    setMenuAnchor(null);
  }, [user]);

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const t = setTimeout(clearNewlyUnlocked, 4000);
      return () => clearTimeout(t);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

  const openEdit = () => {
    setNameInput(displayName ?? '');
    setMenuAnchor(null);
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
    fontFamily: '"DM Serif Display", serif',
    fontWeight: 400,
    fontSize: '0.9rem',
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
    borderRadius: 6,
    px: 1.5,
    minWidth: 0,
    '&:hover': { bgcolor: alpha(brand[300], 0.18) },
  };

  const menuPaperSx = {
    borderRadius: 3,
    border: `1px solid ${alpha(brand[300], 0.35)}`,
    boxShadow: `0 8px 32px ${alpha(brand[700], 0.12)}`,
    bgcolor: surfaces.overlay,
    minWidth: 180,
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
                fontFamily: '"DM Serif Display", serif',
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

          {/* Streak pill */}
          {user && progress && progress.streak_days > 0 && (
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

          {/* Home — hide only on home page */}
          {user && !isHome && (
            <Button
              onClick={() => router.push('/')}
              size="small"
              startIcon={<HomeIcon sx={{ fontSize: '1rem !important' }} />}
              sx={{
                ...navBtn,
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Home</Box>
            </Button>
          )}

          {/* Ohanashikai */}
          {user && !isOhanashikai && (
            <Button
              onClick={() => router.push('/ohanashikai')}
              size="small"
              startIcon={<MicIcon sx={{ fontSize: '1rem !important' }} />}
              sx={{
                ...navBtn,
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Speech</Box>
            </Button>
          )}

          {/* Stats */}
          {user && !isStats && (
            <Button
              onClick={() => router.push('/stats')}
              size="small"
              startIcon={<BarChartIcon sx={{ fontSize: '1rem !important' }} />}
              sx={{
                ...navBtn,
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Stats</Box>
            </Button>
          )}

          {/* Auth */}
          {user ? (
            <>
              <Button
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                size="small"
                startIcon={<AccountCircleIcon sx={{ fontSize: '1.1rem !important' }} />}
                sx={{ ...navBtn, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {displayName ?? user.email?.split('@')[0]}
                </Box>
              </Button>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                slotProps={{ paper: { sx: menuPaperSx } }}
              >
                <MenuItem
                  onClick={openEdit}
                  sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontFamily: '"DM Serif Display", serif' }}
                >
                  <EditIcon sx={{ fontSize: '1rem' }} /> Edit name
                </MenuItem>

                <MenuItem
                  onClick={signOut}
                  sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontFamily: '"DM Serif Display", serif' }}
                >
                  <LogoutIcon sx={{ fontSize: '1rem' }} /> Sign out
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                {/* Color scheme switcher */}
                <MenuItem disableRipple sx={{ gap: 1, cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontFamily: '"DM Serif Display", serif', flex: 1 }}
                  >
                    Theme
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {(Object.keys(schemeInfo) as ColorScheme[]).map((s) => (
                      <Box
                        key={s}
                        onClick={() => setScheme(s)}
                        title={`${schemeInfo[s].emoji} ${schemeInfo[s].label}`}
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: schemeInfo[s].preview,
                          cursor: 'pointer',
                          outline: scheme === s ? `2px solid ${brand[700]}` : '2px solid transparent',
                          outlineOffset: '1px',
                          transition: 'transform 0.15s ease',
                          '&:hover': { transform: 'scale(1.25)' },
                        }}
                      />
                    ))}
                  </Box>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              onClick={() => router.push('/login')}
              size="small"
              startIcon={<AccountCircleIcon sx={{ fontSize: '1.1rem !important' }} />}
              sx={{ ...navBtn, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Sign In</Box>
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Edit name dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 40px ${alpha(brand[700], 0.12)}`,
              bgcolor: surfaces.overlay,
              minWidth: 320,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"DM Serif Display", serif', color: brand[700], pb: 1 }}>
          Edit your name
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Display name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setEditOpen(false)}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !nameInput.trim()}
            variant="contained"
            sx={{
              bgcolor: brand[700],
              color: '#fff',
              textTransform: 'none',
              borderRadius: 6,
              fontFamily: '"DM Serif Display", serif',
              '&:hover': { bgcolor: brand[800] },
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Achievement unlock toasts */}
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
