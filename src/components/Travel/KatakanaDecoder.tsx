'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { useSpeech } from '@/hooks/useSpeech';
import { logTravelEvent } from '@/lib/supabase';
import { LAYOUT } from '@/theme';

// ─── Katakana Data ────────────────────────────────────────────────

interface KatakanaChar {
  char: string;
  romaji: string;
  row: string;
}

const KATAKANA: KatakanaChar[] = [
  // Vowels
  { char: 'ア', romaji: 'a', row: 'vowels' },
  { char: 'イ', romaji: 'i', row: 'vowels' },
  { char: 'ウ', romaji: 'u', row: 'vowels' },
  { char: 'エ', romaji: 'e', row: 'vowels' },
  { char: 'オ', romaji: 'o', row: 'vowels' },
  // K row
  { char: 'カ', romaji: 'ka', row: 'k' },
  { char: 'キ', romaji: 'ki', row: 'k' },
  { char: 'ク', romaji: 'ku', row: 'k' },
  { char: 'ケ', romaji: 'ke', row: 'k' },
  { char: 'コ', romaji: 'ko', row: 'k' },
  // S row
  { char: 'サ', romaji: 'sa', row: 's' },
  { char: 'シ', romaji: 'shi', row: 's' },
  { char: 'ス', romaji: 'su', row: 's' },
  { char: 'セ', romaji: 'se', row: 's' },
  { char: 'ソ', romaji: 'so', row: 's' },
  // T row
  { char: 'タ', romaji: 'ta', row: 't' },
  { char: 'チ', romaji: 'chi', row: 't' },
  { char: 'ツ', romaji: 'tsu', row: 't' },
  { char: 'テ', romaji: 'te', row: 't' },
  { char: 'ト', romaji: 'to', row: 't' },
  // N row
  { char: 'ナ', romaji: 'na', row: 'n' },
  { char: 'ニ', romaji: 'ni', row: 'n' },
  { char: 'ヌ', romaji: 'nu', row: 'n' },
  { char: 'ネ', romaji: 'ne', row: 'n' },
  { char: 'ノ', romaji: 'no', row: 'n' },
  // H row
  { char: 'ハ', romaji: 'ha', row: 'h' },
  { char: 'ヒ', romaji: 'hi', row: 'h' },
  { char: 'フ', romaji: 'fu', row: 'h' },
  { char: 'ヘ', romaji: 'he', row: 'h' },
  { char: 'ホ', romaji: 'ho', row: 'h' },
  // M row
  { char: 'マ', romaji: 'ma', row: 'm' },
  { char: 'ミ', romaji: 'mi', row: 'm' },
  { char: 'ム', romaji: 'mu', row: 'm' },
  { char: 'メ', romaji: 'me', row: 'm' },
  { char: 'モ', romaji: 'mo', row: 'm' },
  // Y row
  { char: 'ヤ', romaji: 'ya', row: 'y' },
  { char: 'ユ', romaji: 'yu', row: 'y' },
  { char: 'ヨ', romaji: 'yo', row: 'y' },
  // R row
  { char: 'ラ', romaji: 'ra', row: 'r' },
  { char: 'リ', romaji: 'ri', row: 'r' },
  { char: 'ル', romaji: 'ru', row: 'r' },
  { char: 'レ', romaji: 're', row: 'r' },
  { char: 'ロ', romaji: 'ro', row: 'r' },
  // W row
  { char: 'ワ', romaji: 'wa', row: 'w' },
  { char: 'ヲ', romaji: 'wo', row: 'w' },
  // N
  { char: 'ン', romaji: 'n', row: 'nn' },
];

interface LoanWord {
  katakana: string;
  romaji: string;
  english: string;
  category: string;
}

