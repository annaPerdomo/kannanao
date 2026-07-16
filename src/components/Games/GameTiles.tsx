'use client';

import { alpha, Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface GameCardProps {
  title: string;
  jpTitle: string;
  description: string;
  emoji: string;
  gradient: string;
  href: string;
}

/** Static config for the game tiles — user-visible strings resolved via i18n keys. */
interface GameConfig {
  key: string;
  jpTitle: string;
  emoji: string;
  gradient: string;
  href: string;
}

function GameCard({ title, jpTitle, description, emoji, gradient, href }: GameCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { brand } = theme.palette;

  const handleClick = () => router.push(href);

  return (
    <Box
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${description}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      sx={{
        cursor: 'pointer',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(brand[300], 0.2)}`,
        boxShadow: `0 1px 3px ${alpha(brand[400], 0.08)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(brand[400], 0.15)}`,
          borderColor: alpha(brand[400], 0.35),
          '& .game-icon': { transform: 'scale(1.08)' },
        },
        '&:active': { transform: 'translateY(0)' },
      }}
    >
      <Box
        className="game-icon"
        aria-hidden
        sx={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: gradient,
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          boxShadow: `0 2px 8px ${alpha(brand[500], 0.2)}`,
          fontSize: 24,
        }}
      >
        {emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {jpTitle}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.78rem', mt: 0.25 }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

const GAMES: GameConfig[] = [
  {
    key: 'wordMatch',
    jpTitle: 'ことばマッチ',
    emoji: '🍉',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    href: '/review/match',
  },
  {
    key: 'kanaBuilder',
    jpTitle: 'かなビルダー',
    emoji: '🧩',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    href: '/review/kana',
  },
  {
    key: 'questionQuest',
    jpTitle: 'しつもんクエスト',
    emoji: '❓',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    href: '/review/questions',
  },
  {
    key: 'particlePicker',
    jpTitle: 'じょしピッカー',
    emoji: '🎏',
    gradient: 'linear-gradient(135deg, #84cc16, #65a30d)',
    href: '/review/particles',
  },
];

/**
 * The four review-game tiles, shown under the due-cards hero on /review. Each
 * pulls words from every deck you've studied — due cards first — so a quick
 * game keeps your whole vocabulary fresh. Every answer earns XP.
 */
export function GameTiles() {
  const t = useTranslations('Games.tiles');
  return (
    <Stack spacing={1.5}>
      {GAMES.map((game) => (
        <GameCard
          key={game.href}
          title={t(`${game.key}.title`)}
          description={t(`${game.key}.description`)}
          jpTitle={game.jpTitle}
          emoji={game.emoji}
          gradient={game.gradient}
          href={game.href}
        />
      ))}
    </Stack>
  );
}
