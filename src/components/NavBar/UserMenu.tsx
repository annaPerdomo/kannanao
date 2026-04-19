'use client';
import { useState } from 'react';
import {
  Box, Typography, Button, Menu, MenuItem, Divider,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme, schemeInfo, type ColorScheme } from '@/contexts/ThemeContext';
import type { SxProps, Theme } from '@mui/material/styles';
import { useEffect } from 'react';

interface UserMenuProps {
  navBtnSx: SxProps<Theme>;
}

export function UserMenu({ navBtnSx }: UserMenuProps) {
  const router = useRouter();
  const { brand, surfaces } = useTheme().palette;
  const { user, displayName, signOut } = useAuth();
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
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Sign In</Box>
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
        {user.email?.split('@')[0] === (process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? 'test') && (
          <MenuItem
            onClick={() => { setMenuAnchor(null); router.push('/admin'); }}
            sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontFamily: '"DM Serif Display", serif' }}
          >
            <AdminPanelSettingsIcon sx={{ fontSize: '1rem' }} /> Admin
          </MenuItem>
        )}

        <MenuItem
          onClick={() => { setMenuAnchor(null); router.push('/settings'); }}
          sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontFamily: '"DM Serif Display", serif' }}
        >
          <SettingsIcon sx={{ fontSize: '1rem' }} /> Account
        </MenuItem>

        <MenuItem
          onClick={signOut}
          sx={{ gap: 1.5, color: brand[700], fontSize: '0.88rem', fontFamily: '"DM Serif Display", serif' }}
        >
          <LogoutIcon sx={{ fontSize: '1rem' }} /> Sign out
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem disableRipple sx={{ gap: 1, cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontFamily: '"DM Serif Display", serif', flex: 1 }}
          >
            Theme
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
