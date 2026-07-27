'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';
import { useInView } from '@/hooks/useInView';
import { darkPurple, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';

export function CtaSection() {
  const t = useTranslations('Landing.cta');
  const router = useRouter();
  const { session } = useAuth();
  const { ref, inView } = useInView(0.08);

  return (
    <Box
      id="waitlist"
      ref={ref}
      sx={{
        minHeight: '100svh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${darkPurple.base} 0%, ${darkPurple.mid} 40%, ${darkPurple.midAlt} 75%, ${darkPurple.deepest} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 8, md: 8 },
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

        <Box
          sx={{
            width: { xs: 96, md: 118 },
            mx: 'auto',
            mt: { xs: -7, md: -10 },
            mb: 2,
            animation: 'gentleBounce 4.5s ease-in-out infinite',
            filter: `drop-shadow(0 10px 28px ${alpha(pink[500], 0.35)})`,
          }}
        >
          <Image
            src="/mascot/sit.png"
            width={266}
            height={358}
            alt=""
            style={{ width: '100%', height: 'auto' }}
          />
        </Box>

        <Chip
          icon={
            <AutoAwesomeIcon
              sx={{ fontSize: '0.85rem !important', color: `${purple[300]} !important` }}
            />
          }
          label={t('betaChipLabel')}
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
          {t.rich('headline', { br: () => <br /> })}
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: '0.92rem', sm: '1rem' },
            color: alpha('#fff', 0.52),
            mb: { xs: 3.5, sm: 5 },
            maxWidth: 520,
            mx: 'auto',
            lineHeight: { xs: 1.65, sm: 1.8 },
          }}
        >
          {t('subtitle')}
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
            {t('dashboardButton')}
          </Button>
        ) : (
          <WaitlistForm dark />
        )}

        <Box
          component="footer"
          sx={{
            mt: { xs: 5, sm: 8 },
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
              {t('brandName')}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: alpha('#fff', 0.2),
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {t('tagline')}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: '0.75rem',
              color: alpha('#fff', 0.25),
            }}
          >
            {t.rich('madeBy', {
              link: (chunks) => (
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
                  {chunks}
                </Link>
              ),
            })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
