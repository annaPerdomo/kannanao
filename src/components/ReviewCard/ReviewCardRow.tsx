'use client';

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { UnsplashAttribution } from '@/components/UnsplashAttribution';

import { ReviewCardFields } from './ReviewCardFields';
import { ReviewCardImage } from './ReviewCardImage';
import { rowContainerSx, summaryRowSx, thumbnailSx } from './styles';

export interface ReviewCardValue {
  word: string;
  reading: string;
  meaning: string;
  exampleJp: string;
  exampleEn: string;
  imageQuery: string;
  imageUrl: string | null;
  jlptLevel: string | null;
}

export interface ReviewCardRowProps {
  value: ReviewCardValue;
  onChange: (patch: Partial<ReviewCardValue>) => void;
  disabled?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  leading?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
  extras?: ReactNode;
  allowUpload?: boolean;
  allowRemoveImage?: boolean;
  labels?: { word?: string };
}

export function ReviewCardRow({
  value,
  onChange,
  disabled,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  leading,
  chips,
  actions,
  extras,
  allowUpload = true,
  allowRemoveImage = true,
  labels,
}: ReviewCardRowProps) {
  const t = useTranslations('ReviewCard');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? internalExpanded;

  const toggleExpanded = useCallback(() => {
    const next = !expanded;
    if (expandedProp === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  }, [expanded, expandedProp, onExpandedChange]);

  const handleImageChange = useCallback(
    (patch: { imageQuery?: string; imageUrl?: string | null }) => onChange(patch),
    [onChange],
  );

  return (
    <Box sx={rowContainerSx(theme)}>
      <Box
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        sx={summaryRowSx}
      >
        {leading && (
          <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
            {leading}
          </Box>
        )}

        <Box sx={thumbnailSx(theme)}>
          {value.imageUrl ? (
            <Box
              component="img"
              src={value.imageUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageRoundedIcon
              aria-label={t('noImage')}
              sx={{ color: 'action.disabledBackground', fontSize: 28 }}
            />
          )}
        </Box>

        <Box sx={{ minWidth: 0, flexShrink: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {value.word}
          </Typography>
          {value.reading && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {value.reading}
            </Typography>
          )}
          {value.imageUrl && (
            <Box role="presentation" onClick={(e) => e.stopPropagation()}>
              <UnsplashAttribution url={value.imageUrl} variant="caption" />
            </Box>
          )}
        </Box>

        {chips && (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
            {chips}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {value.meaning}
        </Typography>

        {actions && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}
          >
            {actions}
          </Box>
        )}

        <IconButton
          size="small"
          aria-label={expanded ? t('collapse') : t('expand')}
          aria-expanded={expanded}
          sx={{ flexShrink: 0, color: alpha(brand[700], 0.6) }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            pt: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <ReviewCardImage
              imageQuery={value.imageQuery}
              imageUrl={value.imageUrl}
              meaning={value.meaning}
              onChange={handleImageChange}
              disabled={disabled}
              allowUpload={allowUpload}
              allowRemove={allowRemoveImage}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ReviewCardFields
              value={value}
              onChange={onChange}
              disabled={disabled}
              labels={labels}
            />
          </Box>
        </Box>
        {extras && <Box sx={{ px: 1.5, pb: 1.5 }}>{extras}</Box>}
      </Collapse>
    </Box>
  );
}
