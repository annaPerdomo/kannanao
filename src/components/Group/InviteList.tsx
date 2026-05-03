'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { InviteCode } from '@/hooks/useInvites';

interface InviteListProps {
  invites: InviteCode[];
  onRevoke: (id: string) => void;
  onShowQR: (invite: InviteCode) => void;
}

function maskCode(code: string): string {
  if (code.length <= 4) return code;
  return code.slice(0, 3) + '***' + code.slice(-2);
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Never';
  const date = new Date(expiresAt);
  if (date < new Date()) return 'Expired';
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

function usesLabel(invite: InviteCode): string {
  if (invite.max_uses === null) return `${invite.times_used} used`;
  const remaining = invite.max_uses - invite.times_used;
  return `${remaining}/${invite.max_uses} left`;
}

function isExpired(invite: InviteCode): boolean {
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return true;
  if (invite.max_uses !== null && invite.times_used >= invite.max_uses) return true;
  return false;
}

export function InviteList({ invites, onRevoke, onShowQR }: InviteListProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (invites.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', py: 1 }}>
        No invite codes yet. Create one to onboard members!
      </Typography>
    );
  }

  return (
    <Stack gap={1}>
      {invites.map((invite) => {
        const expired = isExpired(invite);
        return (
          <Box
            key={invite.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: expired ? alpha(brand[100], 0.15) : alpha(brand[100], 0.3),
              opacity: expired ? 0.6 : 1,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                {invite.label && (
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: brand[700],
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {invite.label}
                  </Typography>
                )}
                <Chip
                  label={maskCode(invite.code)}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    height: 22,
                    bgcolor: alpha(brand[200], 0.4),
                    color: brand[700],
                  }}
                />
              </Stack>
              <Stack direction="row" gap={1.5} sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                  {usesLabel(invite)}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                  Expires: {formatExpiry(invite.expires_at)}
                </Typography>
              </Stack>
            </Box>

            <IconButton
              size="small"
              onClick={() => onShowQR(invite)}
              disabled={expired}
              aria-label="Show QR code"
              sx={{ color: brand[500] }}
            >
              <QrCode2Icon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onRevoke(invite.id)}
              aria-label="Revoke invite"
              sx={{ color: theme.palette.error.main }}
            >
              <DeleteIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Box>
        );
      })}
    </Stack>
  );
}
