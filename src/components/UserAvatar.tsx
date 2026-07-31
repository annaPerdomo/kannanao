'use client';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha, useTheme } from '@mui/material/styles';

import { avatarAccent, avatarBg, avatarSrc } from '@/lib/buddies';

// The face art is drawn to the edge of its 224px square, so the disc is filled
// to 90% — enough that ears and chin clear the ring at every size we render.
const FACE_FILL = '90%';

interface UserAvatarProps {
  /** profiles.avatar value — '<item key>:<variant>', or null for the initial. */
  avatar?: string | null;
  /** Whose avatar this is; its first character is the fallback face. */
  name: string;
  size?: number;
  /** Overrides the initial fallback (e.g. "Me" on sent chat bubbles). */
  fallback?: string;
  sx?: SxProps<Theme>;
}

/**
 * A user's identity circle: their chosen buddy face on a white disc with the
 * buddy's accent ring, or the classic tinted initial when they haven't picked
 * one (or the stored value no longer resolves to a real face).
 */
export function UserAvatar({ avatar, name, size = 32, fallback, sx }: UserAvatarProps) {
  const { brand } = useTheme().palette;
  const src = avatarSrc(avatar);
  const accent = avatarAccent(avatar);
  const bg = avatarBg(avatar);

  if (src && accent) {
    return (
      <Avatar
        sx={[
          {
            width: size,
            height: size,
            bgcolor: bg ?? '#fff',
            border: `${size >= 32 ? 2 : 1.5}px solid ${accent}`,
            flexShrink: 0,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box
          component="img"
          src={src}
          alt=""
          sx={{
            width: FACE_FILL,
            height: FACE_FILL,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Avatar>
    );
  }

  return (
    <Avatar
      sx={[
        {
          width: size,
          height: size,
          fontSize: size * 0.4,
          fontWeight: 700,
          bgcolor: alpha(brand[400], 0.25),
          color: brand[700],
          flexShrink: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {fallback ?? (name.trim().charAt(0).toUpperCase() || '?')}
    </Avatar>
  );
}
