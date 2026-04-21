'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Box, Switch, FormControlLabel,
  CircularProgress, Tooltip, IconButton, Button,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { dbSetDeckPublic } from '@/lib/supabase';
import { StyledDialog } from '@/components/StyledDialog';

interface ShareEmbedDialogProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
}

export function ShareEmbedDialog({
  open, onClose, deckId, deckName, isPublic, onPublicChange,
}: ShareEmbedDialogProps) {
  const { palette } = useTheme();
  const { brand, accent } = palette;

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
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Embed Deck"
      subtitle={deckName}
      icon={<CodeIcon sx={{ color: accent[600], fontSize: 20 }} />}
      maxWidth="sm"
      actions={
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}>
          Done
        </Button>
      }
    >
      {/* Public toggle */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        p: 2, borderRadius: 3,
        bgcolor: isPublic ? alpha(accent[100], 0.6) : alpha(brand[100], 0.3),
        border: `1.5px solid ${isPublic ? alpha(accent[300], 0.5) : alpha(brand[300], 0.3)}`,
        mb: 2.5,
        transition: 'all 0.2s ease',
      }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
            Public embedding
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {isPublic
              ? 'Anyone with the link can view this deck'
              : 'Enable to allow this deck to be embedded'}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            toggling
              ? <CircularProgress size={20} sx={{ color: accent[600], mr: 1 }} />
              : <Switch
                  checked={isPublic}
                  onChange={handleToggle}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accent[600] },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accent[400] },
                  }}
                />
          }
          label=""
          sx={{ m: 0 }}
        />
      </Box>

      {isPublic && (
        <>
          <Typography sx={{
            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'text.secondary', mb: 1,
          }}>
            Canvas embed code
          </Typography>
          <Box sx={{
            position: 'relative',
            bgcolor: alpha(brand[100], 0.3),
            border: `1.5px solid ${alpha(brand[300], 0.35)}`,
            borderRadius: 3, p: 1.5,
          }}>
            <Typography
              component="pre"
              sx={{
                fontFamily: (t) => t.fonts.mono, fontSize: '0.72rem',
                color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                m: 0, lineHeight: 1.6,
              }}
            >
              {iframeCode}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  position: 'absolute', top: 8, right: 8,
                  bgcolor: copied ? alpha(accent[500], 0.15) : alpha(brand[100], 0.8),
                  border: `1.5px solid ${copied ? alpha(accent[400], 0.5) : alpha(brand[300], 0.4)}`,
                  color: copied ? accent[600] : brand[600],
                  '&:hover': { bgcolor: alpha(accent[100], 0.8) },
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* How to embed instructions */}
          <Box sx={{
            mt: 2, p: 1.5, borderRadius: 3,
            bgcolor: alpha(brand[50], 0.8),
            border: `1.5px solid ${alpha(brand[200], 0.5)}`,
          }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: brand[700], mb: 0.75 }}>
              How to add to Canvas:
            </Typography>
            {[
              'Open your Canvas page in the Rich Content Editor',
              'Click Insert → "Embed" or switch to the HTML editor (</>)',
              'Paste the embed code above',
              'Save — students can flip cards without logging in',
            ].map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.68rem', color: brand[500], fontWeight: 800, minWidth: 14, fontFamily: (t) => t.fonts.mono }}>
                  {i + 1}.
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{step}</Typography>
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
                fontSize: '0.72rem', textTransform: 'none', color: accent[600],
                fontWeight: 700,
                '&:hover': { bgcolor: alpha(accent[100], 0.6) },
              }}
            >
              Preview embed
            </Button>
          </Box>
        </>
      )}
    </StyledDialog>
  );
}
