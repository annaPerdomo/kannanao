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
    // Skip rows without profile joins (e.g. optimistic sends) instead of
    // giving up on the first match — a later row usually has the name.
    for (const m of messages) {
      if (m.sender_id === recipientId && m.sender) {
        return m.sender.display_name || m.sender.username;
      }
      if (m.recipient_id === recipientId && m.recipient) {
        return m.recipient.display_name || m.recipient.username;
      }
    }
    return null;
  }, [messages, recipientId]);

  // Fetch from DB if not available in messages context. Reset first so a name
  // fetched for a previous conversation never shows on this one, and ignore a
  // slow response that lands after another switch.
  useEffect(() => {
    setFetchedName(null);
    if (recipientName) return;
    let active = true;
    void fetchDisplayName(recipientId).then((name) => {
      if (active) setFetchedName(name);
    });
    return () => {
      active = false;
    };
  }, [recipientId, recipientName]);

  const displayName = recipientName || fetchedName || 'Chat';

  return (
    <ChatPanel
      recipientId={recipientId}
      recipientName={displayName}
      isMemberAccount={isMemberAccount}
    />
  );
}
