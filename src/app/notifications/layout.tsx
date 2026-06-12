'use client';

import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessagesCtx } from '@/contexts/DirectMessagesContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { ConversationList } from './_components/ConversationList';

// v2: re-prompt users who dismissed while push was broken (VAPID key mismatch)
const PUSH_DISMISSED_KEY = 'kannanao:push-prompt-dismissed-v2';

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { messages, ensureLoaded } = useDirectMessagesCtx();
  const push = usePushNotifications();

  // The global messages provider only keeps an unread count by default; the
  // conversation list needs the full message history, so load it here.
  const [dmLoading, setDmLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void ensureLoaded().finally(() => {
      if (active) setDmLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ensureLoaded]);

  // A conversation is selected when the URL has a userId segment
  const hasSelection =
    !!pathname && pathname !== '/notifications' && pathname !== '/notifications/';

  // Extract selectedId from the URL path (/notifications/[userId])
  const selectedId = hasSelection ? pathname.split('/').pop() : undefined;

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

  // Banner fallback: unlike the one-time dialog, this stays available whenever
  // notifications aren't actually working, and it surfaces the real error —
  // iOS rejects silent re-subscribes, so a visible tap target is the only
  // reliable way back in once the dialog has been dismissed.
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushJustEnabled, setPushJustEnabled] = useState(false);
  const { subscribe: pushSubscribe } = push;

  const handleEnablePush = useCallback(async () => {
    setPushError(null);
    try {
      await pushSubscribe();
      setPushJustEnabled(true);
    } catch (err) {
      const e = err as Error;
      setPushError(`${e?.name ?? 'Error'}: ${e?.message ?? String(err)}`);
    }
  }, [pushSubscribe]);

  if (authLoading) return <Loading />;
  if (!user) {
    router.push('/login');
    return null;
  }
  if (dmLoading) return <Loading />;

  // The dialog only handles first-time permission; everything after that
  // (failed save, dropped subscription, dismissed dialog) goes through the
  // persistent banner below, which ignores the dismissed flag.
  const showPushPrompt =
    push.isSupported && !push.initializing && push.permission === 'default' && !pushPromptDismissed;

  const showPushBanner =
    push.isSupported &&
    !push.initializing &&
    (!push.isSubscribed || pushJustEnabled) &&
    // While the first-time dialog is available, don't double up with the banner
    (push.permission !== 'default' || pushPromptDismissed);

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
            borderRight: { sm: `1.5px solid ${alpha(brand[300], 0.4)}` },
            boxShadow: { sm: `2px 0 8px ${alpha(brand[400], 0.1)}` },
            bgcolor: alpha('#FFFFFF', 0.55),
            display: { xs: hasSelection ? 'none' : 'flex', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {showPushBanner && (
            <Box sx={{ px: 2, pt: 1.5 }}>
              {pushJustEnabled && push.isSubscribed ? (
                <Alert severity="success" sx={{ borderRadius: 2.5, fontSize: '0.8rem' }}>
                  Notifications are on! 🎉
                </Alert>
              ) : push.permission === 'denied' ? (
                <Alert severity="warning" sx={{ borderRadius: 2.5, fontSize: '0.8rem' }}>
                  Notifications are blocked for Kannanao — turn them on in your device Settings,
                  then come back here.
                </Alert>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<NotificationsActiveIcon />}
                  onClick={() => void handleEnablePush()}
                  disabled={push.loading}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    borderRadius: 2.5,
                    color: brand[700],
                    borderColor: alpha(brand[400], 0.5),
                    bgcolor: alpha(brand[50], 0.6),
                    '&:hover': { bgcolor: alpha(brand[100], 0.6) },
                  }}
                >
                  {push.loading ? 'Turning on…' : 'Turn on notifications'}
                </Button>
              )}
              {pushError && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 2.5, fontSize: '0.75rem' }}>
                  {pushError}
                </Alert>
              )}
            </Box>
          )}
          <ConversationList messages={messages} userId={user.id} selectedId={selectedId} />
        </Box>

        {/* Right panel — chat or empty state */}
        <Box
          sx={{
            flex: 1,
            display: { xs: hasSelection ? 'flex' : 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
            bgcolor: alpha(brand[50], 0.25),
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Push notification prompt */}
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
