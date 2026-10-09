'use client';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type ReactNode, useId, useState } from 'react';

interface UnitCardHeaderProps {
  title: string;
  level: string | null;
  /** Rendered under the title — the week-progress summary plus any draft count. */
  subtitle?: ReactNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRenameUnit: (title: string | null) => void;
  onCopyUnit: () => void;
  onPrintUnit: () => void;
}

export function UnitCardHeader({
  title,
  level,
  subtitle,
  expanded,
  onToggleExpanded,
  onRenameUnit,
  onCopyUnit,
  onPrintUnit,
}: UnitCardHeaderProps) {
  const t = useTranslations('Materials.library');
  const theme = useTheme();
  const { brand } = theme.palette;
  const menuButtonId = useId();
  const menuId = useId();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  const startRename = () => {
    setDraftTitle(title);
    setRenaming(true);
  };

  const commitRename = () => {
    setRenaming(false);
    const next = draftTitle.trim();
    onRenameUnit(next || null);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setRenaming(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <TextField
            autoFocus
            size="small"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            slotProps={{ htmlInput: { maxLength: 80 } }}
            sx={{ maxWidth: 260 }}
          />
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              component="h3"
              sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'text.primary' }}
              noWrap
            >
              {title}
            </Typography>
            {level && (
              <Chip
                size="small"
                label={level}
                sx={{ fontWeight: 700, bgcolor: alpha(brand[300], 0.25), color: brand[800] }}
              />
            )}
          </Stack>
        )}
        {subtitle}
      </Box>
      <IconButton
        id={menuButtonId}
        aria-label={t('unitMenu', { title })}
        aria-haspopup="menu"
        aria-controls={menuAnchor ? menuId : undefined}
        aria-expanded={Boolean(menuAnchor)}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ list: { 'aria-labelledby': menuButtonId } }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            startRename();
          }}
        >
          {t('rename')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onCopyUnit();
          }}
        >
          {t('copyUnit')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onPrintUnit();
          }}
        >
          {t('printPlan')}
        </MenuItem>
      </Menu>
      <IconButton
        aria-label={expanded ? t('hideWeeks') : t('showWeeks')}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
        sx={{
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s ease',
        }}
      >
        <ExpandMoreIcon />
      </IconButton>
    </Box>
  );
}
