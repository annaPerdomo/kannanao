'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { fetchDisplayName } from '@/lib/supabase';

import { ChatPanel } from '../_components/ChatPanel';

export default function ConversationPage() {
  const params = useParams<{ userId: string }>();
  const recipientId = params!.userId;

  const { isMemberAccount } = useAuth();
  const { messages } = useDirectMessagesCtx();
  const [fetchedName, setFetchedName] = useState<string | null>(null);

  // Resolve recipient name from messages context
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

  // Fetch from DB if not available in messages context
  useEffect(() => {
    if (!recipientName && !fetchedName) {
      fetchDisplayName(recipientId).then(setFetchedName);
    }
  }, [recipientId, recipientName, fetchedName]);

  const displayName = recipientName || fetchedName || 'Chat';

  return (
    <ChatPanel
      recipientId={recipientId}
      recipientName={displayName}
      isMemberAccount={isMemberAccount}
    />
  );
}
