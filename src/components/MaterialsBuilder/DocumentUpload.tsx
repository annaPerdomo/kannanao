'use client';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { uploadLessonDocument } from '@/services/api';
import type { LessonDocument } from '@/types/lessonPlan';

import {
  DOCUMENT_ACCEPT_ATTR,
  DOCUMENT_ACCEPTED_TYPES,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_TOTAL_BYTES,
} from './constants';

interface DocumentUploadProps {
  documents: LessonDocument[];
  onChange: (next: LessonDocument[]) => void;
}

export function DocumentUpload({ documents, onChange }: DocumentUploadProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const attachedBytes = documents.reduce((sum, d) => sum + d.bytes, 0);

  const handleFiles = async (files: FileList) => {
    if (uploading) return;
    setError(null);
    const picked = Array.from(files);
    let runningBytes = attachedBytes;

    for (const file of picked) {
      if (
        !DOCUMENT_ACCEPTED_TYPES.includes(file.type as (typeof DOCUMENT_ACCEPTED_TYPES)[number])
      ) {
        setError(t('documentTypeError'));
        return;
      }
      if (file.size > DOCUMENT_MAX_BYTES) {
        setError(t('documentSizeError'));
        return;
      }
      if (runningBytes + file.size > DOCUMENT_MAX_TOTAL_BYTES) {
        setError(t('documentTotalSizeError'));
        return;
      }
      runningBytes += file.size;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        picked.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          path: await uploadLessonDocument(file),
          bytes: file.size,
        })),
      );
      onChange([...documents, ...uploaded]);
    } catch {
      setError(t('documentUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleFiles(files);
          e.target.value = '';
        }}
      />
      <Box
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading}
        aria-label={documents.length > 0 ? t('addMoreDocumentsButton') : t('attachDocumentButton')}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        sx={{
          border: `2px dashed ${alpha(brand[400], dragOver ? 0.9 : 0.5)}`,
          borderRadius: theme.radii.md,
          bgcolor: alpha(brand[50], dragOver ? 0.9 : 0.5),
          p: { xs: 2, sm: 2.5 },
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          opacity: uploading ? 0.7 : 1,
          transition: 'border-color 120ms, background-color 120ms',
          '&:hover': { borderColor: alpha(brand[400], uploading ? 0.5 : 0.9) },
        }}
      >
        <UploadFileIcon sx={{ color: brand[600], fontSize: 28 }} />
        <Typography sx={{ fontWeight: 700, color: brand[700], fontSize: '0.9rem' }}>
          {uploading
            ? t('documentUploading')
            : documents.length > 0
              ? t('addMoreDocumentsButton')
              : t('attachDocumentButton')}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
          {t('attachDocumentHint')}
        </Typography>
      </Box>
      {documents.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
          {documents.map((doc, i) => (
            <Chip
              key={`${doc.name}-${i}`}
              icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
              label={doc.name}
              onDelete={() => handleRemove(i)}
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Stack>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: '0.74rem' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
