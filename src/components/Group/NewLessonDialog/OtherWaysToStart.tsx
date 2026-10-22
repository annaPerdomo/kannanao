'use client';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import ImportExportRounded from '@mui/icons-material/ImportExportRounded';
import SpaRounded from '@mui/icons-material/SpaRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface OtherWaysToStartProps {
  groupId: string;
  disabled: boolean;
  canHandOutDeck: boolean;
  onHandOutDeck?: () => void;
  onClose: () => void;
}

interface WayRowProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  disabled?: boolean;
  onClick: () => void;
}

function WayRow({ icon, title, body, disabled, onClick }: WayRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        width: '100%',
        px: 1.25,
        py: 1,
        textAlign: 'left',
        borderRadius: theme.radii.md,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        bgcolor: 'background.paper',
        '&:hover': { bgcolor: alpha(brand[50], 0.7), borderColor: brand[400] },
        '&.Mui-disabled': { opacity: 0.5 },
      }}
    >
      <Box sx={{ display: 'flex', color: brand[600], flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>
          {body}
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
    </ButtonBase>
  );
}

export function OtherWaysToStart({
  groupId,
  disabled,
  canHandOutDeck,
  onHandOutDeck,
  onClose,
}: OtherWaysToStartProps) {
  const t = useTranslations('Group.newLesson.otherWays');
  const router = useRouter();

  const go = (path: string) => {
    onClose();
    router.push(`/group/${groupId}/add/${path}`);
  };

  return (
    <Stack spacing={1.25}>
      <Divider sx={{ borderWidth: 0 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
          {t('heading')}
        </Typography>
      </Divider>
      <WayRow
        icon={<AutoAwesomeRounded sx={{ fontSize: 20 }} />}
        title={t('planAiTitle')}
        body={t('planAiBody')}
        disabled={disabled}
        onClick={() => go('lesson')}
      />
      <WayRow
        icon={<ImportExportRounded sx={{ fontSize: 20 }} />}
        title={t('quizletTitle')}
        body={t('quizletBody')}
        disabled={disabled}
        onClick={() => go('quizlet')}
      />
      <WayRow
        icon={<SpaRounded sx={{ fontSize: 20 }} />}
        title={t('kanaTitle')}
        body={t('kanaBody')}
        disabled={disabled}
        onClick={() => go('kana')}
      />
      {onHandOutDeck && (
        <WayRow
          icon={<GroupsRounded sx={{ fontSize: 20 }} />}
          title={t('deckTitle')}
          body={canHandOutDeck ? t('deckBody') : t('deckNeedsLearners')}
          disabled={disabled || !canHandOutDeck}
          onClick={() => {
            onClose();
            onHandOutDeck();
          }}
        />
      )}
    </Stack>
  );
}
