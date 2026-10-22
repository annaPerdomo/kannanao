import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChainModeText } from '@/hooks/useChainModeText';

describe('useChainModeText', () => {
  it('shows the plain AssignmentQuest description for kotoba-bubble, not the deck one', () => {
    const { result } = renderHook(() => useChainModeText());
    const { label, description } = result.current('kotoba-bubble');
    expect(label).toBe('Sentence Builder');
    expect(description).toBe('Pick the little word that fits the sentence');
  });

  it('falls back to the deck description when no quest override exists', () => {
    const { result } = renderHook(() => useChainModeText());
    const { description } = result.current('match');
    expect(description).not.toBe('');
  });
});
