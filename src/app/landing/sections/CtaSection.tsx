'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';

import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';
import { darkPurple, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';
import { useInView } from './useInView';

export function CtaSection() {
  const router = useRouter();
  const { session } = useAuth();
  const { ref, inView } = useInView(0.08);

  return (
    <Box
      id="waitlist"
      ref={ref}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${darkPurple.base} 0%, ${darkPurple.mid} 40%, ${darkPurple.midAlt} 75%, ${darkPurple.deepest} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 10, md: 8 },
        px: { xs: 2, sm: 4, md: 6 },
      }}
    >
      <Blob
        color={pink[500]}
        size={560}
        top="-120px"
        right="-90px"
        opacity={0.18}
        blur={110}
        pulse
      />
      <Blob color={purple[600]} size={440} bottom="-90px" left="-70px" opacity={0.16} blur={100} />
      <Blob color={sky[500]} size={280} top="52%" left="32%" opacity={0.09} blur={80} />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${alpha('#fff', 0.045)} 1px, transparent 1px)`,
          backgroundSize: '38px 38px',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: 700,
          width: '100%',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(40px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
        }}
      >
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.jp,
            fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
            color: alpha('#fff', 0.05),
            lineHeight: 1,
            mb: 1.5,
            userSelect: 'none',
          }}
        >
          頑張ろう
        </Typography>

        <Chip
          icon={
            <AutoAwesomeIcon
              sx={{ fontSize: '0.85rem !important', color: `${purple[300]} !important` }}
            />
          }
          label="Closed beta — spots opening soon"
          size="small"
          sx={{
            mb: 3,
            bgcolor: alpha(purple[400], 0.18),
            color: purple[200],
            fontWeight: 700,
            fontSize: '0.72rem',
            border: `1px solid ${alpha(purple[400], 0.38)}`,
            borderRadius: 6,
          }}
        />

        <Typography
          component="h2"
          sx={{
            fontFamily: (t) => t.fonts.display,
            fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
            color: 'white',
            lineHeight: 1.02,
            mb: 2.5,
          }}
        >
          Ready to level up your
          <br />
          Japanese skills?
        </Typography>

        <Typography
          sx={{
            fontSize: '1rem',
            color: alpha('#fff', 0.52),
            mb: 5,
            maxWidth: 520,
            mx: 'auto',
            lineHeight: 1.8,
          }}
        >
          Kannanao is currently in closed beta. Drop your email and we&apos;ll notify you the moment
          new spots open up.
        </Typography>

        {session ? (
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/')}
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: '1.1rem',
              textTransform: 'none',
              borderRadius: 8,
              px: 5,
              py: 1.6,
              background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
              boxShadow: `0 10px 36px ${alpha(pink[500], 0.48)}`,
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 16px 48px ${alpha(pink[500], 0.58)}`,
              },
            }}
          >
            Go to dashboard 🌸
          </Button>
        ) : (
          <WaitlistForm dark />
        )}

        <Box
          sx={{
            mt: 8,
            pt: 3,
            borderTop: `1px solid ${alpha('#fff', 0.1)}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.display,
                fontSize: '0.9rem',
                color: alpha('#fff', 0.35),
              }}
            >
              🌸 Kannanao
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: alpha('#fff', 0.2),
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              AI-powered Japanese flashcard studio
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: '0.75rem',
              color: alpha('#fff', 0.25),
            }}
          >
            Made with 💕 by{' '}
            <Link
              href="https://www.variationsonastring.com"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                fontFamily: (t) => t.fonts.display,
                fontSize: '0.75rem',
                color: alpha('#fff', 0.4),
                fontStyle: 'italic',
                '&:hover': { color: alpha('#fff', 0.65) },
              }}
            >
              Variations on a String
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
