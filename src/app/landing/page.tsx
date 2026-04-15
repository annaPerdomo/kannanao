'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WaitlistForm from '@/components/WaitlistForm';

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  emoji,
  title,
  description,
  accent,
}: {
  emoji: string;
  title: string;
  description: string;
  accent?: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const color = accent ?? brand[700];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        background: alpha(brand[50], 0.7),
        border: `1px solid ${alpha(brand[300], 0.40)}`,
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow 0.25s, transform 0.25s',
        '&:hover': {
          boxShadow: `0 8px 32px ${color}22`,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          background: `${color}14`,
          border: `1.5px solid ${color}30`,
        }}
      >
        {emoji}
      </Box>
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '1.05rem',
          color: color,
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Paper>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step({
  number,
  emoji,
  title,
  description,
}: {
  number: number;
  emoji: string;
  title: string;
  description: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
      <Box
        sx={{
          flexShrink: 0,
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${brand[300]} 0%, ${brand[700]} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 14px ${alpha(brand[700], 0.24)}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1rem',
            color: '#fff',
            lineHeight: 1,
          }}
        >
          {number}
        </Typography>
      </Box>
      <Box>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1rem',
            color: brand[700],
            mb: 0.4,
          }}
        >
          {emoji} {title}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Floating flashcard mockup ─────────────────────────────────────────────────

