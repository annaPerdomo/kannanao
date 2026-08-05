'use client';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import type { LessonDocument } from '@/types/lessonPlan';

import { DOCUMENT_ACCEPT_ATTR, DOCUMENT_ACCEPTED_TYPES, DOCUMENT_MAX_BYTES } from './constants';

interface DocumentUploadProps {
  document: LessonDocument | null;
  onChange: (next: LessonDocument | null) => void;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function DocumentUpload({ document: attachedDocument, onChange }: DocumentUploadProps) {
  const t = useTranslations('Group.lessonBuilder');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!DOCUMENT_ACCEPTED_TYPES.includes(file.type as (typeof DOCUMENT_ACCEPTED_TYPES)[number])) {
      setError(t('documentTypeError'));
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setError(t('documentSizeError'));
      return;
    }
    setReading(true);
    try {
      const base64 = await toBase64(file);
      onChange({ name: file.name, mimeType: file.type, base64 });
    } catch {
      setError(t('documentReadError'));
    } finally {
      setReading(false);
    }
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {attachedDocument ? (
        <Chip
          icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
          label={attachedDocument.name}
          onDelete={() => onChange(null)}
          sx={{ maxWidth: '100%' }}
        />
      ) : (
        <Button
          size="small"
          startIcon={<AttachFileIcon sx={{ fontSize: 16 }} />}
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {reading ? t('documentReading') : t('attachDocumentButton')}
        </Button>
      )}
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>
        {t('attachDocumentHint')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: '0.74rem' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
