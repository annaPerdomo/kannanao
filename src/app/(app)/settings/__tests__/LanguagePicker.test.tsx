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

import { LanguagePicker } from '../LanguagePicker';

describe('LanguagePicker', () => {
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

  // The one rule this control cannot break: someone stranded in a language they
  // can't read has to be able to spot their own. Both names are always on
  // screen, each written in its own language, in either locale.
  it('shows both language names in their own language', () => {
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日本語' })).toBeInTheDocument();
  });

  it('shows the same untranslated names when the UI is Japanese', () => {
    hookState.locale = 'ja';
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日本語' })).toBeInTheDocument();
  });

  it('marks the active language as selected', () => {
    hookState.locale = 'ja';
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('button', { name: '日本語' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('picks a language on click', () => {
    renderWithProviders(<LanguagePicker />);
    fireEvent.click(screen.getByRole('button', { name: '日本語' }));
    expect(mockSetLocale).toHaveBeenCalledWith('ja');
  });

  // ToggleButtonGroup reports a click on the active pill as a deselect (null).
  // There is no "no language" state, so it has to be recorded as a re-pick —
  // that click is how a NULL profile column gets an explicit value.
  it('records a click on the already-active language', () => {
    renderWithProviders(<LanguagePicker />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(mockSetLocale).toHaveBeenCalledWith('en');
  });

  it('disables both options while saving', () => {
    hookState.saving = true;
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'English' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '日本語' })).toBeDisabled();
  });

  it('surfaces a save failure', () => {
    hookState.error = 'permission denied';
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('confirms a successful save', () => {
    hookState.saved = true;
    renderWithProviders(<LanguagePicker />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not claim success while showing an error', () => {
    hookState.saved = true;
    hookState.error = 'boom';
    renderWithProviders(<LanguagePicker />);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
