'use client';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CloseIcon from '@mui/icons-material/Close';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { ConfirmRemoveImageDialog } from '@/components/ConfirmRemoveImageDialog';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteStorageImage,
  encodeUnsplashUrl,
  fetchImage,
  isStorageImage,
  triggerUnsplashDownload,
  uploadImage,
} from '@/services/api';

import { sharedTextFieldSx } from './constants';

interface ImageSectionProps {
  imageUrl: string | undefined;
  word: string;
  initialQuery: string;
  onImageChange: (url: string | undefined) => void;
  onQueryChange?: (query: string) => void;
}

export function ImageSection({
  imageUrl,
  word,
  initialQuery,
  onImageChange,
  onQueryChange,
}: ImageSectionProps) {
  const t = useTranslations('Deck.editCardDialog.imageSection');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { isMemberAccount } = useAuth();
  const [imageQuery, setImageQuery] = useState(initialQuery);
  const [savingImage, setSavingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imageUrl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = savingImage || uploading;

  const handleRegenerateImage = async () => {
    const query = imageQuery.trim() || word;
    if (!query) return;
    setImageError('');
    setSavingImage(true);
    try {
      const result = await fetchImage(query);
      if (result) {
        triggerUnsplashDownload(result.downloadLocation);
        const encodedUrl = encodeUnsplashUrl(result);
        setPreviewUrl(encodedUrl);
        onImageChange(encodedUrl);
      } else {
        setImageError(t('noImageFoundError'));
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : t('fetchImageError'));
    } finally {
      setSavingImage(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setImageError('');
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setPreviewUrl(url);
      onImageChange(url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : t('uploadImageError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveClick = () => {
    if (isStorageImage(previewUrl)) {
      setConfirmOpen(true);
    } else {
      setPreviewUrl(undefined);
      onImageChange(undefined);
      setImageError('');
    }
  };

  const handleConfirmRemove = async () => {
    setDeleting(true);
    try {
      if (isStorageImage(previewUrl)) {
        await deleteStorageImage(previewUrl!);
      }
      setPreviewUrl(undefined);
      onImageChange(undefined);
      setImageError('');
      setConfirmOpen(false);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : t('deleteImageError'));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const tfSx = sharedTextFieldSx(theme);

  const btnSx = {
    borderRadius: '10px',
    height: 40,
    minWidth: 'auto',
    px: 1.5,
    flexShrink: 0,
    fontSize: '0.72rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    textTransform: 'none',
    borderColor: alpha(brand[300], 0.5),
    color: brand[700],
    '&:hover': { borderColor: brand[400], bgcolor: brand[50] },
  };

  return (
    <Box>
      <Typography
        sx={{
          fontSize: '0.6rem',
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: brand[500],
          mb: 1.25,
        }}
      >
        {t('cardImageLabel')}
      </Typography>

      {previewUrl && (
        <Box
          sx={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1.5px solid ${alpha(brand[300], 0.35)}`,
            mb: 1.5,
            height: 140,
            bgcolor: alpha(brand[50], 0.8),
          }}
        >
          <Box
            component="img"
            src={previewUrl}
            alt={t('altCardImagePreview')}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <UnsplashAttribution url={previewUrl} />
          <Tooltip title={t('removeImageTooltip')}>
            <IconButton
              size="small"
              onClick={handleRemoveClick}
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 26,
                height: 26,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {isMemberAccount ? (
        !previewUrl && (
          <Typography
            sx={{ fontSize: '0.75rem', color: alpha(brand[700], 0.6), fontStyle: 'italic' }}
          >
            {t('membersManagedMessage')}
          </Typography>
        )
      ) : (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            label={t('imageSearchQueryLabel')}
            value={imageQuery}
            onChange={(e) => {
              setImageQuery(e.target.value);
              setImageError('');
              onQueryChange?.(e.target.value);
            }}
            placeholder={t('imageSearchPlaceholder')}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={imageError}
            error={!!imageError}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRegenerateImage();
              }
            }}
            sx={{
              ...tfSx,
              '& .MuiFormHelperText-root': {
                ...tfSx['& .MuiFormHelperText-root'],
                color: imageError ? 'error.main' : alpha(brand[700], 0.6),
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title={previewUrl ? t('regenerateTooltip') : t('searchTooltip')}>
              <span>
                <Button
                  variant="outlined"
                  onClick={handleRegenerateImage}
                  disabled={busy}
                  startIcon={
                    savingImage ? (
                      <CircularProgress size={13} sx={{ color: brand[500] }} />
                    ) : previewUrl ? (
                      <AutorenewIcon sx={{ fontSize: 15 }} />
                    ) : (
                      <ImageSearchIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  sx={btnSx}
                >
                  {savingImage ? t('searching') : previewUrl ? t('regen') : t('fetch')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={t('uploadOwnImageTooltip')}>
              <span>
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  startIcon={
                    uploading ? (
                      <CircularProgress size={13} sx={{ color: brand[500] }} />
                    ) : (
                      <FileUploadIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  sx={btnSx}
                >
                  {uploading ? t('uploading') : t('upload')}
                </Button>
              </span>
            </Tooltip>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadImage(file);
              e.target.value = '';
            }}
          />
        </Box>
      )}

      <ConfirmRemoveImageDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
      />
    </Box>
  );
}
