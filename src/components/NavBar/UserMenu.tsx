'use client';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, Button, Divider, Menu, MenuItem, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { type ColorScheme, schemeInfo, useColorScheme } from '@/contexts/ThemeContext';

interface UserMenuProps {
  navBtnSx: SxProps<Theme>;
}

export function UserMenu({ navBtnSx }: UserMenuProps) {
  const t = useTranslations('Nav.userMenu');
  const router = useRouter();
  const { brand, surfaces } = useTheme().palette;
  const { user, isAdmin, displayName, signOut } = useAuth();
  const { scheme, setScheme } = useColorScheme();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuAnchor(null);
  }, [user]);

  const menuPaperSx = {
    borderRadius: 3,
    border: `1px solid ${alpha(brand[300], 0.35)}`,
    boxShadow: `0 8px 32px ${alpha(brand[700], 0.12)}`,
    bgcolor: surfaces.overlay,
    minWidth: 180,
  };

  if (!user) {
    return (
      <Button
        onClick={() => router.push('/login')}
        size="small"
        startIcon={<AccountCircleIcon sx={{ fontSize: '1.1rem !important' }} />}
        sx={{ ...(navBtnSx as object), '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } } }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {t('signIn')}
        </Box>
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        size="small"
        startIcon={<AccountCircleIcon sx={{ fontSize: '1.1rem !important' }} />}
        sx={{ ...(navBtnSx as object), '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } } }}
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
        {isAdmin && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              router.push('/admin');
            }}
            sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontWeight: 600 }}
          >
            <AdminPanelSettingsIcon sx={{ fontSize: '1rem' }} /> {t('admin')}
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            router.push('/settings');
          }}
          sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontWeight: 600 }}
        >
          <SettingsIcon sx={{ fontSize: '1rem' }} /> {t('account')}
        </MenuItem>

        <MenuItem
          onClick={signOut}
          sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontWeight: 600 }}
        >
          <LogoutIcon sx={{ fontSize: '1rem' }} /> {t('signOut')}
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          disableRipple
          sx={{ gap: 1, cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, flex: 1 }}>
            {t('theme')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {(['sakura', 'murasaki', 'yuki'] as ColorScheme[]).map((s) => (
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
  );
}
