'use client';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { dbSetDeckPublic } from '@/lib/supabase';

interface ShareEmbedSectionProps {
  deckId: string;
  deckName: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
}

/**
 * Public-sharing switch plus the embed snippet it unlocks. Lives on its own so
 * the deck settings dialog and the standalone share dialog show the same thing.
 */
export function ShareEmbedSection({
  deckId,
  deckName,
  isPublic,
  onPublicChange,
}: ShareEmbedSectionProps) {
  const t = useTranslations('Deck.shareEmbedDialog');
  const { brand } = useTheme().palette;

  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const embedUrl = `${origin}/embed/deck/${deckId}`;
  const iframeCode = `<iframe\n  src="${embedUrl}"\n  width="380"\n  height="620"\n  frameborder="0"\n  allow="autoplay"\n  style="border-radius:16px;border:none;"\n  title="${deckName}"\n></iframe>`;

  const handleToggle = useCallback(async () => {
    setToggling(true);
    try {
      await dbSetDeckPublic(deckId, !isPublic);
      onPublicChange(!isPublic);
    } finally {
      setToggling(false);
    }
  }, [deckId, isPublic, onPublicChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [iframeCode]);

  return (
    <>
      {/* Public toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderRadius: 3,
          bgcolor: isPublic ? alpha(brand[100], 0.6) : alpha(brand[100], 0.3),
          border: `1.5px solid ${isPublic ? alpha(brand[300], 0.5) : alpha(brand[300], 0.3)}`,
          transition: 'all 0.2s ease',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
            {t('publicEmbedding')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {isPublic ? t('publicHintOn') : t('publicHintOff')}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            toggling ? (
              <CircularProgress size={20} sx={{ color: brand[600], mr: 1 }} />
            ) : (
              <Switch
                checked={isPublic}
                onChange={handleToggle}
                slotProps={{ input: { 'aria-label': t('publicEmbedding') } }}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: brand[500] },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand[400] },
                }}
              />
            )
          }
          label=""
          sx={{ m: 0 }}
        />
      </Box>

      {isPublic && (
        <>
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mt: 2.5,
              mb: 1,
            }}
          >
            {t('canvasEmbedCode')}
          </Typography>
          <Box
            sx={{
              position: 'relative',
              bgcolor: alpha(brand[100], 0.3),
              border: `1.5px solid ${alpha(brand[300], 0.35)}`,
              borderRadius: 3,
              p: 1.5,
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: (th) => th.fonts.mono,
                fontSize: '0.72rem',
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
                lineHeight: 1.6,
              }}
            >
              {iframeCode}
            </Typography>
            <Tooltip title={copied ? t('copied') : t('copyToClipboard')}>
              <IconButton
                size="small"
                onClick={handleCopy}
                aria-label={t('copyToClipboard')}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: copied ? alpha(brand[200], 0.5) : alpha(brand[100], 0.8),
                  border: `1.5px solid ${copied ? alpha(brand[400], 0.5) : alpha(brand[300], 0.4)}`,
                  color: brand[600],
                  '&:hover': { bgcolor: alpha(brand[100], 0.8) },
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? (
                  <CheckIcon sx={{ fontSize: 15 }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {/* How to embed instructions */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 3,
              bgcolor: alpha(brand[50], 0.8),
              border: `1.5px solid ${alpha(brand[200], 0.5)}`,
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: brand[700], mb: 0.75 }}>
              {t('howToAddToCanvas')}
            </Typography>
            {(t.raw('canvasSteps') as string[]).map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    color: brand[500],
                    fontWeight: 800,
                    minWidth: 14,
                    fontFamily: (th) => th.fonts.mono,
                  }}
                >
                  {i + 1}.
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.72rem',
                textTransform: 'none',
                color: brand[600],
                fontWeight: 700,
                '&:hover': { bgcolor: alpha(brand[100], 0.6) },
              }}
            >
              {t('previewEmbed')}
            </Button>
          </Box>
        </>
      )}
    </>
  );
}
