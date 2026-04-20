'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { StyledDialog } from '@/components/StyledDialog';
import { useOhanashikais } from '@/hooks/useOhanashikais';

export default function OhanashikaiHome() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const router = useRouter();

  const { ohanashikais, loading, createOhanashikai, deleteOhanashikai, pinOhanashikai } = useOhanashikais();

  const [createOpen, setCreateOpen] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const title = titleVal.trim();
    if (!title) return;
    setCreating(true);
    try {
      const item = await createOhanashikai(title, descVal.trim() || undefined);
      setCreateOpen(false);
      setTitleVal('');
      setDescVal('');
      router.push(`/ohanashikai/${item.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your speeches…" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>

      <PageHeader
        emoji="🎤"
        title="お話し会"
        subtitle="Speech Practice"
        description="Add your speeches, then practice until you know every line by heart! ✨"
        onBack={() => router.push('/')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              borderRadius: 3,
              px: 2.5,
              py: 1,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
              boxShadow: `0 4px 16px ${alpha(brand[400], 0.35)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${brand[500]}, ${accent[500]})`,
              },
            }}
          >
            New Speech
          </Button>
        }
      />

      {/* ── Speech List ── */}
      {ohanashikais.length === 0 ? (
        <Box
          sx={{
            border: `1.5px dashed ${alpha(brand[300], 0.45)}`,
            borderRadius: 4,
            p: 8,
            textAlign: 'center',
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '3.5rem', mb: 2 }}>📝</Typography>
          <Typography variant="h6" sx={{ color: brand[700], fontWeight: 700, mb: 1 }}>
            No speeches yet!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
            Create your first speech to start practicing
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create Speech
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {ohanashikais.map((item, i) => {
            const cardEmojis = ['🌸', '✨', '🌟', '💫', '🎀'];
            const emoji = cardEmojis[i % cardEmojis.length];
            return (
              <Box
                key={item.id}
                onClick={() => router.push(`/ohanashikai/${item.id}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: '#FFFFFF',
                  border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                  boxShadow: `0 2px 12px ${alpha(brand[300], 0.1)}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: `0 6px 24px ${alpha(brand[300], 0.22)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                {/* Emoji badge */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${alpha(brand[100], 0.9)}, ${alpha(accent[100], 0.8)})`,
                    border: `1px solid ${alpha(brand[200], 0.5)}`,
                  }}
                >
                  {emoji}
                </Box>

                {/* Info */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: brand[800], lineHeight: 1.2, fontSize: { xs: '0.95rem', sm: '1.05rem' } }} noWrap>
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.description}
                    </Typography>
                  )}
                  <Chip
                    label={`${item.lineCount} line${item.lineCount !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ mt: 0.5, height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                </Box>

                {/* Actions */}
                <Stack direction="row" spacing={0.5} flexShrink={0} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title={item.pinned ? 'Unpin from home' : 'Pin to home'}>
                    <IconButton
                      size="small"
                      onClick={() => pinOhanashikai(item.id, !item.pinned)}
                      sx={{ color: item.pinned ? brand[500] : alpha(brand[300], 0.6), '&:hover': { color: brand[600], bgcolor: alpha(brand[100], 0.5) } }}
                    >
                      {item.pinned ? <PushPinIcon sx={{ fontSize: '1rem' }} /> : <PushPinOutlinedIcon sx={{ fontSize: '1rem' }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => deleteOhanashikai(item.id)}
                      sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(251,113,133,0.1)' } }}
                    >
                      <DeleteIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Create Dialog ── */}
      <StyledDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="🎤 New Speech"
        subtitle="Give your speech a name to get started"
        closeDisabled={creating}
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setCreateOpen(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !titleVal.trim()}
              sx={{
                bgcolor: brand[700], color: '#fff', textTransform: 'none', borderRadius: 6, px: 2.5,
                '&:hover': { bgcolor: brand[800] },
                '&:disabled': { bgcolor: alpha(brand[700], 0.2), color: alpha('#fff', 0.5) },
              }}
            >
              {creating ? 'Creating…' : 'Create ✨'}
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Speech title"
            placeholder="e.g. Spring Ohanashikai 2026"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description (optional)"
            placeholder="e.g. School speech festival"
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
          />
        </Stack>
      </StyledDialog>
    </Box>
  );
}
