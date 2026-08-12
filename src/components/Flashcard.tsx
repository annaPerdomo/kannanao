'use client';
import { Box, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { UnsplashAttribution } from '@/components/UnsplashAttribution';
import { useCardBorder } from '@/contexts/CardBorderContext';
import {
  cardScaledPx as cq,
  cardScaledRem as cqRem,
  cardXp,
  getFlashcardDisplayText,
  oneLineFontSize,
  titleFontSize,
} from '@/lib/flashcardUtils';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

interface FlashcardProps {
  card: FlashcardType;
  width?: number | string;
  height?: number | string;
  /** Notified whenever the flip state changes (and on card reset). Used by flip
   *  mode to reveal its self-grading buttons only after the answer is shown. */
  onFlipChange?: (flipped: boolean) => void;
}

export function Flashcard({
  card,
  width: widthProp,
  height: heightProp,
  onFlipChange,
}: FlashcardProps) {
  const t = useTranslations('Study.flashcard');
  const width = widthProp ?? (card.imageUrl ? '100%' : 420);
  const height = heightProp ?? (card.imageUrl ? 420 : 280);
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { borderStyle: equippedBorder } = useCardBorder();

  const [flipped, setFlipped] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFlipped(false);
    setImgLoaded(false);
  }, [card]);
  useEffect(() => {
    onFlipChange?.(flipped);
  }, [flipped, onFlipChange]);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgLoaded(true);
  }, [card]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (ny - 0.5) * -18, y: (nx - 0.5) * 22 });
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  const toggleFlip = useCallback(() => setFlipped((f) => !f), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggleFlip();
    },
    [toggleFlip],
  );

  const { titleText, subtitleText, speakText } = getFlashcardDisplayText(card);
  const isPhrase = card.cardType === 'phrase';
  const isKanji = card.mainViewMode === 'kanji';
  const isRomaji = card.mainViewMode === 'romaji';
  const typeGradient = isKanji
    ? `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`
    : `linear-gradient(135deg, ${brand[400]} 0%, ${brand[600]} 100%)`;
  const typeAccent = isKanji ? accent[400] : brand[400];

  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;

  const hasCustomBorder = equippedBorder && Object.keys(equippedBorder).length > 0;

  const frameBox = {
    position: 'absolute' as const,
    inset: 0,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    background: hasCustomBorder ? (equippedBorder.background ?? brand[50]) : CARD_FRAME,
    borderRadius: theme.radii.md,
    p: { xs: '5px', sm: '6px' },
    border: hasCustomBorder ? equippedBorder.border : undefined,
    boxShadow: hasCustomBorder
      ? equippedBorder.boxShadow
      : hovered
        ? `0 24px 64px rgba(0,0,0,0.28), 0 8px 28px ${alpha(brand[400], 0.4)}, 0 0 48px ${alpha(accent[300], 0.35)}`
        : `0 8px 40px rgba(0,0,0,0.18), 0 4px 12px ${alpha(brand[400], 0.28)}`,
    transition: 'box-shadow 0.35s ease',
  };

  const innerCard = {
    width: '100%',
    height: '100%',
    bgcolor: brand[50],
    borderRadius: '15px',
    overflow: 'hidden',
    containerType: 'inline-size' as const,
    border: '2.5px solid rgba(255,255,255,0.92)',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  };

  return (
    <Box
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={flipped ? t('flipBackAria') : t('flipAria')}
      sx={{
        width,
        height,
        cursor: 'pointer',
        perspective: '1200px',
        userSelect: 'none',
        flexShrink: 0,
        borderRadius: theme.radii.md,
        '&:focus-visible': {
          outline: `3px solid ${accent[500]}`,
          outlineOffset: '3px',
        },
      }}
    >
      {/* Tilt wrapper — applies 3-D tilt from mouse position */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: hovered
            ? 'transform 0.07s ease-out'
            : 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform',
        }}
      >
        {/* Flip wrapper */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ── FRONT ── */}
          <Box sx={frameBox}>
            <Box sx={innerCard}>
              {/* Top bar */}
              <Box
                sx={{
                  px: { xs: cq(16), sm: cq(20) },
                  py: { xs: cq(7), sm: cq(9) },
                  background: typeGradient,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: cq(10.4), sm: cq(12) },
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  {isKanji ? t('modeKanji') : isRomaji ? t('modeRomaji') : t('modeHiragana')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <Typography
                    sx={{ fontSize: cq(8.8), fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}
                  >
                    {t('xp')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: cq(12.5), sm: cq(14) },
                      fontWeight: 900,
                      color: 'white',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    {cardXp(card.jlptLevel)}
                  </Typography>
                </Box>
              </Box>

              {card.imageUrl ? (
                <>
                  {/* Art frame */}
                  <Box
                    sx={{
                      mx: { xs: '8px', sm: '10px' },
                      mt: { xs: '6px', sm: '8px' },
                      borderRadius: '7px',
                      overflow: 'hidden',
                      border: '2px solid rgba(0,0,0,0.18)',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12)',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {!imgLoaded && (
                      <Skeleton
                        variant="rectangular"
                        width="100%"
                        height={cq(175)}
                        sx={{ bgcolor: alpha(brand[300], 0.1), position: 'absolute', inset: 0 }}
                      />
                    )}
                    <Box
                      component="img"
                      ref={imgRef}
                      src={card.imageUrl}
                      alt={card.word}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgLoaded(true)}
                      sx={{
                        width: '100%',
                        height: cq(175),
                        objectFit: 'cover',
                        display: imgLoaded ? 'block' : 'none',
                      }}
                    />
                    {imgLoaded && <UnsplashAttribution url={card.imageUrl} />}
                  </Box>

                  {/* Card name */}
                  <Box
                    sx={{
                      px: { xs: cq(16), sm: cq(20) },
                      pt: { xs: cq(10), sm: cq(12) },
                      pb: cq(8),
                      borderBottom: `2.5px solid ${typeAccent}`,
                      flexShrink: 0,
                    }}
                  >
                    {subtitleText && (
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.mono,
                          fontSize: cq(10.4),
                          color: '#888',
                          letterSpacing: '0.08em',
                          mb: 0.25,
                          lineHeight: 1,
                        }}
                      >
                        {subtitleText}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.jp,
                          fontSize: isPhrase
                            ? cqRem(titleFontSize(titleText, 2.2, 1.1))
                            : oneLineFontSize(titleText, 35.2, 24),
                          whiteSpace: isPhrase ? 'normal' : 'nowrap',
                          fontWeight: 700,
                          color: '#111',
                          lineHeight: 1.05,
                        }}
                      >
                        {titleText}
                      </Typography>
                      <SpeakButton text={speakText} sx={{ alignSelf: 'flex-end', mb: 0.5 }} />
                    </Box>
                  </Box>

                  {/* Tap hint */}
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: cq(10),
                        color: alpha(brand[500], 0.55),
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('tapToFlip')}
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  {/* No-image: embed-style centered word */}
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: cq(24),
                      borderBottom: `2.5px solid ${typeAccent}`,
                    }}
                  >
                    {subtitleText && (
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.mono,
                          fontSize: cq(11.2),
                          color: '#888',
                          letterSpacing: '0.08em',
                          mb: 0.5,
                        }}
                      >
                        {subtitleText}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.jp,
                          fontSize: isPhrase
                            ? cqRem(titleFontSize(titleText, 3, 1.3))
                            : oneLineFontSize(titleText, 48, 27),
                          whiteSpace: isPhrase ? 'normal' : 'nowrap',
                          fontWeight: 700,
                          color: '#111',
                          lineHeight: 1.1,
                          textAlign: 'center',
                        }}
                      >
                        {titleText}
                      </Typography>
                      <SpeakButton text={speakText} sx={{ alignSelf: 'flex-end', mb: 0.5 }} />
                    </Box>
                  </Box>

                  {/* Tap hint */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: cq(10),
                        color: alpha(brand[500], 0.55),
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('tapToFlip')}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Footer */}
              <Box
                sx={{
                  px: { xs: cq(16), sm: cq(20) },
                  pb: { xs: 1, sm: 1.25 },
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
                  pt: 0.75,
                }}
              >
                {card.jlptLevel && (
                  <Typography
                    sx={{
                      fontSize: cq(8.3),
                      color: alpha(brand[600], 0.7),
                      fontFamily: (t) => t.fonts.mono,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t('jlptLabel', { level: card.jlptLevel })}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: cq(8.3),
                    color: alpha(brand[500], 0.5),
                    fontFamily: (t) => t.fonts.mono,
                  }}
                >
                  ★
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* ── BACK ── */}
          <Box sx={{ ...frameBox, transform: 'rotateY(180deg)' }}>
            <Box sx={innerCard}>
              {/* Corner glow. Inside the clipped card, not in the scrolling
                  content below: hanging 40px past that content box makes it
                  pannable, which on touch swallows the page's own scroll. */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  bottom: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha(brand[300], 0.14)} 0%, transparent 70%)`,
                  filter: 'blur(24px)',
                  pointerEvents: 'none',
                }}
              />
              {/* Top bar */}
              <Box
                sx={{
                  px: { xs: cq(16), sm: cq(20) },
                  py: { xs: cq(7), sm: cq(9) },
                  background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: cq(10.4), sm: cq(12) },
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  {t('answer')}
                </Typography>
              </Box>

              {/* Content */}
              <Box
                sx={{
                  flex: 1,
                  px: { xs: cq(16), sm: cq(20) },
                  py: { xs: cq(12), sm: cq(16) },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: cq(12), sm: cq(16) },
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  overscrollBehavior: 'contain',
                  position: 'relative',
                }}
              >
                {card.mainViewMode !== 'kanji' && (
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.mono,
                        fontSize: cq(9.9),
                        color: brand[500],
                        letterSpacing: '0.14em',
                        fontWeight: 700,
                        mb: 0.5,
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('kanjiLabel')}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.jp,
                        fontSize: isPhrase
                          ? {
                              xs: cqRem(titleFontSize(card.word, 1.8, 0.95)),
                              sm: cqRem(titleFontSize(card.word, 2.1, 1.1)),
                            }
                          : {
                              xs: oneLineFontSize(card.word, 28.8, 14),
                              sm: oneLineFontSize(card.word, 33.6, 14),
                            },
                        whiteSpace: isPhrase ? 'normal' : 'nowrap',
                        fontWeight: 700,
                        color: '#111',
                        lineHeight: 1.2,
                      }}
                    >
                      {card.word}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.mono,
                      fontSize: cq(9.9),
                      color: brand[500],
                      letterSpacing: '0.14em',
                      fontWeight: 700,
                      mb: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('meaningLabel')}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.jp,
                      fontSize: { xs: cq(24), sm: cq(30.4) },
                      fontWeight: 700,
                      color: '#111',
                      fontStyle: 'italic',
                      lineHeight: 1.25,
                    }}
                  >
                    {card.meaning}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    borderTop: `2px solid ${alpha(brand[300], 0.22)}`,
                    pt: { xs: cq(10), sm: cq(14) },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.mono,
                        fontSize: cq(9.9),
                        color: brand[500],
                        letterSpacing: '0.14em',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('exampleLabel')}
                    </Typography>
                    <SpeakButton text={stripFurigana(card.example_jp)} iconSize="0.85rem" />
                  </Box>
                  <Typography
                    component="div"
                    sx={{
                      fontFamily: (t) => t.fonts.jp,
                      fontSize: { xs: cq(15.2), sm: cq(16.8) },
                      color: '#111',
                      lineHeight: 1.8,
                    }}
                  >
                    <FuriganaText
                      text={card.example_jp}
                      showFurigana={card.mainViewMode !== 'kanji'}
                    />
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: cq(13.1), sm: cq(14.4) },
                      color: alpha('#000', 0.5),
                      mt: 0.75,
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                    }}
                  >
                    {card.example_en}
                  </Typography>
                </Box>
              </Box>

              {/* Footer */}
              <Box
                sx={{
                  px: { xs: cq(16), sm: cq(20) },
                  pb: { xs: 1, sm: 1.25 },
                  borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
                  pt: 0.75,
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                {card.jlptLevel && (
                  <Typography
                    sx={{
                      fontSize: cq(8.3),
                      color: alpha(brand[600], 0.7),
                      fontFamily: (t) => t.fonts.mono,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t('jlptLabel', { level: card.jlptLevel })}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: cq(8.3),
                    color: alpha(brand[500], 0.5),
                    fontFamily: (t) => t.fonts.mono,
                  }}
                >
                  {t('tapToFlipBack')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
