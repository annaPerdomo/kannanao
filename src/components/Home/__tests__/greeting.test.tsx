import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getGreeting } from '../greeting';

vi.mock('@/lib/timeOfDay', () => ({ resolveTimeOfDay: () => 'morning' }));

function t(
  _key: string,
  values: { name: string; n: (chunks: React.ReactNode) => React.ReactNode },
) {
  return <span data-testid="greeting">{values.n(`${values.name}さん`)}</span>;
}

const translate = { rich: t } as unknown as Parameters<typeof getGreeting>[1];

describe('getGreeting', () => {
  it('renders a short name unchanged', () => {
    render(<>{getGreeting('Anna', translate)}</>);
    expect(screen.getByTestId('greeting').textContent).toContain('Annaさん');
  });

  it('truncates a name too long to fit the hero on a phone', () => {
    const long = 'A'.repeat(40);
    render(<>{getGreeting(long, translate)}</>);
    const text = screen.getByTestId('greeting').textContent ?? '';
    expect(text).toContain(`${'A'.repeat(16)}…さん`);
    expect(text).not.toContain('A'.repeat(17));
  });

  it('counts astral characters as one so surrogate pairs are never split', () => {
    render(<>{getGreeting('👧'.repeat(20), translate)}</>);
    const text = screen.getByTestId('greeting').textContent ?? '';
    expect([...text.replace('さん', '').replace('​', '')]).toHaveLength(17);
  });
});
