'use client';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';
import { PageHeader } from '@/components/PageHeader';
import type { Group } from '@/hooks/useGroups';

import { QuickActionCard } from './QuickActionCard';

interface GroupDashboardHeaderProps {
  group: Group | undefined;
  memberCount: number;
  onBack: () => void;
  onRename: (name: string) => Promise<void>;
  onEmojiChange: (emoji: string) => void;
  onInvite: () => void;
  onOpenMaterials: () => void;
  /** Codes still open — shown on the invite card so the dashboard needn't list them. */
  activeInviteCount?: number;
}

export function GroupDashboardHeader({
  group,
  memberCount,
  onBack,
  onRename,
  onEmojiChange,
  onInvite,
  onOpenMaterials,
  activeInviteCount = 0,
}: GroupDashboardHeaderProps) {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;

  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setNameVal(group?.name ?? '');
    setEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [group]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const commitEdit = useCallback(async () => {
    const trimmedName = nameVal.trim();
    if (!trimmedName || trimmedName === group?.name) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      await onRename(trimmedName);
    } finally {
      setRenaming(false);
      setEditing(false);
    }
  }, [nameVal, group, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') void commitEdit();
      if (e.key === 'Escape') cancelEdit();
    },
    [commitEdit, cancelEdit],
  );

  if (editing) {
    return (
      <PageHeader onBack={onBack} title="" compact mb={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <TextField
            inputRef={nameInputRef}
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            autoComplete="off"
            disabled={renaming}
            placeholder={t('groupNamePlaceholder')}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: theme.radii.sm,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: brand[800],
                bgcolor: alpha('#FFFFFF', 0.6),
                '& fieldset': { borderColor: alpha(brand[400], 0.5) },
                '&:hover fieldset': { borderColor: brand[400] },
                '&.Mui-focused fieldset': { borderColor: brand[500] },
              },
            }}
          />
          {renaming ? (
            <CircularProgress size={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
          ) : (
            <>
              <Tooltip title={t('saveTooltip')}>
                <IconButton
                  size="small"
                  aria-label={tc('save')}
                  onClick={commitEdit}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: theme.radii.sm,
                    bgcolor: alpha('#FFFFFF', 0.6),
                    border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                    color: brand[700],
                    '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[400] },
                  }}
                >
                  <CheckIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('cancelTooltip')}>
                <IconButton
                  size="small"
                  aria-label={tc('cancel')}
                  onClick={cancelEdit}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: theme.radii.sm,
                    color: 'text.secondary',
                    border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                    bgcolor: alpha('#FFFFFF', 0.4),
                    '&:hover': { bgcolor: alpha('#FFFFFF', 0.7) },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader
        onBack={onBack}
        compact
        mb={3}
        title={
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Tooltip title={group?.emoji ? t('changeEmoji') : t('addEmoji')}>
              <ButtonBase
                aria-label={group?.emoji ? t('changeGroupEmoji') : t('addGroupEmoji')}
                onClick={(e) => setEmojiAnchor(e.currentTarget)}
                sx={{
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                  lineHeight: 1,
                  borderRadius: theme.radii.sm,
                  p: 0.5,
                  flexShrink: 0,
                  transition: 'transform 0.15s',
                  '&:hover': { transform: 'scale(1.15)', bgcolor: alpha('#FFFFFF', 0.5) },
                }}
              >
                {group?.emoji || '👥'}
              </ButtonBase>
            </Tooltip>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: brand[800],
                    lineHeight: 1.1,
                    minWidth: 0,
                    fontSize: { xs: '1.6rem', sm: '2.125rem' },
                  }}
                >
                  {group?.name ?? t('defaultTitle')}
                </Typography>
                <Tooltip title={t('renameGroup')}>
                  <IconButton
                    size="small"
                    aria-label={t('renameGroup')}
                    onClick={startEdit}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: theme.radii.sm,
                      flexShrink: 0,
                      color: alpha(brand[700], 0.45),
                      '&:hover': { bgcolor: alpha('#FFFFFF', 0.5), color: brand[700] },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {t('memberCountInGroup', { count: memberCount })}
              </Typography>
            </Box>
          </Box>
        }
        action={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Typography
              variant="overline"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: '0.06em',
                mr: 0.5,
              }}
            >
              {t('quickActionsLabel')}
            </Typography>
            <QuickActionCard
              icon={<PersonAddAlt1Icon sx={{ fontSize: 18 }} />}
              title={t('inviteLearnersTitle')}
              subtitle={t('inviteLearnersSubtitle')}
              onClick={onInvite}
              badge={activeInviteCount}
            />
            <QuickActionCard
              icon={<AutoStoriesIcon sx={{ fontSize: 18 }} />}
              title={t('materialsBuilderTitle')}
              subtitle={t('materialsBuilderSubtitle')}
              onClick={onOpenMaterials}
            />
          </Stack>
        }
      />

      <EmojiPickerPopover
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        onSelect={onEmojiChange}
        onRemove={group?.emoji ? () => onEmojiChange('') : undefined}
      />
    </>
  );
}
