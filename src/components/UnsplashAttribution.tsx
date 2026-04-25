'use client';
import Box from '@mui/material/Box';
import { decodeUnsplashAttribution } from '@/services/api';

interface UnsplashAttributionProps {
  url: string;
}

export function UnsplashAttribution({ url }: UnsplashAttributionProps) {
  const attribution = decodeUnsplashAttribution(url);
  if (!attribution) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        px: 0.75,
        py: 0.4,
        bgcolor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        fontSize: '0.5rem',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.3,
        display: 'flex',
        gap: '2px',
        flexWrap: 'wrap',
      }}
    >
      Photo by{' '}
      <Box
        component="a"
        href={attribution.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'white', textDecoration: 'underline', '&:hover': { opacity: 0.85 } }}
      >
        {attribution.name}
      </Box>
      {' '}on{' '}
      <Box
        component="a"
        href={attribution.photoPageUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: 'white', textDecoration: 'underline', '&:hover': { opacity: 0.85 } }}
      >
        Unsplash
      </Box>
    </Box>
  );
}
