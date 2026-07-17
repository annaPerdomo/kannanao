import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockSetLocale = vi.fn();
let hookState = {
  locale: 'en' as 'en' | 'ja',
  setLocale: mockSetLocale,
  saving: false,
  error: null as string | null,
  saved: false,
};

vi.mock('@/hooks/useLocalePreference', () => ({
  useLocalePreference: () => hookState,
}));

import { LanguageMenu } from '../LanguageMenu';

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Choose a language' }));
}

describe('LanguageMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState = {
      locale: 'en',
      setLocale: mockSetLocale,
      saving: false,
      error: null,
      saved: false,
    };
  });

  it('shows both language names in their own language', () => {
    renderWithProviders(<LanguageMenu />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /日本語/ })).toBeInTheDocument();
  });

  it('shows the same untranslated names when the UI is Japanese', () => {
    hookState.locale = 'ja';
    renderWithProviders(<LanguageMenu />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /日本語/ })).toBeInTheDocument();
  });

  it('marks the active language as selected', () => {
    hookState.locale = 'ja';
    renderWithProviders(<LanguageMenu />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: /日本語/ })).toHaveClass('Mui-selected');
    expect(screen.getByRole('menuitem', { name: /English/ })).not.toHaveClass('Mui-selected');
  });

  it('picks a language and closes the menu on click', () => {
    renderWithProviders(<LanguageMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /日本語/ }));
    expect(mockSetLocale).toHaveBeenCalledWith('ja');
  });

  // How a NULL profile locale becomes an explicit choice — must not be
  // swallowed as a no-op.
  it('records a click on the already-active language', () => {
    renderWithProviders(<LanguageMenu />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /English/ }));
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('disables the trigger while saving', () => {
    hookState.saving = true;
    renderWithProviders(<LanguageMenu />);
    expect(screen.getByRole('button', { name: 'Choose a language' })).toBeDisabled();
  });

  it('surfaces a save failure', () => {
    hookState.error = 'permission denied';
    renderWithProviders(<LanguageMenu />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't save/);
  });

  it('confirms a successful save', () => {
    hookState.saved = true;
    renderWithProviders(<LanguageMenu />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Language saved/);
  });
});
