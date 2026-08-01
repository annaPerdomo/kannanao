import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
import { UserAvatar } from '@/components/UserAvatar';
import type { DirectMessage } from '@/hooks/useDirectMessages';
import { parseSticker, stickerSrc } from '@/lib/stickers';

import { splitLinks } from './constants';
import { MessageMeta } from './MessageMeta';
import { MessageReactions } from './MessageReactions';

interface MessageBubbleProps {
  message: DirectMessage;
  isMine: boolean;
  initial: string;
  /** Buddy-face avatar of whoever sent this bubble, or null for the initial. */
  avatar?: string | null;
  index: number;
  /** Changed periodically by useTick to force timestamp refresh */
  tick?: number;
  userId?: string;
  onReact?: (messageId: string, emoji: string) => void;
  /** Play the slide-in animation. Off for history so opening a thread doesn't flutter. */
  animate?: boolean;
}

export function MessageBubble({
  message,
  isMine,
  initial,
  avatar,
  index,
  tick: _tick,
  userId,
  onReact,
  animate = true,
}: MessageBubbleProps) {
  const { palette } = useTheme();
  const { brand } = palette;
  const t = useTranslations('Group.messageBubble');
  const tStickers = useTranslations('Messages.stickerNames');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const reactions = message.reactions || {};

  // A message whose whole text is a sticker keyword (":wave:") renders as the
  // artwork instead — no bubble chrome, so it reads like a sticker and not
  // like a text message that happens to contain a picture.
  const sticker = message.image_url || message.video_url ? null : parseSticker(message.message);
  const hasMedia = Boolean(message.image_url || message.video_url);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.75,
        ...(animate && {
          // Direction-specific keyframe names: a shared name would be
          // overwritten by whichever bubble variant renders last
          animation: `${isMine ? 'msgInRight' : 'msgInLeft'} 0.3s ease-out both`,
          animationDelay: `${Math.min(index * 0.04, 0.4)}s`,
          [`@keyframes ${isMine ? 'msgInRight' : 'msgInLeft'}`]: {
            from: {
              opacity: 0,
              transform: `translateX(${isMine ? '12px' : '-12px'}) scale(0.97)`,
            },
            to: { opacity: 1, transform: 'translateX(0) scale(1)' },
          },
        }),
      }}
    >
      {/* Avatar on left for received messages */}
      {!isMine && (
        <UserAvatar avatar={avatar} name="" fallback={initial} size={34} sx={{ mb: 0.3 }} />
      )}

      <Box sx={{ maxWidth: '75%', position: 'relative' }}>
        {/* Bubble */}
        <Box
          sx={{
            px: sticker ? 0 : hasMedia ? 0.5 : 1.5,
            py: sticker ? 0 : hasMedia ? 0.5 : 1,
            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            // A sticker stands on its own — the bubble would just box it in
            ...(sticker
              ? { bgcolor: 'transparent', border: 'none', overflow: 'visible' }
              : {
                  bgcolor: isMine ? alpha(brand[400], 0.2) : alpha(brand[100], 0.5),
                  border: `1px solid ${isMine ? alpha(brand[400], 0.3) : alpha(brand[200], 0.4)}`,
                  overflow: 'hidden',
                }),
            '&:hover .react-btn': { opacity: 1 },
          }}
        >
          {sticker && (
            // Deliberately NOT loading="lazy". A just-sent sticker is appended
            // below the fold of the scroll container, and lazy images there
            // often don't fetch until something else nudges the observer — and
            // because a sticker bubble has no background, an unloaded one is
            // invisible, so the message looks like it never sent. The sticker
            // IS the message; at ~18 KB it should always load.
            <Box
              component="img"
              src={stickerSrc(sticker.id)}
              alt={tStickers(sticker.id)}
              decoding="async"
              width={128}
              height={128}
              sx={{ width: 128, height: 128, display: 'block' }}
            />
          )}
          {message.image_url && (
            <Box
              component="a"
              href={message.image_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'block', lineHeight: 0 }}
            >
              {/* Fixed frame: reserving the space up front keeps the thread
                  from shifting (and breaking scroll position) as photos load */}
              <Box
                component="img"
                src={message.image_url}
                alt={t('sharedPhotoAlt')}
                loading="lazy"
                decoding="async"
                sx={{
                  width: 240,
                  maxWidth: '100%',
                  height: 200,
                  borderRadius: message.message ? '12px 12px 4px 4px' : '12px',
                  objectFit: 'cover',
                  display: 'block',
                  bgcolor: alpha(brand[100], 0.4),
                }}
              />
            </Box>
          )}
          {message.video_url && (
            // Fixed frame: reserving the space up front keeps the thread from
            // shifting (and breaking scroll position) as the video loads.
            <Box
              component="video"
              src={message.video_url}
              controls
              preload="metadata"
              sx={{
                width: 240,
                maxWidth: '100%',
                height: 200,
                borderRadius: message.message ? '12px 12px 4px 4px' : '12px',
                objectFit: 'contain',
                display: 'block',
                bgcolor: '#000',
              }}
            />
          )}
          {message.message && !sticker && (
            <Typography
              sx={{
                // Must visually match the input box text exactly (size AND
                // weight — the theme bolds TextField input to 600 by default)
                fontSize: '1rem',
                fontWeight: 500,
                lineHeight: 1.45,
                color: 'text.primary',
                wordBreak: 'break-word',
                px: hasMedia ? 1 : 0,
                pt: hasMedia ? 0.5 : 0,
              }}
            >
              {splitLinks(message.message).map((seg, i) =>
                seg.isLink ? (
                  <Link
                    key={i}
                    href={seg.text}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: isMine ? brand[800] : brand[700], fontWeight: 700 }}
                  >
                    {seg.text}
                  </Link>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </Typography>
          )}
          <MessageMeta
            createdAt={message.created_at}
            isMine={isMine}
            readAt={message.read_at}
            inset={hasMedia}
          />

          {/* Reaction button — appears on hover */}
          {onReact && (
            <IconButton
              className="react-btn"
              size="small"
              aria-label={t('addReactionAriaLabel')}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                position: 'absolute',
                top: -4,
                ...(isMine ? { left: -16 } : { right: -16 }),
                width: 24,
                height: 24,
                opacity: { xs: 1, sm: 0 },
                transition: 'opacity 0.15s ease',
                bgcolor: alpha(brand[100], 0.8),
                border: `1px solid ${alpha(brand[300], 0.4)}`,
                color: brand[500],
                '&:hover': { bgcolor: brand[100], color: brand[700] },
              }}
            >
              <AddReactionOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        {/* Reactions — in normal flow under the bubble, aligned to its side */}
        <MessageReactions
          reactions={reactions}
          isMine={isMine}
          userId={userId}
          onToggle={(emoji) => onReact?.(message.id, emoji)}
        />
      </Box>

      {/* Avatar on right for sent messages */}
      {isMine && (
        <UserAvatar
          avatar={avatar}
          name=""
          fallback={t('meLabel')}
          size={34}
          sx={{ mb: 0.3, ...(avatar ? {} : { bgcolor: alpha(brand[600], 0.2) }) }}
        />
      )}

      {/* Emoji picker popover */}
      <EmojiPickerPopover
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onSelect={(emoji) => onReact?.(message.id, emoji)}
      />
    </Box>
  );
}
