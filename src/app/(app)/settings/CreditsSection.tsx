'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { APP_NAME } from '@/lib/brand';

import { Section } from './Section';

const UNSPLASH_URL = `https://unsplash.com/?utm_source=${APP_NAME.toLowerCase()}&utm_medium=referral`;

function creditLink(href: string) {
  return function CreditLink(chunks: ReactNode) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer">
        {chunks}
      </Link>
    );
  };
}

export function CreditsSection() {
  const t = useTranslations('Settings.credits');

  return (
    <Section icon={<InfoOutlinedIcon />} title={t('title')} description={t('description')}>
      <Stack gap={1}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
          {t.rich('kanjidic', {
            kanjidic: creditLink('https://www.edrdg.org/wiki/index.php/KANJIDIC_Project'),
            edrdg: creditLink('https://www.edrdg.org/'),
            licence: creditLink('https://www.edrdg.org/edrdg/licence.html'),
          })}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
          {t.rich('unsplash', {
            unsplash: creditLink(UNSPLASH_URL),
          })}
        </Typography>
      </Stack>
    </Section>
  );
}
