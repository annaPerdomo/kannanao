'use client';
import CodeIcon from '@mui/icons-material/Code';
import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { StyledDialog } from '@/components/StyledDialog';

import { ShareEmbedSection } from './ShareEmbedSection';

export { ShareEmbedSection } from './ShareEmbedSection';

interface ShareEmbedDialogProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
}

/**
 * Share-only dialog for the deck list and the dashboard, where there is no deck
 * page to hang settings off. The deck page shows the same section inside
 * DeckSettingsDialog instead.
 */
export function ShareEmbedDialog({
  open,
  onClose,
  deckId,
  deckName,
  isPublic,
  onPublicChange,
}: ShareEmbedDialogProps) {
  const t = useTranslations('Deck.shareEmbedDialog');
  const tCommon = useTranslations('Common');
  const { brand } = useTheme().palette;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={deckName}
      icon={<CodeIcon sx={{ color: brand[600], fontSize: 20 }} />}
      maxWidth="sm"
      actions={
        <Button
          onClick={onClose}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}
        >
          {tCommon('done')}
        </Button>
      }
    >
      <ShareEmbedSection
        deckId={deckId}
        deckName={deckName}
        isPublic={isPublic}
        onPublicChange={onPublicChange}
      />
    </StyledDialog>
  );
}
