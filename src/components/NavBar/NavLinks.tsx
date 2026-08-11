'use client';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { NavItem } from './constants';

// Not SxProps: these get spread into a larger sx, and SxProps' callback arm
// would spread into an unstyled button with no type error to show for it.
type SxObject = Exclude<SxProps<Theme>, readonly unknown[] | ((...args: never[]) => unknown)>;

interface NavLinksProps {
  items: NavItem[];
  navBtnSx: SxObject;
  navBtnActiveSx: SxObject;
  isActive: (href: string, exact?: boolean) => boolean;
}

/** Gap between links, in px — reading it back off the DOM would cost a reflow. */
const GAP_PX = 6;

const MENU_ID = 'nav-more-menu';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * The centre strip of the top bar, which moves whatever will not fit into a
 * "More" menu. How many links fit depends on the account type, the display name
 * and the UI language, so it is measured rather than switched on a breakpoint.
 */
export function NavLinks({ items, navBtnSx, navBtnActiveSx, isActive }: NavLinksProps) {
  const t = useTranslations('Nav');
  const tItems = useTranslations('Nav.items');
  const router = useRouter();
  const { brand, surfaces } = useTheme().palette;

  const stripRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  // null until the first measurement; the strip stays invisible until then so a
  // tablet never paints the full row of links clipped mid-label.
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Widths come off the ruler, which renders every link plus "More" off the
  // layout, so they stay measurable no matter what is currently on screen.
  useIsomorphicLayoutEffect(() => {
    const strip = stripRef.current;
    const ruler = rulerRef.current;
    if (!strip || !ruler) return;

    const compute = () => {
      const available = strip.clientWidth;
      // Unmeasurable (display:none below `sm`, or not laid out yet) would
      // otherwise read as "no room" and tip every link into the menu. Any menu
      // still open has to go too: its anchor now measures 0×0, and MUI would
      // re-position it into the corner of the viewport.
      if (available <= 0) {
        setVisibleCount(items.length);
        setMenuAnchor(null);
        return;
      }

      // Not offsetWidth: it rounds, and eight links each under-reported by half
      // a pixel buy enough phantom room to clip a label the strip cannot scroll.
      const widths = [...ruler.children].map((el) => Math.ceil(el.getBoundingClientRect().width));
      const moreWidth = widths.pop() ?? 0;

      let used = 0;
      let count = 0;
      for (const w of widths) {
        const next = used + w + (count > 0 ? GAP_PX : 0);
        if (next > available) break;
        used = next;
        count += 1;
      }
      // Anything left over needs the "More" button, which needs room of its own.
      while (count < widths.length && count > 0 && used + GAP_PX + moreWidth > available) {
        count -= 1;
        used -= widths[count] + (count > 0 ? GAP_PX : 0);
      }
      setVisibleCount(count);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(strip);
    // Labels are wider before the brand font loads; re-measure once it lands.
    document.fonts?.ready.then(compute).catch(() => {});
    return () => observer.disconnect();
  }, [items, tItems]);

  const go = useCallback(
    (href: string) => {
      setMenuAnchor(null);
      router.push(href);
    },
    [router],
  );

  const shown = visibleCount ?? items.length;

  useEffect(() => {
    if (shown >= items.length) setMenuAnchor(null);
  }, [shown, items.length]);

  const overflow = items.slice(shown);
  const overflowHasActive = overflow.some(({ href, exact }) => isActive(href, exact));

  const renderLink = (item: NavItem, measuring = false) => {
    const { key, href, icon: Icon, exact } = item;
    const active = isActive(href, exact);
    return (
      <Button
        key={key}
        onClick={() => router.push(href)}
        size="small"
        startIcon={<Icon />}
        aria-current={active ? 'page' : undefined}
        tabIndex={measuring ? -1 : undefined}
        sx={{ ...(active ? navBtnActiveSx : navBtnSx), flexShrink: 0 }}
      >
        {tItems(key)}
      </Button>
    );
  };

  return (
    <Box
      ref={stripRef}
      sx={{
        // Fixed share of the toolbar, not content width: the space available has
        // to be independent of what the measurement decides to show, or hiding
        // one link shrinks the strip and hides another.
        display: { xs: 'none', sm: 'flex' },
        flex: '1 1 0',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${GAP_PX}px`,
        visibility: visibleCount === null ? 'hidden' : 'visible',
      }}
    >
      {items.slice(0, shown).map((item) => renderLink(item))}

      {overflow.length > 0 && (
        <Button
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          size="small"
          startIcon={<MoreHorizIcon />}
          aria-haspopup="menu"
          aria-expanded={Boolean(menuAnchor)}
          aria-controls={menuAnchor ? MENU_ID : undefined}
          aria-current={overflowHasActive ? 'page' : undefined}
          sx={{ ...navBtnSx, flexShrink: 0 }}
        >
          {t('more')}
        </Button>
      )}

      <Menu
        id={MENU_ID}
        anchorEl={menuAnchor}
        // The anchor unmounts the moment everything fits again, and a menu
        // rendered against a detached node parks itself in the viewport corner.
        open={Boolean(menuAnchor) && overflow.length > 0}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: (theme) => theme.radii.md,
              border: `1px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 32px ${alpha(brand[700], 0.12)}`,
              bgcolor: surfaces.overlay,
              minWidth: 160,
            },
          },
        }}
      >
        {overflow.map(({ key, href, icon: Icon, exact }) => (
          <MenuItem
            key={key}
            onClick={() => go(href)}
            selected={isActive(href, exact)}
            // `selected` is only a tint here: MenuItem maps it to aria-selected
            // for role="option", not the role="menuitem" it uses by default.
            aria-current={isActive(href, exact) ? 'page' : undefined}
            sx={{ gap: 1.5, color: brand[700], fontWeight: 700, fontSize: '0.9rem' }}
          >
            <Icon sx={{ fontSize: '1.1rem' }} />
            {tItems(key)}
          </MenuItem>
        ))}
      </Menu>

      <Box
        ref={rulerRef}
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          gap: `${GAP_PX}px`,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {items.map((item) => renderLink(item, true))}
        <Button size="small" startIcon={<MoreHorizIcon />} tabIndex={-1} sx={navBtnSx}>
          {t('more')}
        </Button>
      </Box>
    </Box>
  );
}
