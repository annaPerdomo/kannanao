import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { BuddyReactionProvider, useBuddyReaction } from '@/contexts/BuddyReactionContext';
import { publishSessionEnd } from '@/lib/sessionSignal';

const wrapper = ({ children }: { children: ReactNode }) => (
  <BuddyReactionProvider>{children}</BuddyReactionProvider>
);

function setup() {
  return renderHook(() => useBuddyReaction(), { wrapper });
}

describe('BuddyReactionContext', () => {
  it('passes plain reactions through', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('correct', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('correct');
    act(() => result.current.triggerReaction('wrong', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('wrong');
  });

  it('re-triggers with a fresh key for the same reaction twice', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('correct'));
    const firstKey = result.current.reactionEvent?.key;
    act(() => result.current.triggerReaction('correct'));
    expect(result.current.reactionEvent?.key).not.toBe(firstKey);
  });

  it('upgrades a recovered miss to a comeback, once per card', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('wrong', 'c1'));
    act(() => result.current.triggerReaction('correct', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('comeback');
    act(() => result.current.triggerReaction('correct', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('correct');
  });

  it('does not upgrade a card that was never missed', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('wrong', 'c1'));
    act(() => result.current.triggerReaction('correct', 'c2'));
    expect(result.current.reactionEvent?.reaction).toBe('correct');
  });

  it('never upgrades without a card id', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('wrong'));
    act(() => result.current.triggerReaction('correct'));
    expect(result.current.reactionEvent?.reaction).toBe('correct');
  });

  it('upgrades a card that was marked missed without a bubble of its own', () => {
    const { result } = setup();
    act(() => result.current.markMissed('c1'));
    expect(result.current.reactionEvent).toBeNull();
    act(() => result.current.triggerReaction('correct', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('comeback');
  });

  it('forgets misses when the session ends', () => {
    const { result } = setup();
    act(() => result.current.triggerReaction('wrong', 'c1'));
    act(() => publishSessionEnd(10));
    act(() => result.current.triggerReaction('correct', 'c1'));
    expect(result.current.reactionEvent?.reaction).toBe('correct');
  });
});
