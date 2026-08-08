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

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function base64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

export function DocumentUpload({ documents, onChange }: DocumentUploadProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const attachedBytes = documents.reduce((sum, d) => sum + base64Bytes(d.base64), 0);

  const handleFiles = async (files: FileList) => {
    setError(null);
    const accepted: LessonDocument[] = [];
    let runningBytes = attachedBytes;

    for (const file of Array.from(files)) {
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
      accepted.push({ name: file.name, mimeType: file.type, base64: '' });
    }

    setReading(true);
    try {
      const withContent = await Promise.all(
        Array.from(files).map(async (file, i) => ({
          ...accepted[i],
          base64: await toBase64(file),
        })),
      );
      onChange([...documents, ...withContent]);
    } catch {
      setError(t('documentReadError'));
    } finally {
      setReading(false);
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
        tabIndex={0}
        aria-label={documents.length > 0 ? t('addMoreDocumentsButton') : t('attachDocumentButton')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        sx={{
          border: `2px dashed ${alpha(brand[400], dragOver ? 0.9 : 0.5)}`,
          borderRadius: theme.radii.md,
          bgcolor: alpha(brand[50], dragOver ? 0.9 : 0.5),
          p: { xs: 2, sm: 2.5 },
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 120ms, background-color 120ms',
          '&:hover': { borderColor: alpha(brand[400], 0.9) },
        }}
      >
        <UploadFileIcon sx={{ color: brand[600], fontSize: 28 }} />
        <Typography sx={{ fontWeight: 700, color: brand[700], fontSize: '0.9rem' }}>
          {reading
            ? t('documentReading')
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
