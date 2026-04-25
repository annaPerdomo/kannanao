'use client';
import { useState, useRef } from 'react';
import { Box, Typography, TextField, Button, Tooltip, CircularProgress, IconButton } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloseIcon from '@mui/icons-material/Close';
import { fetchImage, uploadImage, deleteStorageImage, isStorageImage, triggerUnsplashDownload, encodeUnsplashUrl } from '@/services/api';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { ConfirmRemoveImageDialog } from '@/components/ConfirmRemoveImageDialog';
import { sharedTextFieldSx } from './constants';

interface ImageSectionProps {
  imageUrl: string | undefined;
  word: string;
  initialQuery: string;
  onImageChange: (url: string | undefined) => void;
  onQueryChange?: (query: string) => void;
}

export function ImageSection({ imageUrl, word, initialQuery, onImageChange, onQueryChange }: ImageSectionProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
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
        setImageError('No image found for that query. Try a different search term.');
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to fetch image. Please try again.');
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
      setImageError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.');
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
      setImageError(err instanceof Error ? err.message : 'Failed to delete image.');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const tfSx = sharedTextFieldSx(theme);

  const btnSx = {
    borderRadius: '10px', height: 40, minWidth: 'auto', px: 1.5, flexShrink: 0,
    fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'none',
    borderColor: alpha(brand[300], 0.5), color: brand[700],
    '&:hover': { borderColor: brand[400], bgcolor: brand[50] },
  };

  return (
    <Box>
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand[500], mb: 1.25 }}>
        Card Image
      </Typography>

      {previewUrl && (
        <Box sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${alpha(brand[300], 0.35)}`, mb: 1.5, height: 140, bgcolor: alpha(brand[50], 0.8) }}>
          <Box component="img" src={previewUrl} alt="Card image preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <UnsplashAttribution url={previewUrl} />
          <Tooltip title="Remove image">
            <IconButton
              size="small" onClick={handleRemoveClick}
              sx={{
                position: 'absolute', top: 6, right: 6,
                width: 26, height: 26,
                bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Image Search Query"
          value={imageQuery}
          onChange={(e) => { setImageQuery(e.target.value); setImageError(''); onQueryChange?.(e.target.value); }}
          placeholder="Phrase that describes this definition"
          size="small" fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          helperText={imageError}
          error={!!imageError}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegenerateImage(); } }}
          sx={{
            ...tfSx,
            '& .MuiFormHelperText-root': {
              ...tfSx['& .MuiFormHelperText-root'],
              color: imageError ? 'error.main' : alpha(brand[700], 0.6),
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Tooltip title={previewUrl ? 'Regenerate from Unsplash' : 'Search Unsplash'}>
            <span>
              <Button
                variant="outlined" onClick={handleRegenerateImage} disabled={busy}
                startIcon={
                  savingImage ? <CircularProgress size={13} sx={{ color: brand[500] }} />
                  : previewUrl ? <AutorenewIcon sx={{ fontSize: 15 }} />
                  : <ImageSearchIcon sx={{ fontSize: 15 }} />
                }
                sx={btnSx}
              >
                {savingImage ? 'Searching...' : previewUrl ? 'Regen' : 'Fetch'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Upload your own image">
            <span>
              <Button
                variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={busy}
                startIcon={
                  uploading ? <CircularProgress size={13} sx={{ color: brand[500] }} />
                  : <FileUploadIcon sx={{ fontSize: 15 }} />
                }
                sx={btnSx}
              >
                {uploading ? 'Uploading...' : 'Upload'}
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

      <ConfirmRemoveImageDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRemove}
        deleting={deleting}
      />
    </Box>
  );
}
