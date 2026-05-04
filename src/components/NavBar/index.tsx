'use client';
import BarChartIcon from '@mui/icons-material/BarChart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import GroupsIcon from '@mui/icons-material/Groups';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MicIcon from '@mui/icons-material/Mic';
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  Alert,
  AppBar,
  Badge,
  Box,
  Button,
  IconButton,
  Snackbar,
  Toolbar,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EncouragementInbox } from '@/components/Group';
import { useAuth } from '@/contexts/AuthContext';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useProgress } from '@/hooks/useProgress';
import { LAYOUT } from '@/theme';

import { EditNameDialog } from './EditNameDialog';
import { UserMenu } from './UserMenu';
import { XpDisplay } from './XpDisplay';

export function NavBar() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pathname = usePathname();
  const router = useRouter();
  const isStats = pathname === '/stats';
  const isShop = pathname === '/shop';
  const isOhanashikai = pathname?.startsWith('/ohanashikai') ?? false;
  const isDecks = pathname?.startsWith('/decks') ?? false;
  const isGroup = pathname?.startsWith('/group') ?? false;

  const { progress, newlyUnlocked, clearNewlyUnlocked } = useProgress();
  const { user, loading: authLoading, updateDisplayName, isMemberAccount } = useAuth();
  const { encouragements, unreadCount, markAsRead, markAllAsRead } = useEncouragements();

  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const t = setTimeout(clearNewlyUnlocked, 4000);
      return () => clearTimeout(t);
    }
  }, [newlyUnlocked, clearNewlyUnlocked]);

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

  const navBtnActive = {
    ...navBtn,
    bgcolor: alpha(brand[300], 0.22),
    '&:hover': { bgcolor: alpha(brand[300], 0.3) },
  };

  const navBtnWithIcon = {
    ...navBtn,
    '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
  };

  const navBtnWithIconActive = {
    ...navBtnActive,
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
            maxWidth: LAYOUT.headerMaxWidth,
            width: '100%',
            mx: 'auto',
            px: LAYOUT.pagePx,
            minHeight: { xs: 56, sm: 64 },
            gap: 1.5,
          }}
        >
          {/* Brand */}
          <Link href="/" style={{ textDecoration: 'none', userSelect: 'none' }}>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.cute,
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
          </Link>

          {/* Nav links — centered group */}
          {user && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mx: 'auto',
              }}
            >
              <Button
                onClick={() => router.push('/decks')}
                size="small"
                startIcon={<LibraryBooksIcon sx={{ fontSize: '1rem !important' }} />}
                sx={isDecks ? navBtnWithIconActive : navBtnWithIcon}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Decks
                </Box>
              </Button>

              {!isMemberAccount && (
                <Button
                  onClick={() => router.push('/group')}
                  size="small"
                  startIcon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
                  sx={isGroup ? navBtnWithIconActive : navBtnWithIcon}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Groups
                  </Box>
                </Button>
              )}

              <Button
                onClick={() => router.push('/ohanashikai')}
                size="small"
                startIcon={<MicIcon sx={{ fontSize: '1rem !important' }} />}
                sx={isOhanashikai ? navBtnWithIconActive : navBtnWithIcon}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Speech
                </Box>
              </Button>

              <Button
                onClick={() => router.push('/stats')}
                size="small"
                startIcon={<BarChartIcon sx={{ fontSize: '1rem !important' }} />}
                sx={isStats ? navBtnWithIconActive : navBtnWithIcon}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Stats
                </Box>
              </Button>

              <Button
                onClick={() => router.push('/shop')}
                size="small"
                startIcon={<StorefrontIcon sx={{ fontSize: '1rem !important' }} />}
                sx={isShop ? navBtnWithIconActive : navBtnWithIcon}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Shop
                </Box>
              </Button>
            </Box>
          )}

          {/* Spacer when nav links are hidden (unauthenticated) */}
          {!user && <Box sx={{ flex: 1 }} />}

          {/* User info — right group */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
              {isMemberAccount && (
                <IconButton
                  aria-label="Encouragement messages"
                  onClick={() => setInboxOpen(true)}
                  sx={{ color: brand[500] }}
                >
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                  >
                    <FavoriteIcon sx={{ fontSize: '1.1rem' }} />
                  </Badge>
                </IconButton>
              )}
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
            !authLoading && pathname !== '/login' && <UserMenu navBtnSx={navBtn} />
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

      {isMemberAccount && (
        <EncouragementInbox
          open={inboxOpen}
          onClose={() => setInboxOpen(false)}
          encouragements={encouragements}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
        />
      )}

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
