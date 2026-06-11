import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PushAutoResubscribe } from '@/components/PushAutoResubscribe';

const usePushNotificationsMock = vi.fn(() => ({
  permission: 'default' as NotificationPermission,
  isSubscribed: false,
  isSupported: false,
  loading: false,
  initializing: false,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => usePushNotificationsMock(),
}));

describe('PushAutoResubscribe', () => {
  it('mounts the push hook and renders nothing', () => {
    const { container } = render(<PushAutoResubscribe />);
    expect(usePushNotificationsMock).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
