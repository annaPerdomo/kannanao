'use client';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HideImageIcon from '@mui/icons-material/HideImage';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { Box, CircularProgress, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { ConfirmRemoveImageDialog } from '@/components/ConfirmRemoveImageDialog';
import {
  deleteStorageImage,
  encodeUnsplashUrl,
  fetchImage,
  isStorageImage,
  triggerUnsplashDownload,
  uploadImage,
} from '@/services/api';

interface CardRowImageProps {
  word: string;
  imageUrl?: string;
  imageQuery: string;
  /**
   * `imageUrl: undefined` clears the picture. Every consumer has to write that
   * through as a clear rather than read it as "this field wasn't touched".
   */
  onChange: (patch: { imageUrl?: string }) => void;
}

export function CardRowImage({ word, imageUrl, imageQuery, onChange }: CardRowImageProps) {
  const t = useTranslations('Deck.reviewCardsDialog.cardRow');
  const { brand } = useTheme().palette;
  const [query, setQuery] = useState(imageQuery || word);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = refreshing || uploading;

  const handleRefresh = useCallback(async () => {
    const term = query.trim() || word;
    if (!term) return;
    setRefreshing(true);
    try {
      const result = await fetchImage(term);
      if (result) {
        triggerUnsplashDownload(result.downloadLocation);
        onChange({ imageUrl: encodeUnsplashUrl(result) });
      }
    } catch {
      // keep existing image if fetch fails
    } finally {
      setRefreshing(false);
    }
  }, [onChange, query, word]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        onChange({ imageUrl: await uploadImage(file) });
      } catch {
        // keep existing image if upload fails
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleRemoveClick = useCallback(() => {
    if (isStorageImage(imageUrl)) setConfirmOpen(true);
    else onChange({ imageUrl: undefined });
  }, [imageUrl, onChange]);

  const handleConfirmRemove = useCallback(async () => {
    setDeleting(true);
    try {
      if (isStorageImage(imageUrl)) await deleteStorageImage(imageUrl!);
      onChange({ imageUrl: undefined });
    } finally {
      setConfirmOpen(false);
      setDeleting(false);
    }
  }, [imageUrl, onChange]);

  const actionButtonSx = {
    width: 30,
    height: 30,
    border: `1.5px solid ${alpha(brand[300], 0.4)}`,
    borderRadius: '8px',
    color: brand[500],
    '&:hover': { bgcolor: alpha(brand[300], 0.1) },
  } as const;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
          bgcolor: alpha(brand[300], 0.08),
          border: `1px solid ${alpha(brand[300], 0.25)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {refreshing && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: alpha(brand[50], 0.8),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CircularProgress size={20} sx={{ color: brand[500] }} />
          </Box>
        )}
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageSearchIcon sx={{ fontSize: 28, color: alpha(brand[300], 0.4) }} />
        )}
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography
          sx={{
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand[500],
          }}
        >
          {t('imageSearchLabel')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <TextField
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchTermPlaceholder')}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.78rem',
                '& fieldset': { borderColor: alpha(brand[300], 0.35) },
                '&:hover fieldset': { borderColor: brand[400] },
                '&.Mui-focused fieldset': { borderColor: brand[500], borderWidth: '1.5px' },
              },
              '& .MuiOutlinedInput-input': { py: '6px', px: '10px' },
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                handleRefresh();
              }
            }}
          />
          <Tooltip title={t('fetchFromUnsplashTooltip')}>
            <IconButton
              size="small"
              aria-label={t('fetchFromUnsplashTooltip')}
              onClick={handleRefresh}
              disabled={busy}
              sx={actionButtonSx}
            >
              {refreshing ? (
                <CircularProgress size={14} sx={{ color: brand[500] }} />
              ) : (
                <AutorenewIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('uploadImageTooltip')}>
            <IconButton
              size="small"
              aria-label={t('uploadImageTooltip')}
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              sx={actionButtonSx}
            >
              {uploading ? (
                <CircularProgress size={14} sx={{ color: brand[500] }} />
              ) : (
                <FileUploadIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />
          {imageUrl && (
            <Tooltip title={t('removeImageTooltip')}>
              <IconButton
                size="small"
                aria-label={t('removeImageTooltip')}
                onClick={handleRemoveClick}
                sx={{
                  ...actionButtonSx,
                  color: alpha(brand[500], 0.5),
                  '&:hover': { bgcolor: alpha(brand[300], 0.1), color: 'error.main' },
                }}
              >
                <HideImageIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <ConfirmRemoveImageDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
      />
    </Box>
  );
}
