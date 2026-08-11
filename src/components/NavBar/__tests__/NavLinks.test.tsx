import BarChartIcon from '@mui/icons-material/BarChart';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MicIcon from '@mui/icons-material/Mic';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { NavItem } from '@/components/NavBar/constants';
import { NavLinks } from '@/components/NavBar/NavLinks';
import { renderWithProviders } from '@/test/renderWithProviders';

const ITEMS: NavItem[] = [
  { key: 'decks', href: '/decks', icon: LibraryBooksIcon },
  { key: 'speech', href: '/ohanashikai', icon: MicIcon },
  { key: 'stats', href: '/stats', icon: BarChartIcon, exact: true },
];

// The global stub in test/setup never fires; this one hands the callback back
// so a resize can be replayed on demand.
const resizeCallbacks: ResizeObserverCallback[] = [];
global.ResizeObserver = class {
  constructor(cb: ResizeObserverCallback) {
    resizeCallbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const resize = () =>
  act(() => {
    resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
  });

const renderLinks = (activeHref = '/decks') =>
  renderWithProviders(
    <NavLinks
      items={ITEMS}
      navBtnSx={{}}
      navBtnActiveSx={{}}
      isActive={(href) => href === activeHref}
    />,
  );

/** jsdom reports every box as 0×0, so widths have to be forced to test the fit. */
function stubWidths(button: number, strip: number) {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width: button, height: 32 }) as DOMRect,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => strip,
  });
}

afterEach(() => {
  resizeCallbacks.length = 0;
  // @ts-expect-error — restoring jsdom's own definitions
  delete HTMLElement.prototype.getBoundingClientRect;
  // @ts-expect-error — same
  delete HTMLElement.prototype.clientWidth;
});

describe('NavLinks', () => {
  it('shows every link and no overflow menu when they all fit', () => {
    stubWidths(100, 1000);
    renderLinks();

    // The hidden ruler copy is aria-hidden, so only the real links have a role.
    expect(screen.getByRole('button', { name: /Decks/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Speech/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stats/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument();
  });

  it('shows every link when the strip cannot be measured', () => {
    renderLinks();

    expect(screen.getByRole('button', { name: /Stats/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument();
  });

  it('marks the current page', () => {
    stubWidths(100, 1000);
    renderLinks();
    expect(screen.getByRole('button', { name: /Decks/ })).toHaveAttribute('aria-current', 'page');
  });

  it('moves the links that do not fit into a More menu', () => {
    // 250px of room, 100px per button: two links fit, but not two plus "More",
    // so the fit backs off to one.
    stubWidths(100, 250);
    renderLinks();

    const more = screen.getByRole('button', { name: /More/ });
    expect(screen.queryByRole('button', { name: /Speech/ })).not.toBeInTheDocument();

    fireEvent.click(more);

    expect(screen.getByRole('menuitem', { name: /Speech/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Stats/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Decks/ })).not.toBeInTheDocument();
  });

  it('keeps marking the current page after it folds into the menu', () => {
    stubWidths(100, 250);
    renderLinks('/stats');

    const more = screen.getByRole('button', { name: /More/ });
    expect(more).toHaveAttribute('aria-current', 'page');
    expect(more).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(more);

    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: /Stats/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('menuitem', { name: /Speech/ })).not.toHaveAttribute('aria-current');
  });

  it('closes an open menu when the strip stops being measurable', () => {
    stubWidths(100, 250);
    renderLinks();
    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(screen.getByRole('menuitem', { name: /Speech/ })).toBeInTheDocument();

    // What a rotation into portrait does: the strip hits `display: none`, so
    // the "More" button it was anchored to is no longer laid out.
    stubWidths(100, 0);
    resize();

    expect(screen.queryByRole('menuitem', { name: /Speech/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument();
  });
});
