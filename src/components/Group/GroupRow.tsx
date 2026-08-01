'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { PinnableRow } from '@/components/PinnableRow';
import type { Group, GroupMemberFace } from '@/hooks/useGroups';
import { avatarSrc } from '@/lib/buddies';

interface GroupRowProps {
  group: Group;
  onOpen: (id: string) => void;
  /** Toggles whether this group appears on the home dashboard at all. */
  onPin?: (id: string, pinned: boolean) => void;
}

/**
 * Identity colours for the member avatars. Not `theme.palette.rainbow` — that
 * scale includes hues with no legible text colour at this size. Fixed rather
 * than themed, and each clears WCAG AA (≥4.5:1) against the white initial.
 */
const FACE_COLORS = ['#DB2777', '#7C3AED', '#C2410C', '#0E7490', '#2563EB', '#047857'];

/** Stable per-member colour — same member, same colour, on every render and device. */
function faceColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FACE_COLORS[hash % FACE_COLORS.length];
}

/** First character of a name, uppercased. Falls back to "?" for an empty name. */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * The overlapping circle of member initials. Decorative: every name it stands
 * for is already in the row's accessible label, so it is hidden from screen
 * readers rather than read out as a column of stray letters.
 */
function MemberFaces({ faces, overflow }: { faces: GroupMemberFace[]; overflow: number }) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (faces.length === 0) return null;

  const circle = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontSize: '0.8rem',
    fontWeight: 900,
    border: `2px solid ${theme.palette.background.paper}`,
    boxShadow: `0 2px 6px ${alpha(theme.palette.brand[900], 0.12)}`,
    flexShrink: 0,
    '&:not(:first-of-type)': { ml: '-11px' },
  } as const;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-hidden>
      {faces.map((f) => {
        const src = avatarSrc(f.avatar);
        return src ? (
          <Box key={f.id} sx={{ ...circle, bgcolor: '#fff', overflow: 'hidden' }}>
            <Box
              component="img"
              src={src}
              alt=""
              sx={{ width: '86%', height: '86%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box key={f.id} sx={{ ...circle, bgcolor: faceColor(f.id), color: '#fff' }}>
            {initial(f.name)}
          </Box>
        );
      })}
      {overflow > 0 && (
        <Box sx={{ ...circle, bgcolor: alpha(brand[200], 0.6), color: brand[800] }}>
          +{overflow}
        </Box>
      )}
    </Box>
  );
}

/** One group as a single compact row: who is in it, how much it has studied, and what it has earned this week. */
export function GroupRow({ group, onOpen, onPin }: GroupRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.groupRow');

  const overflow = Math.max(0, group.memberCount - group.faces.length);

  return (
    <PinnableRow
      onOpen={() => onOpen(group.id)}
      ariaLabel={t('openAriaLabel', {
        name: group.name,
        members: group.memberCount,
        cards: group.cardsStudied,
      })}
      pin={
        onPin && {
          pinned: group.pinned,
          onToggle: () => onPin(group.id, !group.pinned),
          pinLabel: t('pinToHome'),
          unpinLabel: t('unpinFromHome'),
        }
      }
    >
      <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '1.15rem',
            fontWeight: 800,
            lineHeight: 1.2,
            color: brand[900],
          }}
          noWrap
        >
          {group.emoji ? `${group.emoji} ${group.name}` : group.name}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          rowGap={0.5}
          columnGap={1.25}
          sx={{ flexWrap: 'wrap', minWidth: 0 }}
        >
          <MemberFaces faces={group.faces} overflow={overflow} />

          {/* Short on screen so the row stays one line; the row's aria-label
              spells out that these are cards *studied*, not cards owned. */}
          <Typography
            component="span"
            sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}
          >
            {t.rich('cards', {
              count: group.cardsStudied,
              b: (chunks) => (
                <Box component="b" sx={{ color: brand[900], fontWeight: 800 }}>
                  {chunks}
                </Box>
              ),
            })}
          </Typography>

          {group.activeCount > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  boxShadow: (th) => `0 0 0 3px ${alpha(th.palette.success.main, 0.18)}`,
                  flexShrink: 0,
                }}
              />
              <Typography
                component="span"
                sx={{ fontSize: '0.75rem', fontWeight: 800, color: 'success.dark' }}
              >
                {t('activeToday', { count: group.activeCount })}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Bottom-aligned so it stacks under the corner pin rather than meeting
          it halfway down the row. */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.3rem',
            fontWeight: 800,
            lineHeight: 1.1,
            color: brand[600],
          }}
        >
          {group.weeklyXp.toLocaleString()}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {t('thisWeek')}
        </Typography>
      </Box>
    </PinnableRow>
  );
}
