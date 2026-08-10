'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { REVIEW_BACKLOG_THRESHOLD } from '../reviewBacklog';
import { accuracyFraction, accuracyTone } from './derive';
import { accuracyCompactLabel, cardsStudiedLabel, streakLabel } from './format';
import { LearnerIdentity } from './LearnerIdentity';
import { StatusLabel } from './StatusLabel';

interface MobileListProps {
  members: GroupMember[];
  onSelect: (id: string) => void;
}

/**
 * Not a ButtonBase around the whole row — `LearnerIdentity`'s name is already
 * a real button, and a button inside a button is invalid HTML. This is a
 * plain clickable Box for mouse convenience only; keyboard/screen-reader
 * users reach the row through the name link.
 */
export function MobileList({ members, onSelect }: MobileListProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.learnersTable');

  return (
    <Stack
      divider={<Box sx={{ borderBottom: `1px solid ${alpha(brand[300], 0.2)}` }} />}
      sx={{ display: { xs: 'flex', sm: 'none' } }}
    >
      {members.map((member) => {
        const fraction = accuracyFraction(member);
        const accuracyColor =
          fraction === null ? 'text.secondary' : `${accuracyTone(fraction)}.main`;

        return (
          <Box
            key={member.id}
            onClick={() => onSelect(member.id)}
            sx={{
              py: 1.5,
              cursor: 'pointer',
              borderRadius: theme.radii.md,
              '&:hover': { bgcolor: alpha(brand[100], 0.5) },
            }}
          >
            <LearnerIdentity member={member} onSelect={onSelect} />
            <Box sx={{ pl: '48px', mt: 0.5 }}>
              <StatusLabel member={member} />
            </Box>
            <Typography sx={{ pl: '48px', mt: 0.25, fontSize: '0.78rem', color: 'text.secondary' }}>
              {streakLabel(member, t)} · {cardsStudiedLabel(member, t)} ·{' '}
              <Box component="span" sx={{ color: accuracyColor, fontWeight: 700 }}>
                {accuracyCompactLabel(member, t)}
              </Box>
              {/* Dropped at zero and when unknown: with no column header, a
                  dash on this line just reads as missing data. */}
              {member.reviewsWaiting !== null && member.reviewsWaiting > 0 && (
                <>
                  {' · '}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: member.reviewsWaiting >= REVIEW_BACKLOG_THRESHOLD ? 700 : 400,
                    }}
                  >
                    {t('reviewsWaitingCompact', { count: member.reviewsWaiting })}
                  </Box>
                </>
              )}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
