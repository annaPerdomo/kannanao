'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { fetchPeerIdentity, type PeerIdentity } from '@/lib/supabase';

import { ChatPanel } from '../_components/ChatPanel';

export default function ConversationPage() {
  const params = useParams<{ userId: string }>();
  const recipientId = params!.userId;

  const { isMemberAccount } = useAuth();
  const { messages } = useDirectMessagesCtx();
  const [fetchedPeer, setFetchedPeer] = useState<PeerIdentity | null>(null);

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

  // Fetch from DB if not available in messages context. Reset first so an
  // identity fetched for a previous conversation never shows on this one, and
  // ignore a slow response that lands after another switch. When the name did
  // come from a message, that row's profile join carries the avatar too, so
  // ChatPanel already has both.
  useEffect(() => {
    setFetchedPeer(null);
    if (recipientName) return;
    let active = true;
    void fetchPeerIdentity(recipientId).then((peer) => {
      if (active) setFetchedPeer(peer);
    });
    return () => {
      active = false;
    };
  }, [recipientId, recipientName]);

  const displayName = recipientName || fetchedPeer?.displayName || 'Chat';

  return (
    <ChatPanel
      recipientId={recipientId}
      recipientName={displayName}
      recipientAvatar={fetchedPeer?.avatar ?? null}
      isMemberAccount={isMemberAccount}
    />
  );
}
