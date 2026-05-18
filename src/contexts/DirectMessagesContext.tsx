'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useDirectMessages } from '@/hooks/useDirectMessages';

type DirectMessagesContextValue = ReturnType<typeof useDirectMessages>;

const noopAsync = async () => {};

const DirectMessagesCtx = createContext<DirectMessagesContextValue>({
  messages: [],
  unreadCount: 0,
  loading: true,
  sendMessage: noopAsync as DirectMessagesContextValue['sendMessage'],
  markAsRead: noopAsync,
  markAllAsRead: noopAsync,
  toggleReaction: noopAsync,
  refetch: noopAsync,
});

export function DirectMessagesProvider({ children }: { children: ReactNode }) {
  const value = useDirectMessages();
  return <DirectMessagesCtx.Provider value={value}>{children}</DirectMessagesCtx.Provider>;
}

export function useDirectMessagesCtx(): DirectMessagesContextValue {
  return useContext(DirectMessagesCtx);
}
