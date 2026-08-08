import type { SvgIconComponent } from '@mui/icons-material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import FlightIcon from '@mui/icons-material/Flight';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MicIcon from '@mui/icons-material/Mic';
import StorefrontIcon from '@mui/icons-material/Storefront';

export interface NavItem {
  /** Translation key under `Nav.items`. */
  key: 'home' | 'decks' | 'materials' | 'groups' | 'speech' | 'travel' | 'stats' | 'shop';
  href: string;
  icon: SvgIconComponent;
  /** Active only on an exact pathname match instead of a prefix match. */
  exact?: boolean;
  organizerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'decks', href: '/decks', icon: LibraryBooksIcon },
  { key: 'materials', href: '/materials', icon: DesignServicesIcon, organizerOnly: true },
  { key: 'groups', href: '/group', icon: GroupsIcon, organizerOnly: true },
  { key: 'speech', href: '/ohanashikai', icon: MicIcon },
  { key: 'travel', href: '/travel', icon: FlightIcon },
  { key: 'stats', href: '/stats', icon: BarChartIcon, exact: true },
  { key: 'shop', href: '/shop', icon: StorefrontIcon, exact: true },
];

// The bottom bar replaces the logo-as-home-link, so it prepends Home. Materials
// is left out: MuiBottomNavigation splits the width evenly with no scroll, so an
// eighth action leaves ~47px each on a 375px phone and the labels clip.
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/', icon: HomeIcon, exact: true },
  ...NAV_ITEMS.filter((item) => item.key !== 'materials'),
];

// Sized to nearly fill the Toolbar (56 xs / 64 sm / 78 md) so the buddy's
// face is legible; the avatar button loses its vertical padding to make room.
// Shared with AppBootSkeleton so the boot placeholder can't drift.
export const AVATAR_SIZE = { xs: 44, sm: 52, md: 58 };
