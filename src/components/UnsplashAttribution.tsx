'use client';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { decodeUnsplashAttribution } from '@/services/api';

interface UnsplashAttributionProps {
  url: string;
  /**
   * `overlay` needs a picture big enough to read it on; `caption` is the
   * line-of-text form for thumbnails, which Unsplash still requires a credit on.
   */
  variant?: 'overlay' | 'caption';
}

const overlaySx = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  px: 0.75,
  py: 0.4,
  bgcolor: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(2px)',
  fontSize: '0.6rem',
  color: 'rgba(255,255,255,0.92)',
  lineHeight: 1.3,
  display: 'flex',
  gap: '2px',
  flexWrap: 'wrap',
} as const;

// Not text.secondary: on brand[50] rows and white dialogs every skin's
// secondary tone lands under 4.5:1.
const captionSx = {
  fontSize: '0.7rem',
  color: 'text.primary',
  lineHeight: 1.3,
  display: 'flex',
  gap: '2px',
  flexWrap: 'wrap',
} as const;

export function UnsplashAttribution({ url, variant = 'overlay' }: UnsplashAttributionProps) {
  const t = useTranslations('Common');
  const attribution = decodeUnsplashAttribution(url);
  if (!attribution) return null;

  const linkSx =
    variant === 'overlay'
      ? { color: 'white', textDecoration: 'underline', '&:hover': { opacity: 0.85 } }
      : { color: 'inherit', textDecoration: 'underline', '&:hover': { opacity: 0.75 } };

  const link = (href: string) =>
    function CreditLink(chunks: ReactNode) {
      return (
        <Box component="a" href={href} target="_blank" rel="noopener noreferrer" sx={linkSx}>
          {chunks}
        </Box>
      );
    };

  return (
    <Box sx={variant === 'overlay' ? overlaySx : captionSx}>
      {t.rich('unsplashCredit', {
        name: attribution.name,
        photographer: link(attribution.photographerUrl),
        unsplash: link(attribution.photoPageUrl),
      })}
    </Box>
  );
}
