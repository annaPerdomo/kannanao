'use client';

import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Loading } from '@/components/Loading';
import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { ChatPanel } from './_components/ChatPanel';
import { ConversationList } from './_components/ConversationList';

const PUSH_DISMISSED_KEY = 'kannanao:push-prompt-dismissed';

interface SelectedConversation {
  id: string;
  name: string;
}

export default function NotificationsPage() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();
  const { user, loading: authLoading, isMemberAccount } = useAuth();
  const { messages, loading: dmLoading } = useDirectMessagesCtx();
  const push = usePushNotifications();

  const [selected, setSelected] = useState<SelectedConversation | null>(null);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(PUSH_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismissPrompt = useCallback(() => {
    setPushPromptDismissed(true);
    try {
      localStorage.setItem(PUSH_DISMISSED_KEY, 'true');
    } catch {
      // localStorage unavailable (e.g. private browsing quota)
    }
  }, []);

  if (authLoading || dmLoading) return <Loading />;
  if (!user) {
    router.push('/login');
    return null;
  }

  // Prompt when browser hasn't been asked yet (permission === 'default'),
  // OR when permission was granted but the subscription is missing (e.g. iOS dropped it,
  // server save failed, user cleared site data). This ensures users can recover.
  const showPushPrompt =
    push.isSupported &&
    !push.initializing &&
    push.permission !== 'denied' &&
    (!push.isSubscribed || push.permission === 'default') &&
    !pushPromptDismissed;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 56, sm: 64 },
          left: 0,
          right: 0,
          bottom: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`, sm: 0 },
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left panel — conversations */}
        <Box
          sx={{
            width: { xs: '100%', sm: 340 },
            flexShrink: 0,
            borderRight: { sm: `1.5px solid ${alpha(brand[500], 0.35)}` },
            display: { xs: selected ? 'none' : 'flex', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <ConversationList
            messages={messages}
            userId={user.id}
            selectedId={selected?.id}
            onSelect={(id, name) => setSelected({ id, name })}
          />
        </Box>

        {/* Right panel — chat or empty state */}
        <Box
          sx={{
            flex: 1,
            display: { xs: selected ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {selected ? (
            <ChatPanel
              recipientId={selected.id}
              recipientName={selected.name}
              isMemberAccount={isMemberAccount}
              onBack={() => setSelected(null)}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: '3rem' }}>💬</Typography>
              <Typography sx={{ fontWeight: 700, color: brand[600] }}>
                Select a conversation
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                Choose a chat from the left to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Push notification prompt — appears every visit until enabled or dismissed */}
      <StyledDialog
        open={showPushPrompt}
        onClose={dismissPrompt}
        title="Stay in the loop!"
        subtitle="Get notified when you receive new messages"
        icon={<NotificationsActiveIcon sx={{ color: brand[600], fontSize: 22 }} />}
        maxWidth="xs"
        actions={
          <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
            <Button
              onClick={dismissPrompt}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 700,
                color: 'text.secondary',
              }}
            >
              Not now
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  await push.subscribe();
                } catch {
                  // Subscription may fail (SW not ready, etc.) — still dismiss
                }
                dismissPrompt();
              }}
              disabled={push.loading}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
              }}
            >
              {push.loading ? 'Enabling...' : 'Enable'}
            </Button>
          </Stack>
        }
        actionsJustify="center"
      >
        <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem', textAlign: 'center' }}>
          Turn on notifications so you never miss a message from your group.
        </Typography>
      </StyledDialog>
    </>
  );
}
