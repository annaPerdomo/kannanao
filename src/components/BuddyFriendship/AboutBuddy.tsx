'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface AboutBuddyProps {
  name: string;
  facts: string[];
}

export function AboutBuddy({ name, facts }: AboutBuddyProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  if (!facts.length) return null;

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brand[700] }}>
        {t('about.heading', { name })}
      </Typography>
      {/* Safari/VoiceOver drops list semantics from a list styled with none. */}
      <Box
        component="ul"
        role="list"
        sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.5 }}
      >
        {facts.map((fact, i) => (
          <Box
            component="li"
            key={i}
            sx={{
              display: 'flex',
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              borderRadius: 3,
              bgcolor: alpha(brand[100], 0.4),
            }}
          >
            <Box aria-hidden sx={{ color: brand[400], fontSize: '0.82rem', lineHeight: 1.55 }}>
              ✦
            </Box>
            <Typography sx={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'text.primary' }}>
              {fact}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
