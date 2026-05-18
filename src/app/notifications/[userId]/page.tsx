'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';

import { ChatPanel } from '../_components/ChatPanel';

export default function ConversationPage() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const recipientId = params!.userId;

  const { isMemberAccount } = useAuth();
  const { messages } = useDirectMessagesCtx();

  // Resolve recipient name from messages context, then fall back to query param
  const recipientName = useMemo(() => {
    for (const m of messages) {
      if (m.sender_id === recipientId) {
        return m.sender?.display_name || m.sender?.username || null;
      }
      if (m.recipient_id === recipientId) {
        return m.recipient?.display_name || m.recipient?.username || null;
      }
    }
    return null;
  }, [messages, recipientId]);

  const displayName = recipientName || searchParams?.get('name') || 'Chat';

  return (
    <ChatPanel
      recipientId={recipientId}
      recipientName={displayName}
      isMemberAccount={isMemberAccount}
    />
  );
}
