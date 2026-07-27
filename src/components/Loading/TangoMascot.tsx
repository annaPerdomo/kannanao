'use client';
import { alpha, Box, Typography, useTheme } from '@mui/material';

import {
  blink,
  DOG_ASPECT,
  DOG_WIDTH,
  glowPulse,
  groundShadow,
  SPARKLES,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  tangoHop,
  tangoWobble,
  tonguePant,
} from './constants';
import { SpeechBubble } from './SpeechBubble';

interface TangoMascotProps {
  reducedMotion: boolean;
}

const DOG_HEIGHT = DOG_WIDTH * DOG_ASPECT;

/**
 * The animated centerpiece: Tango sitting inside a glowing, sparkle-orbited
 * stage, hopping in place with a speech bubble cycling through encouragement.
 * Sized in fixed design pixels — the caller scales the whole stage as one
 * unit for mobile, so every keyframe here stays correct at any size.
 */
export function TangoMascot({ reducedMotion }: TangoMascotProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const toneScale = { brand, accent };

  return (
    <Box sx={{ position: 'relative', width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
      {/* Ambient glow behind everything */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '50%',
          top: '56%',
          width: 124,
          height: 124,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(brand[300], 0.4)} 0%, transparent 70%)`,
          animation: reducedMotion ? 'none' : `${glowPulse} 2.4s ease-in-out infinite`,
          opacity: reducedMotion ? 0.6 : undefined,
        }}
      />

      {/* Orbiting sparkles */}
      {!reducedMotion && (
        <Box
          aria-hidden
          sx={{ position: 'absolute', left: '50%', top: '52%', width: 0, height: 0, zIndex: 3 }}
        >
          {SPARKLES.map((s, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                animation: `${s.animation} ${s.duration} linear infinite`,
              }}
            >
              <Typography
                component="span"
                sx={{
                  display: 'block',
                  transform: 'translate(-50%, -50%)',
                  fontSize: s.size,
                  lineHeight: 1,
                  color: toneScale[s.tone][s.toneKey],
                  filter: `drop-shadow(0 0 4px ${alpha(toneScale[s.tone][s.toneKey], 0.85)})`,
                }}
              >
                {s.char}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <SpeechBubble reducedMotion={reducedMotion} />

      {/* Ground shadow */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          width: 100,
          height: 14,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.text.primary, 0.28)} 0%, transparent 72%)`,
          animation: reducedMotion
            ? 'none'
            : `${groundShadow} 1.6s cubic-bezier(0.4,0,0.5,1) infinite`,
        }}
      />

      {/* Tango, hopping */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transformOrigin: 'bottom center',
          animation: reducedMotion ? 'none' : `${tangoHop} 1.6s cubic-bezier(0.4,0,0.5,1) infinite`,
          transform: reducedMotion ? 'translateX(-50%)' : undefined,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            transformOrigin: 'bottom center',
            animation: reducedMotion ? 'none' : `${tangoWobble} 3.2s ease-in-out infinite`,
          }}
        >
          <Box
            component="img"
            src="/mascot/sit.png"
            alt=""
            aria-hidden
            sx={{
              display: 'block',
              width: DOG_WIDTH,
              height: DOG_HEIGHT,
              filter: `drop-shadow(0 5px 8px ${alpha(theme.palette.text.primary, 0.22)})`,
            }}
          />

          <TangoEye left="32.3%" reducedMotion={reducedMotion} />
          <TangoEye left="68.4%" reducedMotion={reducedMotion} />

          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: '48.3%',
              top: '47.4%',
              width: '15.6%',
              height: '7.6%',
              transform: 'translateX(-50%)',
              transformOrigin: 'top center',
              animation: reducedMotion ? 'none' : `${tonguePant} 0.95s ease-in-out infinite`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: '#EE5B67',
                borderRadius: '45% 45% 50% 50% / 30% 30% 70% 70%',
                boxShadow: 'inset 0 -2px 3px rgba(150,30,45,0.4)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '16%',
                width: 2,
                height: '64%',
                bgcolor: 'rgba(150,30,45,0.45)',
                transform: 'translateX(-50%)',
                borderRadius: 2,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function TangoEye({ left, reducedMotion }: { left: string; reducedMotion: boolean }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left,
        top: '35.2%',
        width: '14%',
        height: '13%',
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'top center',
          transform: 'scaleY(0)',
          animation: reducedMotion ? 'none' : `${blink} 2.6s ease-in-out infinite`,
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#F6E7C8', borderRadius: '50%' }} />
        <Box
          sx={{
            position: 'absolute',
            left: '18%',
            right: '18%',
            top: '40%',
            height: '44%',
            border: '2.4px solid #6B3E15',
            borderTop: 'none',
            borderRadius: '0 0 100px 100px',
          }}
        />
      </Box>
    </Box>
  );
}
