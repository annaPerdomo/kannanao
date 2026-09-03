import type { SvgIconComponent } from '@mui/icons-material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import FlightIcon from '@mui/icons-material/Flight';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MicIcon from '@mui/icons-material/Mic';
import StorefrontIcon from '@mui/icons-material/Storefront';

import { LAYOUT } from '@/theme';

export interface NavItem {
  /** Translation key under `Nav.items`. */
  key:
    | 'home'
    | 'practice'
    | 'binder'
    | 'me'
    | 'decks'
    | 'materials'
    | 'groups'
    | 'speech'
    | 'travel'
    | 'stats'
    | 'shop';
  href: string;
  icon: SvgIconComponent;
  /** Active only on an exact pathname match instead of a prefix match. */
  exact?: boolean;
  organizerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'practice', href: '/review', icon: LocalFireDepartmentIcon },
  { key: 'decks', href: '/decks', icon: LibraryBooksIcon },
  { key: 'materials', href: '/materials', icon: DesignServicesIcon, organizerOnly: true },
  { key: 'groups', href: '/group', icon: GroupsIcon, organizerOnly: true },
  { key: 'speech', href: '/ohanashikai', icon: MicIcon },
  { key: 'travel', href: '/travel', icon: FlightIcon },
  { key: 'stats', href: '/stats', icon: BarChartIcon, exact: true },
  { key: 'shop', href: '/shop', icon: StorefrontIcon, exact: true },
];

export const LEARNER_NAV_ITEMS: NavItem[] = [
  { key: 'practice', href: '/', icon: LocalFireDepartmentIcon, exact: true },
  { key: 'binder', href: '/binder', icon: MenuBookIcon },
  { key: 'me', href: '/me', icon: InsertEmoticonIcon },
];

export function navItemsFor(isMemberAccount: boolean): NavItem[] {
  return isMemberAccount ? LEARNER_NAV_ITEMS : NAV_ITEMS;
}

// Home replaces the logo link; Materials and Travel are dropped because
// MuiBottomNavigation splits the width evenly with no scroll and eight labels clip on a phone.
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/', icon: HomeIcon, exact: true },
  ...NAV_ITEMS.filter((item) => item.key !== 'materials' && item.key !== 'travel'),
];

export function bottomNavItemsFor(isMemberAccount: boolean): NavItem[] {
  return isMemberAccount ? LEARNER_NAV_ITEMS : BOTTOM_NAV_ITEMS;
}

// Sized to nearly fill the Toolbar (56 xs / 64 sm / 78 md) so the buddy's
// face is legible; the avatar button loses its vertical padding to make room.
// Shared with AppBootSkeleton so the boot placeholder can't drift.
export const AVATAR_SIZE = { xs: 44, sm: 52, md: 58 };

// Shared with AppBootSkeleton: a lockup that moves at hydration reads as a swap.
export const TOOLBAR_PX = { ...LAYOUT.pagePx, xs: 1.5 };
export const TOOLBAR_GAP = { xs: 1, md: 2 };
export const BRAND_LOCKUP_MIN_WIDTH = 96;
export const BRAND_LOCKUP_SX = {
  display: 'block',
  height: 'auto',
  maxHeight: { xs: 40, sm: 46, md: 60 },
  width: 'auto',
  maxWidth: '100%',
} as const;
