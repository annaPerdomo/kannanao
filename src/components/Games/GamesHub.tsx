'use client';

import { alpha, Box, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

interface GameCardProps {
  title: string;
  jpTitle: string;
  description: string;
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

const GAMES: GameCardProps[] = [
  {
    title: 'Word Match',
    jpTitle: 'ことばマッチ',
    description: 'Match words from all your decks to their meanings — 6 pairs a round.',
    emoji: '🍉',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    href: '/games/match',
  },
  {
    title: 'Kana Builder',
    jpTitle: 'かなビルダー',
    description: 'Spell words you’ve studied from kana tiles — recall, not recognition.',
    emoji: '🧩',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    href: '/games/kana',
  },
  {
    title: 'Question Quest',
    jpTitle: 'しつもんクエスト',
    description: 'なんさい? なにいろ? だれ? — pick the answer that fits each question.',
    emoji: '❓',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    href: '/games/questions',
  },
  {
    title: 'Particle Picker',
    jpTitle: 'じょしピッカー',
    description: 'Fill in は・が・を・に・の and friends to complete each sentence.',
    emoji: '🎏',
    gradient: 'linear-gradient(135deg, #84cc16, #65a30d)',
    href: '/games/particles',
  },
];

export function GamesHub() {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Box
            aria-hidden
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              mb: 2,
              boxShadow: `0 4px 16px ${alpha(brand[500], 0.3)}`,
              fontSize: 28,
            }}
          >
            🎮
          </Box>
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 0.5 }}>
            Practice Games
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
            ふくしゅうしよう！ — quick games that mix words from every deck you’ve studied, so
            nothing gets forgotten. Every answer earns XP!
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          {GAMES.map((game) => (
            <GameCard key={game.href} {...game} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
