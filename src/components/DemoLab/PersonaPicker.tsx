'use client';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { DEMO_PERSONAS } from '@/lib/demo';

interface PersonaPickerProps {
  selected: string;
  onSelect: (key: string) => void;
}

export function PersonaPicker({ selected, onSelect }: PersonaPickerProps) {
  const t = useTranslations('DemoLab');
  const { brand } = useTheme().palette;
  const featured = DEMO_PERSONAS.filter((persona) => persona.featured);

  return (
    <Stack spacing={1}>
      <Typography
        component="h2"
        sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}
      >
        {t('personaPickerLabel')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {featured.map((persona) => {
          const isSelected = persona.key === selected;
          return (
            <Paper
              key={persona.key}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onSelect(persona.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(persona.key);
                }
              }}
              elevation={0}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 3,
                cursor: 'pointer',
                border: `2px solid ${isSelected ? brand[500] : alpha(brand[300], 0.5)}`,
                bgcolor: isSelected ? alpha(brand[200], 0.5) : 'background.paper',
                '&:hover': { borderColor: brand[400] },
              }}
            >
              <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>
                {persona.displayName}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                {t(`personas.${persona.key}`)}
              </Typography>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
