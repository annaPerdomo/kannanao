'use client';
import BarChartIcon from '@mui/icons-material/BarChart';
import FlightIcon from '@mui/icons-material/Flight';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MicIcon from '@mui/icons-material/Mic';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  labelKey: string;
  icon: React.ReactNode;
  path: string;
  organizerOnly?: boolean;
  memberOnly?: boolean;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'home', icon: <HomeIcon />, path: '/', exact: true },
  { labelKey: 'decks', icon: <LibraryBooksIcon />, path: '/decks' },
  { labelKey: 'groups', icon: <GroupsIcon />, path: '/group', organizerOnly: true },
  { labelKey: 'speech', icon: <MicIcon />, path: '/ohanashikai' },
  { labelKey: 'travel', icon: <FlightIcon />, path: '/travel' },
  { labelKey: 'stats', icon: <BarChartIcon />, path: '/stats' },
  { labelKey: 'shop', icon: <StorefrontIcon />, path: '/shop' },
];

export const BOTTOM_NAV_HEIGHT = 56;

export function BottomNav() {
  const t = useTranslations('Nav');
  const tItems = useTranslations('Nav.items');
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const pathname = usePathname();
  const router = useRouter();
  const { user, isMemberAccount } = useAuth();

  if (!user) return null;

  const items = NAV_ITEMS.filter(
    (item) => (!item.organizerOnly || !isMemberAccount) && (!item.memberOnly || isMemberAccount),
  );
  const currentIndex = items.findIndex((item) =>
    item.exact ? pathname === item.path : pathname?.startsWith(item.path),
  );

  return (
    <Paper
      component="nav"
      aria-label={t('mainNavigationAriaLabel')}
      sx={{
        display: { xs: 'block', sm: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${alpha(brand[300], 0.35)}`,
        bgcolor: surfaces.glass,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: `0 -2px 20px ${alpha(brand[300], 0.12)}`,
        pb: 'env(safe-area-inset-bottom)',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentIndex >= 0 ? currentIndex : false}
        onChange={(_, newValue) => router.push(items[newValue].path)}
        showLabels
        sx={{
          bgcolor: 'transparent',
          height: BOTTOM_NAV_HEIGHT,
          '& .MuiBottomNavigationAction-root': {
            color: brand[400],
            minWidth: 0,
            px: 0,
            py: 0.5,
            '&.Mui-selected': {
              color: brand[700],
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.6rem',
            '&.Mui-selected': {
              fontSize: '0.65rem',
            },
          },
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction key={item.path} label={tItems(item.labelKey)} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
