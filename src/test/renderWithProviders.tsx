import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { render, type RenderOptions } from '@testing-library/react';
import React, { type ReactNode } from 'react';
// ─── XpAnimation inline mock context ─────────────────────────────────────────
// We recreate the context shape here so we don't depend on the real module
import { createContext } from 'react';

import { CardBorderCtx } from '@/contexts/CardBorderContext';
import { type ColorScheme, createAppTheme } from '@/theme';

interface XpEvent {
  key: number;
  amount: number;
}
interface XpAnimationContextValue {
  pendingXp: XpEvent[];
  triggerXpEarned: (amount: number) => void;
  dismissXpEvent: (key: number) => void;
}
export const MockXpAnimationContext = createContext<XpAnimationContextValue>({
  pendingXp: [],
  triggerXpEarned: () => {},
  dismissXpEvent: () => {},
});

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface WrapperOptions {
  scheme?: ColorScheme;
}

function AllProviders({
  children,
  scheme = 'sakura',
}: {
  children: ReactNode;
  scheme?: ColorScheme;
}) {
  const theme = createAppTheme(scheme);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CardBorderCtx.Provider value={{ borderStyle: {}, equippedBorderKey: null }}>
        <MockXpAnimationContext.Provider
          value={{ pendingXp: [], triggerXpEarned: () => {}, dismissXpEvent: () => {} }}
        >
          {children}
        </MockXpAnimationContext.Provider>
      </CardBorderCtx.Provider>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperOptions & { renderOptions?: Omit<RenderOptions, 'wrapper'> } = {},
) {
  const { scheme, renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => <AllProviders scheme={scheme}>{children}</AllProviders>,
    ...renderOptions,
  });
}