function FlashcardMockup() {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 340,
        mx: 'auto',
        height: 260,
        userSelect: 'none',
      }}
    >
      {/* Back card */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          top: 28,
          left: 20,
          right: 0,
          borderRadius: 4,
          p: 3,
          background: `linear-gradient(135deg, ${alpha(brand[100], 0.9)} 0%, ${alpha(brand[200], 0.7)} 100%)`,
          border: `1.5px solid ${alpha(brand[300], 0.45)}`,
          height: 180,
          transform: 'rotate(-4deg)',
          opacity: 0.7,
        }}
      />
      {/* Front card */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 20,
          borderRadius: 4,
          p: 3,
          background: alpha(brand[50], 0.95),
          border: `1.5px solid ${alpha(brand[300], 0.40)}`,
          boxShadow: `0 12px 40px ${alpha(brand[700], 0.14)}`,
          backdropFilter: 'blur(12px)',
          height: 180,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>🌸 Example</Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: '"Noto Serif JP", serif',
            fontSize: '2.6rem',
            color: brand[700],
            lineHeight: 1,
            mb: 0.5,
            textAlign: 'center',
          }}
        >
          桜
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '0.82rem',
            color: 'text.secondary',
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          さくら · sakura
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', textAlign: 'center' }}>
          cherry blossom
        </Typography>
      </Paper>

      {/* XP chip floating */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          bgcolor: alpha(brand[50], 0.95),
          border: `1px solid ${alpha(brand[300], 0.40)}`,
          borderRadius: 6,
          px: 1.5,
          py: 0.5,
          boxShadow: `0 4px 12px ${alpha(brand[700], 0.14)}`,
        }}
      >
        <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.78rem', color: brand[700] }}>
          +10 XP ✨
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { session } = useAuth();
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const features = [
    {
      emoji: '🤖',
      title: 'AI-Generated Cards',
      description:
        'Type a word and let Google Gemini fill in readings, meanings, and example sentences in both Japanese and English — instantly.',
      accent: '#7C3AED',
    },
    {
      emoji: '🖼️',
      title: 'Beautiful Card Images',
      description:
        'Every card can have a stunning photo from Unsplash, making vocabulary stick through visual memory.',
      accent: '#0EA5E9',
    },
    {
      emoji: '🎮',
      title: 'Three Practice Modes',
      description:
        'Challenge yourself with Match, Fill-in-the-blank, or Recall modes. Each session tracks accuracy and awards XP.',
      accent: '#10B981',
    },
    {
      emoji: '🔥',
      title: 'Streaks & XP Levels',
      description:
        'Keep your daily study streak alive, level up with XP, and unlock achievements as you build your vocabulary.',
      accent: '#EF4444',
    },
    {
      emoji: '📄',
      title: 'PDF Import',
      description:
        'Have a textbook or word list as a PDF? Upload it and Kannanao extracts the vocabulary for you automatically.',
      accent: '#F59E0B',
    },
    {
      emoji: '🤝',
      title: 'Share Decks',
      description:
        'Share your carefully crafted decks with friends or classmates with a single link. Study together.',
      accent: brand[700],
    },
    {
      emoji: '📊',
      title: 'Detailed Stats',
      description:
        'A full progress dashboard with an activity calendar, per-session accuracy, XP history, and achievement badges.',
      accent: '#8B5CF6',
    },
    {
      emoji: '✅',
      title: 'Study To-Do List',
      description:
        'Jot down study goals right in the app. Complete tasks, earn bonus XP, and stay organised.',
      accent: brand[700],
    },
  ];

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 8, sm: 10 },
      }}
    >
      {/* ── Hero ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 5, md: 6 },
        }}
      >
        {/* Text */}
        <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
          {/* Badge */}
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important', color: '#B45309 !important' }} />}
            label="Beta · Sign-ups opening soon"
            size="small"
            sx={{
              mb: 2.5,
              bgcolor: 'rgba(251,191,36,0.12)',
              color: '#B45309',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: 6,
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: '2.8rem', sm: '3.6rem', md: '4rem' },
              lineHeight: 1.05,
              mb: 1.5,
              background: `linear-gradient(135deg, ${brand[700]} 0%, #7C3AED 60%, #0EA5E9 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Learn Japanese,
            <br />
            one card at a time.
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: '1rem', sm: '1.1rem' },
              color: 'text.secondary',
              lineHeight: 1.7,
              mb: 3.5,
              maxWidth: 460,
              mx: { xs: 'auto', md: 0 },
            }}
          >
            Kannanao is a beautiful flashcard studio with AI card generation,
            gamified progress tracking, and multiple practice modes — designed to
            make studying Japanese actually enjoyable.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent={{ xs: 'center', md: 'flex-start' }}
          >
            {session ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/')}
                sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '1rem',
                  textTransform: 'none',
                  borderRadius: 7,
                  px: 4,
                  py: 1.4,
                }}
              >
                Go to dashboard 🌸
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    const el = document.getElementById('waitlist');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 7,
                    px: 4,
                    py: 1.4,
                  }}
                >
                  Join the waitlist 🌸
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/login')}
                  sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 7,
                    px: 3.5,
                    py: 1.4,
                  }}
                >
                  Sign in
                </Button>
              </>
            )}
          </Stack>

          {/* Social proof mini-chips */}
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            justifyContent={{ xs: 'center', md: 'flex-start' }}
            sx={{ mt: 3 }}
          >
            {['🎌 Japanese', '✨ AI-powered', '🎮 Gamified', '📊 Stats'].map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  bgcolor: alpha(brand[50], 0.80),
                  color: 'text.secondary',
                  fontSize: '0.72rem',
                  border: `1px solid ${alpha(brand[300], 0.40)}`,
                  borderRadius: 4,
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Flashcard mockup */}
        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', sm: 340 } }}>
          <FlashcardMockup />
        </Box>
      </Box>

      {/* ── Features grid ── */}
      <Box>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              color: brand[700],
              mb: 1,
            }}
          >
            Everything you need to study smarter
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', maxWidth: 480, mx: 'auto' }}>
            From AI card generation to detailed analytics — Kannanao has all the
            tools to build a consistent Japanese study habit.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </Box>
      </Box>

      {/* ── How it works ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 5, md: 8 },
          alignItems: { md: 'flex-start' },
        }}
      >
        {/* Left: heading */}
        <Box sx={{ flex: '0 0 auto', maxWidth: { md: 280 } }}>
          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              color: brand[700],
              lineHeight: 1.15,
              mb: 1.5,
            }}
          >
            Up and running in minutes
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', lineHeight: 1.7 }}>
            No complicated setup. Just create an account, make a deck, and start
            studying. Your progress is saved automatically.
          </Typography>
        </Box>

        {/* Right: steps */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Step
            number={1}
            emoji="✍️"
            title="Create a deck"
            description="Give your deck a name and description. Decks keep your vocabulary organised by topic, JLPT level, or whatever works for you."
          />
          <Step
            number={2}
            emoji="🤖"
            title="Add cards with AI"
            description="Type a word or paste a PDF. Gemini AI fills in the reading, meaning, and example sentences. Add an Unsplash photo to cement the memory."
          />
          <Step
            number={3}
            emoji="🎮"
            title="Study & practise"
            description="Flip through cards in Study mode or sharpen recall with Match, Fill, or Recall practice. Each session earns XP toward your next level."
          />
          <Step
            number={4}
            emoji="📈"
            title="Track your growth"
            description="Watch your streak grow on the activity calendar, unlock achievement badges, and see your accuracy improve session by session."
          />
        </Box>
      </Box>

      {/* ── Practice modes highlight ── */}
      <Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              color: brand[700],
              mb: 1,
            }}
          >
            Three ways to practise
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary' }}>
            Switch between modes to keep study sessions fresh and challenging.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {[
            {
              emoji: '🔗',
              title: 'Match',
              description: 'Race the clock matching Japanese words to their meanings. Great for rapid-fire vocabulary drilling.',
              accent: '#10B981',
              bg: 'rgba(209,250,229,0.40)',
              border: 'rgba(110,231,183,0.40)',
            },
            {
              emoji: '✏️',
              title: 'Fill in the blank',
              description: 'Read a sentence and type the missing word. Builds reading comprehension alongside vocabulary.',
              accent: '#7C3AED',
              bg: 'rgba(237,233,254,0.50)',
              border: 'rgba(196,181,253,0.45)',
            },
            {
              emoji: '🧠',
              title: 'Recall',
              description: 'See the meaning, type the Japanese. The hardest mode — and the best for long-term retention.',
              accent: brand[700],
              bg: alpha(brand[100], 0.5),
              border: alpha(brand[300], 0.40),
            },
          ].map((m) => (
            <Paper
              key={m.title}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                background: m.bg,
                border: `1.5px solid ${m.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                transition: 'transform 0.25s, box-shadow 0.25s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 28px ${m.accent}22` },
              }}
            >
              <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{m.emoji}</Typography>
              <Typography
                sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.15rem', color: m.accent }}
              >
                {m.title}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.6 }}>
                {m.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* ── CTA / Waitlist ── */}
      <Box
        id="waitlist"
        sx={{
          borderRadius: 6,
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(brand[100], 0.9)} 0%, ${alpha(accent[100], 0.9)} 50%, ${alpha(brand[50], 0.95)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.2)}`,
          boxShadow: `0 12px 48px ${alpha(accent[300], 0.22)}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: alpha(brand[300], 0.12), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 110, height: 110, borderRadius: '50%', background: alpha(accent[300], 0.14), pointerEvents: 'none' }} />

        <Typography
          sx={{
            fontFamily: '"Noto Serif JP", serif',
            fontSize: { xs: '3.5rem', sm: '5rem' },
            color: alpha(brand[700], 0.12),
            lineHeight: 1,
            mb: 1,
            userSelect: 'none',
          }}
        >
          頑張ろう
        </Typography>

        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2rem', sm: '2.6rem' },
            lineHeight: 1.1,
            mb: 1.5,
            background: `linear-gradient(90deg, ${brand[700]} 0%, #7C3AED 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          We&apos;re in beta — spots opening soon
        </Typography>

        <Typography
          sx={{ fontSize: '0.95rem', color: 'text.secondary', mb: 4, maxWidth: 480, mx: 'auto' }}
        >
          Kannanao is currently in closed beta. Drop your email below and
          we&apos;ll let you know as soon as new sign-ups open.
        </Typography>

        {session ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/')}
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: 7,
              px: 5,
              py: 1.4,
            }}
          >
            Go to dashboard 🌸
          </Button>
        ) : (
          <WaitlistForm />
        )}
      </Box>

      {/* ── Footer ── */}
      <Box sx={{ textAlign: 'center', pb: 2 }}>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1.1rem',
            color: brand[700],
            mb: 0.5,
          }}
        >
          🌸 Kannanao
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          AI-powered Japanese flashcard studio
        </Typography>
      </Box>
    </Box>
  );
}
