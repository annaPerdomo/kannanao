'use client';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EditNoteRounded from '@mui/icons-material/EditNoteRounded';
import LibraryAddOutlined from '@mui/icons-material/LibraryAddOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTranslations } from 'next-intl';
import { type ComponentType, useState } from 'react';

export type AddWordsSource = 'topic' | 'text' | 'pdf' | 'list' | 'decks' | 'quizlet' | 'type';

const SOURCES: { source: AddWordsSource; Icon: ComponentType<{ fontSize?: 'small' }> }[] = [
  { source: 'topic', Icon: AutoAwesomeRounded },
  { source: 'text', Icon: SchoolOutlined },
  { source: 'pdf', Icon: PictureAsPdfOutlined },
  { source: 'list', Icon: ListAltOutlined },
  { source: 'decks', Icon: LibraryAddOutlined },
  { source: 'quizlet', Icon: DescriptionOutlined },
  { source: 'type', Icon: EditNoteRounded },
];

interface AddWordsMenuProps {
  disabled?: boolean;
  onSelect: (source: AddWordsSource) => void;
}

const BUTTON_ID = 'add-words-menu-button';

export function AddWordsMenu({ disabled, onSelect }: AddWordsMenuProps) {
  const t = useTranslations('Materials.handoutPage');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = anchorEl != null;

  return (
    <>
      <Button
        id={BUTTON_ID}
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${BUTTON_ID}-list` : undefined}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('addWords')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{ list: { 'aria-labelledby': BUTTON_ID, id: `${BUTTON_ID}-list` } }}
      >
        {SOURCES.map(({ source, Icon }) => (
          <MenuItem
            key={source}
            onClick={() => {
              setAnchorEl(null);
              onSelect(source);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t(`addWordsMenu.${source}.label`)}
              secondary={t(`addWordsMenu.${source}.secondary`)}
              slotProps={{ secondary: { sx: { fontSize: '0.72rem' } } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
