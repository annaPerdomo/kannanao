'use client';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import {
  Alert,
  AppBar,
  Badge,
  Box,
  IconButton,
  Snackbar,
  Toolbar,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { useProgressCtx } from '@/contexts/ProgressContext';
import { LAYOUT } from '@/theme';

import { navItemsFor } from './constants';
import { EditNameDialog } from './EditNameDialog';
import { LanguageMenu } from './LanguageMenu';
import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';
import { XpDisplay } from './XpDisplay';

/**
 * Toolbar height per breakpoint. Exported because full-height sections subtract
 * it — the bar sits above them in flow, so a `100svh` child overruns the fold.
 */
export const NAVBAR_TOOLBAR_HEIGHT = { xs: 56, sm: 64, md: 78 } as const;

/** Toolbar plus the AppBar's 1px bottom border — what a `100svh - x` needs. */
export const NAVBAR_HEIGHT = {
  xs: NAVBAR_TOOLBAR_HEIGHT.xs + 1,
  sm: NAVBAR_TOOLBAR_HEIGHT.sm + 1,
  md: NAVBAR_TOOLBAR_HEIGHT.md + 1,
} as const;

export function NavBar() {
  const t = useTranslations('Nav');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pathname = usePathname();
  const router = useRouter();

  const { progress, newlyUnlocked, clearNewlyUnlocked } = useProgressCtx();
  const { user, loading: authLoading, updateDisplayName, isMemberAccount } = useAuth();
  const { unreadCount: dmUnreadCount } = useDirectMessagesCtx();

  const [editOpen, setEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

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
    fontWeight: 700,
    fontSize: { xs: '0.88rem', md: '0.95rem' },
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
    borderRadius: theme.radii.pill,
    // Base (xs) values matter even though nav links hide below sm: UserMenu
    // reuses this sx for the sign-in and avatar buttons, which render on phones.
    px: 1.5,
    py: { xs: 0.5, md: 0.8 },
    minWidth: 0,
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
    '&:hover': { bgcolor: alpha(brand[300], 0.22), transform: 'translateY(-1px)' },
    '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
    // Same selector MUI uses for start-icon sizing, so the sx (injected later) wins.
    '& .MuiButton-startIcon > *:nth-of-type(1)': { fontSize: { xs: '1rem', md: '1.2rem' } },
  };

  // Current page: flat brand-tint wash + darker text. Deliberately no white
  // fill, shadow, or hover lift — elevation reads as "press me", a flat tint
  // reads as "you are here" (same selection language as the shop's chips).
  const navBtnActive = {
    ...navBtn,
    color: brand[800],
    bgcolor: alpha(brand[300], 0.32),
    '&:hover': { bgcolor: alpha(brand[300], 0.32), transform: 'none' },
  };

  const isActive = useCallback(
    (href: string, exact?: boolean) =>
      exact ? pathname === href : (pathname?.startsWith(href) ?? false),
    [pathname],
  );

  const navItems = useMemo(
    () => navItemsFor(isMemberAccount).filter((item) => !item.organizerOnly || !isMemberAccount),
    [isMemberAccount],
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        // Read by useBuddyDrag, which keeps the buddy from parking on the bar.
        data-app-chrome="top"
        sx={{
          bgcolor: surfaces.glass,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${alpha(brand[300], 0.35)}`,
          boxShadow: `0 2px 20px ${alpha(brand[300], 0.12)}`,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: LAYOUT.contentMaxWidth,
            width: '100%',
            mx: 'auto',
            px: LAYOUT.pagePx,
            minHeight: NAVBAR_TOOLBAR_HEIGHT,
            gap: { xs: 1.5, md: 2 },
          }}
        >
          {/* Brand lockup: mascot + wordmark + たんごだち (see public/brand/logo-lockup.png) */}
          <Link href="/" style={{ textDecoration: 'none', userSelect: 'none' }}>
            <Box
              component="img"
              src="/brand/logo-lockup.png"
              alt={t('brandName')}
              sx={{
                display: 'block',
                height: { xs: 40, sm: 46, md: 60 },
                width: 'auto',
                flex: 'none',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'scale(1.04)' },
              }}
            />
          </Link>

          {/* Nav links — centered group, active page marked with a flat brand tint */}
          {user && (
            <NavLinks
              items={navItems}
              navBtnSx={navBtn}
              navBtnActiveSx={navBtnActive}
              isActive={isActive}
            />
          )}

          {/* Spacer when nav links are hidden (unauthenticated or mobile) */}
          {!user && <Box sx={{ flex: 1 }} />}
          {user && <Box sx={{ display: { xs: 'flex', sm: 'none' }, flex: 1 }} />}

          {/* User info — right group */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.25 } }}>
              {/* Direct messages — navigate to notifications page */}
              <IconButton
                aria-label={t('messagesAriaLabel')}
                onClick={() => router.push('/notifications')}
                sx={{ color: brand[500] }}
              >
                <Badge
                  badgeContent={dmUnreadCount}
                  color="error"
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                >
                  <ChatBubbleOutlineIcon sx={{ fontSize: { xs: '1.1rem', md: '1.3rem' } }} />
                </Badge>
              </IconButton>
              <XpDisplay onClick={() => router.push('/shop')} />

              {progress && progress.streak_days > 0 && (
                <Box
                  onClick={() => router.push('/stats')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push('/stats');
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    bgcolor: 'rgba(254,226,226,0.7)',
                    border: '1px solid rgba(252,165,165,0.5)',
                    borderRadius: theme.radii.pill,
                    px: { xs: 1.25, md: 1.5 },
                    py: { xs: 0.4, md: 0.65 },
                    cursor: 'pointer',
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '0.85rem', md: '0.95rem' } }}>🔥</Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.85rem', md: '0.95rem' },
                      fontWeight: 700,
                      color: '#DC2626',
                      lineHeight: 1,
                    }}
                  >
                    {progress.streak_days}
                  </Typography>
                </Box>
              )}

              <LanguageMenu />
              <UserMenu navBtnSx={navBtn} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.25 } }}>
              <LanguageMenu />
              {!authLoading && pathname !== '/login' && <UserMenu navBtnSx={navBtn} />}
            </Box>
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
            {ach.emoji} {t('achievementUnlocked')} <strong>{ach.label}</strong>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