const LOAN_WORDS: LoanWord[] = [
  // Food & Drink
  { katakana: 'コーヒー', romaji: 'koohii', english: 'coffee', category: 'food' },
  { katakana: 'ビール', romaji: 'biiru', english: 'beer', category: 'food' },
  { katakana: 'ラーメン', romaji: 'raamen', english: 'ramen', category: 'food' },
  { katakana: 'パン', romaji: 'pan', english: 'bread', category: 'food' },
  { katakana: 'ケーキ', romaji: 'keeki', english: 'cake', category: 'food' },
  { katakana: 'アイス', romaji: 'aisu', english: 'ice cream', category: 'food' },
  { katakana: 'ジュース', romaji: 'juusu', english: 'juice', category: 'food' },
  { katakana: 'ミルク', romaji: 'miruku', english: 'milk', category: 'food' },
  { katakana: 'サラダ', romaji: 'sarada', english: 'salad', category: 'food' },
  { katakana: 'チョコレート', romaji: 'chokoreeto', english: 'chocolate', category: 'food' },
  // Places
  { katakana: 'ホテル', romaji: 'hoteru', english: 'hotel', category: 'places' },
  { katakana: 'レストラン', romaji: 'resutoran', english: 'restaurant', category: 'places' },
  { katakana: 'コンビニ', romaji: 'konbini', english: 'convenience store', category: 'places' },
  { katakana: 'デパート', romaji: 'depaato', english: 'department store', category: 'places' },
  { katakana: 'トイレ', romaji: 'toire', english: 'toilet', category: 'places' },
  { katakana: 'エレベーター', romaji: 'erebeetaa', english: 'elevator', category: 'places' },
  { katakana: 'スーパー', romaji: 'suupaa', english: 'supermarket', category: 'places' },
  // Transport
  { katakana: 'タクシー', romaji: 'takushii', english: 'taxi', category: 'transport' },
  { katakana: 'バス', romaji: 'basu', english: 'bus', category: 'transport' },
  {
    katakana: 'エスカレーター',
    romaji: 'esukareetaa',
    english: 'escalator',
    category: 'transport',
  },
  // Things
  { katakana: 'カメラ', romaji: 'kamera', english: 'camera', category: 'things' },
  { katakana: 'テレビ', romaji: 'terebi', english: 'TV', category: 'things' },
  { katakana: 'インターネット', romaji: 'intaanetto', english: 'internet', category: 'things' },
  { katakana: 'スマホ', romaji: 'sumaho', english: 'smartphone', category: 'things' },
  { katakana: 'メニュー', romaji: 'menyuu', english: 'menu', category: 'things' },
  {
    katakana: 'クレジットカード',
    romaji: 'kurejitto kaado',
    english: 'credit card',
    category: 'things',
  },
  { katakana: 'ペン', romaji: 'pen', english: 'pen', category: 'things' },
  { katakana: 'ボタン', romaji: 'botan', english: 'button', category: 'things' },
  // Useful signs
  { katakana: 'オープン', romaji: 'oopun', english: 'open', category: 'signs' },
  { katakana: 'フリー', romaji: 'furii', english: 'free', category: 'signs' },
  { katakana: 'セール', romaji: 'seeru', english: 'sale', category: 'signs' },
  { katakana: 'マンション', romaji: 'manshon', english: 'apartment', category: 'signs' },
  { katakana: 'サイズ', romaji: 'saizu', english: 'size', category: 'signs' },
];

type TabMode = 'chart' | 'quiz' | 'decode';

export function KatakanaDecoder() {
  const t = useTranslations('Travel.katakana');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const [mode, setMode] = useState<TabMode>('chart');

  useEffect(() => {
    logTravelEvent('katakana', 'view');
  }, []);

  return (
    <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('intro')}
          onBack={() => router.push('/travel')}
          mb={0}
        />

        {/* Mode tabs */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['chart', 'quiz', 'decode'] as const).map((tab) => (
            <Chip
              key={tab}
              label={t(`tabs.${tab}`)}
              onClick={() => setMode(tab)}
              variant={mode === tab ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: mode === tab ? 700 : 500,
                ...(mode === tab && {
                  bgcolor: alpha(brand[500], 0.12),
                  color: brand[700],
                  borderColor: brand[400],
                }),
              }}
            />
          ))}
        </Box>

        {mode === 'chart' && <ChartView speak={speak} />}
        {mode === 'quiz' && <QuizView speak={speak} />}
        {mode === 'decode' && <DecodeView speak={speak} />}
      </Stack>
    </Box>
  );
}

// ─── Chart View ───────────────────────────────────────────────────

