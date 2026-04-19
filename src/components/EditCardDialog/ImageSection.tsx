'use client';
import { useState } from 'react';
import { Box, Typography, TextField, Button, Tooltip, CircularProgress } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { fetchImage } from '@/services/api';
import { sharedTextFieldSx } from './constants';

interface ImageSectionProps {
  imageUrl: string | undefined;
  word: string;
  initialQuery: string;
  onImageChange: (url: string | undefined) => void;
}

export function ImageSection({ imageUrl, word, initialQuery, onImageChange }: ImageSectionProps) {
  const [imageQuery, setImageQuery] = useState(initialQuery);
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imageUrl);

  const handleRegenerateImage = async () => {
    const query = imageQuery.trim() || word;
    if (!query) return;
    setImageError('');
    setSavingImage(true);
    try {
      const url = await fetchImage(query);
      if (url) {
        setPreviewUrl(url);
        onImageChange(url);
      } else {
        setImageError('No image found for that query. Try a different search term.');
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to fetch image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#EC4899', fontFamily: '"Nunito", sans-serif', mb: 1.25 }}>
        Card Image
      </Typography>

      {previewUrl && (
        <Box sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(249,168,212,0.35)', mb: 1.5, height: 140, bgcolor: '#FFF0F8' }}>
          <Box component="img" src={previewUrl} alt="Card image preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Image Search Query"
          value={imageQuery}
          onChange={(e) => { setImageQuery(e.target.value); setImageError(''); }}
          placeholder={`e.g. ${word || 'sakura'}`}
          size="small" fullWidth
          helperText={imageError || 'Search term used to find the image'}
          error={!!imageError}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegenerateImage(); } }}
          sx={{
            ...sharedTextFieldSx,
            '& .MuiFormHelperText-root': {
              ...sharedTextFieldSx['& .MuiFormHelperText-root'],
              color: imageError ? 'error.main' : '#C2709A',
            },
          }}
        />
        <Tooltip title={previewUrl ? 'Regenerate image' : 'Fetch image'}>
          <span>
            <Button
              variant="outlined" onClick={handleRegenerateImage} disabled={savingImage}
              startIcon={
                savingImage ? <CircularProgress size={13} sx={{ color: '#EC4899' }} />
                : previewUrl ? <AutorenewIcon sx={{ fontSize: 15 }} />
                : <ImageSearchIcon sx={{ fontSize: 15 }} />
              }
              sx={{
                borderRadius: '10px', height: 40, minWidth: 'auto', px: 1.5, flexShrink: 0,
                fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'none',
                borderColor: 'rgba(249,168,212,0.5)', color: '#BE185D',
                '&:hover': { borderColor: '#F472B6', bgcolor: '#FFF0F8' },
              }}
            >
              {savingImage ? 'Searching…' : previewUrl ? 'Regen' : 'Fetch'}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
