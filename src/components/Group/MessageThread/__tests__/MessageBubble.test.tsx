import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageBubble } from '@/components/Group/MessageThread/MessageBubble';
import { theme } from '@/theme';

function renderBubble(overrides: Record<string, unknown> = {}) {
  const message = {
    id: 'd1',
    sender_id: 'm1',
    recipient_id: 'org1',
    message: null,
    image_url: null,
    video_url: null,
    read_at: null,
    created_at: '2026-07-13T10:00:00Z',
    ...overrides,
  };
  return render(
    <ThemeProvider theme={theme}>
      <MessageBubble message={message} isMine index={0} initial="Me" animate={false} />
    </ThemeProvider>,
  );
}

describe('MessageBubble', () => {
  it('renders a video element when video_url is set', () => {
    renderBubble({ video_url: 'https://x/a.mp4' });
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video).toHaveAttribute('src', 'https://x/a.mp4');
    expect(video).toHaveAttribute('controls');
  });

  it('renders an image (not a video) when only image_url is set', () => {
    renderBubble({ image_url: 'https://x/a.jpg' });
    expect(screen.getByAltText('Shared photo')).toHaveAttribute('src', 'https://x/a.jpg');
    expect(document.querySelector('video')).toBeNull();
  });

  it('renders neither media element for a text-only message', () => {
    renderBubble({ message: 'Hi!' });
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Hi!')).toBeInTheDocument();
  });

  it('renders a URL in message text as a clickable link', () => {
    renderBubble({ message: 'check this out: https://example.com/page' });
    const link = screen.getByRole('link', { name: 'https://example.com/page' });
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('does not linkify plain text with no URL', () => {
    renderBubble({ message: 'no links here' });
    expect(screen.queryByRole('link')).toBeNull();
  });
});
