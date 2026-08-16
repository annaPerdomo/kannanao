import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryBubble } from '@/components/BuddyFriendship/StoryBubble';
import { renderWithProviders } from '@/test/renderWithProviders';

function mockReducedMotion(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (media: string) =>
      ({
        matches,
        media,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

/** jsdom's getComputedStyle never resolves emotion's classes, so read the injected <style> tags instead. */
function bubbleCss(container: HTMLElement): string {
  const bubble = container.querySelector<HTMLElement>('.MuiBox-root')!;
  const sheets = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('');
  const emotion = [...bubble.classList].find((c) => c.startsWith('css-'));
  const own = sheets.match(new RegExp(`\\.${emotion}\\{[^}]*\\}`))?.[0] ?? '';
  const keyframes = own.match(/animation:\s*([\w-]+)/)?.[1];
  const frames = keyframes
    ? (sheets.match(new RegExp(`@keyframes ${keyframes}\\{.*?\\}\\}`))?.[0] ?? '')
    : '';
  return own + frames;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StoryBubble', () => {
  it('should slide a freshly revealed line in', () => {
    mockReducedMotion(false);
    const { container } = renderWithProviders(<StoryBubble text="ぽん。" />);
    expect(bubbleCss(container)).toMatch(/translateY/);
  });

  it('should not move the line when reduced motion is on', () => {
    mockReducedMotion(true);
    const { container } = renderWithProviders(<StoryBubble text="ぽん。" />);
    const css = bubbleCss(container);
    expect(css).toMatch(/animation:/);
    expect(css).not.toMatch(/translate|scale/);
  });

  it('should skip the animation for lines that were already on screen', () => {
    mockReducedMotion(false);
    const { container } = renderWithProviders(<StoryBubble text="ぽん。" animate={false} />);
    expect(bubbleCss(container)).toMatch(/animation:\s*none/);
  });
});
