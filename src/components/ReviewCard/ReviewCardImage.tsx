'use client';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HideImageIcon from '@mui/icons-material/HideImage';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { Alert, Box, CircularProgress, IconButton, TextField, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { ConfirmRemoveImageDialog } from '@/components/ConfirmRemoveImageDialog';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import {
  deleteStorageImage,
  encodeUnsplashUrl,
  fetchImage,
  isStorageImage,
  triggerUnsplashDownload,
  uploadImage,
} from '@/services/api';

import { IMAGE_PREVIEW_MAX_WIDTH, IMAGE_PREVIEW_MIN_WIDTH } from './constants';

export interface ReviewCardImagePatch {
  imageQuery?: string;
  imageUrl?: string | null;
}

interface ReviewCardImageProps {
  imageQuery: string;
  imageUrl: string | null;
  /** Search fallback when `imageQuery` is blank — mirrors `imageQueryFor` in useDeckImages.ts. */
  meaning?: string;
  onChange: (patch: ReviewCardImagePatch) => void;
  disabled?: boolean;
  allowUpload?: boolean;
  allowRemove?: boolean;
}

export function ReviewCardImage({
  imageQuery,
  imageUrl,
  meaning,
  onChange,
  disabled,
  allowUpload = true,
  allowRemove = true,
}: ReviewCardImageProps) {
  const t = useTranslations('ReviewCard');
  const { brand } = useTheme().palette;
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = refreshing || uploading || disabled;

  const handleRefresh = useCallback(async () => {
    const term = imageQuery.trim() || meaning?.trim() || '';
    if (!term) return;
    setRefreshing(true);
    setImageFailed(false);
    try {
      const result = await fetchImage(term);
      if (result) {
        triggerUnsplashDownload(result.downloadLocation);
        onChange({ imageUrl: encodeUnsplashUrl(result) });
      } else {
        setImageFailed(true);
      }
    } catch {
      setImageFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [imageQuery, meaning, onChange]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setImageFailed(false);
      try {
        onChange({ imageUrl: await uploadImage(file) });
      } catch {
        setImageFailed(true);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleRemoveClick = useCallback(() => {
    if (isStorageImage(imageUrl ?? undefined)) setConfirmOpen(true);
    else onChange({ imageUrl: null });
  }, [imageUrl, onChange]);

  const handleConfirmRemove = useCallback(async () => {
    setDeleting(true);
    try {
      if (isStorageImage(imageUrl ?? undefined)) await deleteStorageImage(imageUrl!);
      onChange({ imageUrl: null });
    } finally {
      setConfirmOpen(false);
      setDeleting(false);
    }
  }, [imageUrl, onChange]);

  const actionButtonSx = {
    width: 34,
    height: 34,
    border: `1.5px solid ${alpha(brand[300], 0.4)}`,
    borderRadius: '8px',
    color: brand[500],
    '&:hover': { bgcolor: alpha(brand[300], 0.1) },
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        width: '100%',
        maxWidth: IMAGE_PREVIEW_MAX_WIDTH,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: IMAGE_PREVIEW_MAX_WIDTH,
          minWidth: IMAGE_PREVIEW_MIN_WIDTH,
          aspectRatio: '1 / 1',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: alpha(brand[300], 0.08),
          border: `1px solid ${alpha(brand[300], 0.25)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            <CircularProgress size={24} sx={{ color: brand[500] }} />
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
          <ImageSearchIcon sx={{ fontSize: 36, color: alpha(brand[300], 0.4) }} />
        )}
        {imageUrl && (
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <UnsplashAttribution url={imageUrl} variant="overlay" />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
        <TextField
          size="small"
          value={imageQuery}
          onChange={(e) => onChange({ imageQuery: e.target.value })}
          placeholder={t('imageSearch')}
          disabled={disabled}
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              handleRefresh();
            }
          }}
        />
        <Tooltip title={t('searchImage')}>
          <IconButton
            size="small"
            aria-label={t('searchImage')}
            onClick={handleRefresh}
            disabled={busy}
            sx={actionButtonSx}
          >
            {refreshing ? (
              <CircularProgress size={16} sx={{ color: brand[500] }} />
            ) : (
              <AutorenewIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
        {allowUpload && (
          <>
            <Tooltip title={t('uploadImage')}>
              <IconButton
                size="small"
                aria-label={t('uploadImage')}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                sx={actionButtonSx}
              >
                {uploading ? (
                  <CircularProgress size={16} sx={{ color: brand[500] }} />
                ) : (
                  <FileUploadIcon sx={{ fontSize: 18 }} />
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
          </>
        )}
        {allowRemove && imageUrl && (
          <Tooltip title={t('removeImage')}>
            <IconButton
              size="small"
              aria-label={t('removeImage')}
              onClick={handleRemoveClick}
              disabled={disabled}
              sx={{
                ...actionButtonSx,
                color: alpha(brand[500], 0.5),
                '&:hover': { bgcolor: alpha(brand[300], 0.1), color: 'error.main' },
              }}
            >
              <HideImageIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {imageFailed && <Alert severity="error">{t('imageFailed')}</Alert>}

      <ConfirmRemoveImageDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
      />
    </Box>
  );
}