function ChartView({ speak }: { speak: (text: string) => void }) {
  const t = useTranslations('Travel.katakana');
  const theme = useTheme();
  const { brand } = theme.palette;

  const rows = useMemo(() => {
    const grouped: Record<string, KatakanaChar[]> = {};
    for (const k of KATAKANA) {
      if (!grouped[k.row]) grouped[k.row] = [];
      grouped[k.row].push(k);
    }
    return grouped;
  }, []);

  const rowLabels = t.raw('rowLabels') as Record<string, string>;

  return (
    <Stack spacing={2}>
      {Object.entries(rows).map(([row, chars]) => (
        <Box key={row}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: brand[600],
              letterSpacing: '0.05em',
              mb: 0.5,
              display: 'block',
            }}
          >
            {rowLabels[row] ?? row}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {chars.map((k) => (
              <Card
                key={k.char}
                onClick={() => speak(k.char)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    speak(k.char);
                  }
                }}
                sx={{
                  width: 56,
                  height: 68,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                  transition: 'all 0.15s',
                  '&:hover': {
                    transform: 'scale(1.08)',
                    borderColor: brand[400],
                    boxShadow: `0 4px 12px ${alpha(brand[400], 0.2)}`,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.jp,
                    fontSize: '1.4rem',
                    color: 'text.primary',
                    lineHeight: 1,
                  }}
                >
                  {k.char}
                </Typography>
                <Typography variant="caption" sx={{ color: brand[600], fontWeight: 600, mt: 0.5 }}>
                  {k.romaji}
                </Typography>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: alpha(brand[100], 0.4),
          border: `1px solid ${alpha(brand[200], 0.4)}`,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tapToHear')}
        </Typography>
      </Box>
    </Stack>
  );
}

// ─── Quiz View ────────────────────────────────────────────────────

function QuizView({ speak }: { speak: (text: string) => void }) {
  const t = useTranslations('Travel.katakana');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [current, setCurrent] = useState(() => randomChar());
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  function randomChar(): KatakanaChar {
    return KATAKANA[Math.floor(Math.random() * KATAKANA.length)];
  }

  const handleSubmit = useCallback(() => {
    const isCorrect = userAnswer.trim().toLowerCase() === current.romaji.toLowerCase();
    setResult(isCorrect ? 'correct' : 'wrong');
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  }, [userAnswer, current]);

  const handleNext = useCallback(() => {
    setCurrent(randomChar());
    setUserAnswer('');
    setResult(null);
  }, []);

  return (
    <Stack spacing={3} alignItems="center">
      {/* Score */}
      <Chip
        label={`${score.correct} / ${score.total}`}
        sx={{ fontWeight: 700, bgcolor: alpha(brand[100], 0.5) }}
      />

      {/* Character display */}
      <Card
        sx={{
          width: 160,
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          border: `2px solid ${alpha(brand[300], 0.4)}`,
          cursor: 'pointer',
        }}
        onClick={() => speak(current.char)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') speak(current.char);
        }}
      >
        <Typography
          sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '4.5rem', color: 'text.primary' }}
        >
          {current.char}
        </Typography>
      </Card>

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('quizInstructions')}
      </Typography>

      {/* Answer input */}
      {result === null ? (
        <Box sx={{ display: 'flex', gap: 1, width: '100%', maxWidth: 280 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('romajiPlaceholder')}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!userAnswer.trim()}
            sx={{ borderRadius: 2, textTransform: 'none', minWidth: 60 }}
          >
            {t('go')}
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.5} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {result === 'correct' ? (
              <CheckCircleIcon sx={{ color: '#10b981' }} />
            ) : (
              <CloseIcon sx={{ color: '#ef4444' }} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {result === 'correct' ? t('correct') : t('incorrect', { romaji: current.romaji })}
            </Typography>
          </Box>
          <Button
            onClick={handleNext}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {t('next')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

// ─── Decode View ──────────────────────────────────────────────────

function DecodeView({ speak }: { speak: (text: string) => void }) {
  const t = useTranslations('Travel.katakana');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', 'food', 'places', 'transport', 'things', 'signs'];

  const filtered =
    activeCategory === 'all' ? LOAN_WORDS : LOAN_WORDS.filter((w) => w.category === activeCategory);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('decodeIntro')}
      </Typography>

      {/* Category filter */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={t(`decodeCategories.${cat}`)}
            size="small"
            onClick={() => setActiveCategory(cat)}
            variant={activeCategory === cat ? 'filled' : 'outlined'}
            sx={{
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: activeCategory === cat ? 700 : 500,
              ...(activeCategory === cat && {
                bgcolor: alpha(brand[500], 0.12),
                color: brand[700],
              }),
            }}
          />
        ))}
      </Box>

      {/* Word cards */}
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}
      >
        {filtered.map((word) => {
          const globalIdx = LOAN_WORDS.indexOf(word);
          const isRevealed = revealedIds.has(globalIdx);
          return (
            <Card
              key={globalIdx}
              onClick={() => setRevealedIds((prev) => new Set([...prev, globalIdx]))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setRevealedIds((prev) => new Set([...prev, globalIdx]));
                }
              }}
              sx={{
                p: 2,
                borderRadius: 2.5,
                cursor: 'pointer',
                border: `1px solid ${alpha(brand[300], 0.3)}`,
                transition: 'all 0.2s',
                '&:hover': { borderColor: alpha(brand[400], 0.5) },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.jp,
                    fontSize: '1.3rem',
                    color: 'text.primary',
                    flex: 1,
                  }}
                >
                  {word.katakana}
                </Typography>
                <Tooltip title={t('listen')}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(word.katakana);
                    }}
                    aria-label={t('listen')}
                  >
                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              {isRevealed ? (
                <Box sx={{ mt: 0.75 }}>
                  <Typography variant="body2" sx={{ color: brand[600], fontStyle: 'italic' }}>
                    {word.romaji}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    = {word.english}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                >
                  {t('tapToReveal')}
                </Typography>
              )}
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
