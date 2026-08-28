import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataErrorState, StaleDataHint } from '@/components/DataErrorState';
import { DataError } from '@/lib/dataError';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('DataErrorState', () => {
  it('renders nothing without an error, so callers need no wrapper', () => {
    const { container } = renderWithProviders(<DataErrorState error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells an offline learner to check their connection', () => {
    renderWithProviders(<DataErrorState error={new DataError('offline', 'Failed to fetch')} />);
    expect(screen.getByText('Check your internet')).toBeInTheDocument();
  });

  it('takes the blame for a backend failure instead of blaming the learner', () => {
    renderWithProviders(<DataErrorState error={new DataError('upstream', 'gateway')} />);
    expect(screen.getByText('Our side is having a problem')).toBeInTheDocument();
  });

  it.each(['auth', 'notFound', 'unknown'] as const)('falls back to generic copy for %s', (kind) => {
    renderWithProviders(<DataErrorState error={new DataError(kind, 'x')} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('reassures the learner their words are safe', () => {
    renderWithProviders(<DataErrorState error={new DataError('upstream', 'gateway')} />);
    expect(screen.getByText(/Your words are safe/)).toBeInTheDocument();
  });

  it('never shows the raw driver message, status code or the word "upstream"', () => {
    const envoy =
      'upstream connect error or disconnect/reset before headers. delayed connect error: 111';
    const { container } = renderWithProviders(
      <DataErrorState error={new DataError('upstream', envoy, { status: 503 })} />,
    );
    expect(container.textContent).not.toContain('503');
    expect(container.textContent).not.toContain('connect error');
    expect(container.textContent?.toLowerCase()).not.toContain('upstream');
    expect(container.textContent?.toLowerCase()).not.toContain('server');
  });

  it('announces itself to a screen reader when it replaces content', () => {
    renderWithProviders(<DataErrorState error={new DataError('upstream', 'x')} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('fires onRetry from a real button', () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <DataErrorState error={new DataError('upstream', 'x')} onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry control when the caller cannot retry', () => {
    renderWithProviders(<DataErrorState error={new DataError('upstream', 'x')} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('drops the icon in dense mode but keeps the message', () => {
    renderWithProviders(<DataErrorState error={new DataError('offline', 'x')} dense />);
    expect(screen.getByText('Check your internet')).toBeInTheDocument();
    expect(screen.queryByText('📡')).not.toBeInTheDocument();
  });
});

describe('StaleDataHint', () => {
  it('says the data is what we saved earlier', () => {
    renderWithProviders(<StaleDataHint show />);
    expect(screen.getByText('Showing what we saved earlier')).toBeInTheDocument();
  });

  it('renders nothing when the data is fresh', () => {
    const { container } = renderWithProviders(<StaleDataHint show={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
