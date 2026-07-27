'use client';

import AssignmentIcon from '@mui/icons-material/AssignmentRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooksRounded';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ImageCard } from '@/components/ImageCard';
import { Loading } from '@/components/Loading';
import { useInView } from '@/hooks/useInView';
import { createAppTheme, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';
import { DEMO_IMAGE_CARDS, DEMO_REVIEW_CARDS, DEMO_WORDS } from './demoData';

const sakuraTheme = createAppTheme('sakura');

type DemoPhase = 'input' | 'generating' | 'reviewing' | 'cards';

export function AiDemoSection() {
  const t = useTranslations('Landing.aiDemo');
  const { ref, inView } = useInView(0.06);
  const [chipsShown, setChipsShown] = useState(0);
  const [wordsState, setWordsState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [reviewFilled, setReviewFilled] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>('input');

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const T: ReturnType<typeof setTimeout>[] = [];

    setChipsShown(0);
    setWordsState('idle');
    setReviewFilled(0);
    setCardsVisible(0);
    setPhase('input');

    let count = 0;
    const chipTimer = setInterval(() => {
      if (cancelled) {
        clearInterval(chipTimer);
        return;
      }
      count++;
      setChipsShown(count);
      if (count >= DEMO_WORDS.length) clearInterval(chipTimer);
    }, 600);

    T.push(
      setTimeout(() => {
        if (!cancelled) setWordsState('generating');
      }, 3800),
    );
    T.push(
      setTimeout(() => {
        if (!cancelled) {
          setWordsState('done');
          setPhase('reviewing');
          DEMO_REVIEW_CARDS.forEach((_, i) => {
            T.push(
              setTimeout(() => {
                if (!cancelled) setReviewFilled(i + 1);
              }, i * 280),
            );
          });
        }
      }, 7000),
    );

    T.push(
      setTimeout(() => {
        if (cancelled) return;
        setPhase('cards');
        DEMO_IMAGE_CARDS.forEach((_, i) => {
          T.push(
            setTimeout(() => {
              if (!cancelled) setCardsVisible(i + 1);
            }, i * 350),
          );
        });
      }, 10500),
    );

    return () => {
      cancelled = true;
      clearInterval(chipTimer);
      T.forEach(clearTimeout);
    };
  }, [inView]);

  const allChipsIn = chipsShown >= DEMO_WORDS.length;
  const showReview = phase === 'reviewing' || phase === 'cards';

  return (
    <Box
      ref={ref}
      id="for-educators"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 72,
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${pink[100]} 30%, ${alpha(pink[50], 0.6)} 60%, ${pink[50]} 100%)`,
        py: { xs: 10, md: 10 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={purple[300]} size={500} top="-100px" right="-80px" opacity={0.2} blur={90} />
      <Blob
        color={pink[300]}
        size={360}
        bottom="-60px"
        left="-70px"
        opacity={0.22}
        blur={80}
        pulse
      />
      <Blob color={sky[300]} size={260} top="40%" left="42%" opacity={0.14} blur={60} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${alpha(pink[400], 0.08)} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Chip
            label={t('badge')}
            size="small"
            sx={{
              mb: 2,
              bgcolor: alpha(purple[100], 0.7),
              color: purple[700],
              fontWeight: 800,
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              border: `1px solid ${alpha(purple[300], 0.55)}`,
              borderRadius: 6,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
              color: pink[700],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            {t.rich('heading', { br: () => <br /> })}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(pink[700], 0.62),
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            {t('subheading')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 2, lg: 4 },
            mb: 1.5,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
          }}
        >
          {[
            {
              n: 1,
              key: 'generateCards' as const,
              flex: '0 0 auto',
              width: { xs: '100%', lg: '46%' },
            },
            { n: 2, key: 'reviewAndEdit' as const, flex: 1, width: undefined },
          ].map(({ n, key, flex, width }) => (
            <Box key={n} sx={{ flex, width, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${pink[400]} 0%, ${purple[500]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 8px ${alpha(pink[500], 0.38)}`,
                }}
              >
                <Typography
                  sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 900, lineHeight: 1 }}
                >
                  {n}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: pink[600],
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {t(`steps.${key}`)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 3, lg: 4 },
            alignItems: 'stretch',
            mb: { xs: 4, md: 5 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
          }}
        >
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', lg: '46%' } }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '18px',
                overflow: 'hidden',
                height: '100%',
                boxShadow: `0 20px 64px ${alpha(pink[300], 0.2)}, 0 4px 16px ${alpha(purple[300], 0.1)}`,
                border: `1px solid ${alpha(pink[200], 0.7)}`,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.25,
                  background: `linear-gradient(135deg, ${pink[500]} 0%, ${purple[600]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <AutoAwesomeIcon sx={{ fontSize: '0.95rem', color: '#fff' }} />
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
                    {t('addCardsPanelTitle')}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75}>
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        bgcolor: alpha('#fff', 0.35),
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box
                sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      flexShrink: 0,
                    }}
                  >
                    {t('mainDisplayModeLabel')}
                  </Typography>
                  <Box sx={{ display: 'flex', ml: 'auto' }}>
                    {(['hiragana', 'kanji'] as const).map((modeKey) => (
                      <Box
                        key={modeKey}
                        sx={{
                          px: 1.5,
                          py: 0.4,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: '1px solid rgba(249,168,212,0.5)',
                          color: '#BE185D',
                          cursor: 'default',
                          '&:first-of-type': { borderRadius: '4px 0 0 4px' },
                          '&:last-of-type': { borderRadius: '0 4px 4px 0' },
                        }}
                      >
                        {t(`viewModes.${modeKey}`)}
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    bgcolor: '#FFF8FC',
                    border: '1.5px solid rgba(249,168,212,0.35)',
                    borderRadius: '14px',
                    p: 2,
                    mb: 2,
                    flex: wordsState === 'generating' ? 1 : 'none',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#EC4899',
                      mb: 1.25,
                    }}
                  >
                    {t('generateWithAiLabel')}
                  </Typography>

                  {wordsState === 'generating' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mx: -2, mb: -2 }}>
                      <Loading message={t('generatingCardsMessage')} />
                    </Box>
                  )}

                  {wordsState !== 'generating' && (
                    <>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5,
                          p: '8px 10px',
                          mb: 1.25,
                          border: `1.5px solid ${chipsShown > 0 ? alpha(pink[400], 0.55) : alpha(pink[300], 0.3)}`,
                          borderRadius: '10px',
                          minHeight: 52,
                          bgcolor: '#fff',
                          transition: 'border-color 0.3s ease',
                        }}
                      >
                        {DEMO_WORDS.slice(0, chipsShown).map((w) => (
                          <Chip
                            key={w}
                            label={w}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              bgcolor: alpha(pink[100], 0.6),
                              color: pink[700],
                              border: `1px solid ${alpha(pink[400], 0.4)}`,
                              animation: 'chipPopIn 0.3s ease forwards',
                            }}
                          />
                        ))}
                        {!allChipsIn && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              flexGrow: 1,
                              minWidth: 60,
                            }}
                          >
                            {chipsShown === 0 && (
                              <Typography
                                sx={{ fontSize: '0.78rem', color: 'text.secondary', opacity: 0.55 }}
                              >
                                {t('typeWordsPlaceholder')}
                              </Typography>
                            )}
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-block',
                                width: '2px',
                                height: '1em',
                                bgcolor: purple[400],
                                ml: '2px',
                                animation: 'cursorBlink 0.75s steps(1) infinite',
                              }}
                            />
                          </Box>
                        )}
                      </Box>

                      <Button
                        variant="contained"
                        fullWidth
                        disabled={!allChipsIn || wordsState === 'done'}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          borderRadius: '10px',
                          py: '9px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          textTransform: 'none',
                          background:
                            allChipsIn && wordsState !== 'done'
                              ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)'
                              : undefined,
                          boxShadow:
                            allChipsIn && wordsState !== 'done'
                              ? `0 4px 14px ${alpha(pink[500], 0.35)}`
                              : 'none',
                          '&.Mui-disabled': {
                            background: alpha(purple[100], 0.8),
                            color: alpha(purple[700], 0.4),
                          },
                        }}
                      >
                        {wordsState === 'done'
                          ? t('cardsGeneratedButton', { count: DEMO_WORDS.length })
                          : t('generateButton')}
                      </Button>
                    </>
                  )}
                </Box>

                {wordsState !== 'generating' && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'rgba(194,112,154,0.6)',
                        }}
                      >
                        {t('orDivider')}
                      </Typography>
                      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {[
                        { key: 'addExisting' as const, Icon: LibraryBooksIcon },
                        { key: 'importPdf' as const, Icon: PictureAsPdfIcon },
                      ].map((btn) => (
                        <Box
                          key={btn.key}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: '12px 14px',
                            border: '1.5px solid rgba(249,168,212,0.35)',
                            borderRadius: '12px',
                            bgcolor: '#FFFFFF',
                            cursor: 'default',
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              bgcolor: btn.key === 'importPdf' ? '#F3E8FF' : '#FCE7F3',
                              border: `1px solid ${btn.key === 'importPdf' ? 'rgba(196,181,253,0.45)' : 'rgba(244,114,182,0.3)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <btn.Icon
                              sx={{
                                fontSize: '1.15rem',
                                color: btn.key === 'importPdf' ? purple[600] : pink[600],
                              }}
                            />
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: '#9D174D',
                                lineHeight: 1.2,
                              }}
                            >
                              {t(`addOptions.${btn.key}.title`)}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.68rem',
                                color: '#C2709A',
                                fontWeight: 500,
                                mt: 0.2,
                              }}
                            >
                              {t(`addOptions.${btn.key}.desc`)}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(194,112,154,0.5)' }}>
                            ›
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                overflow: 'hidden',
                height: '100%',
                border: '1.5px solid rgba(249,168,212,0.4)',
                boxShadow: '0 20px 60px rgba(236,72,153,0.14), 0 4px 16px rgba(249,168,212,0.2)',
                background: '#FFFBFE',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #FFF0F8 0%, #F3E8FF 100%)',
                  borderBottom: '1.5px solid rgba(249,168,212,0.25)',
                  px: { xs: 2, sm: 3 },
                  pt: 2.5,
                  pb: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.4 }}>
                      <AssignmentIcon sx={{ fontSize: '1.1rem', color: '#9D174D' }} />
                      <Typography
                        sx={{
                          fontSize: '1.05rem',
                          fontWeight: 900,
                          color: '#9D174D',
                          lineHeight: 1.2,
                        }}
                      >
                        {t('reviewCardsPanelTitle')}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.7rem', color: '#C2709A', fontWeight: 600 }}>
                      {showReview
                        ? t('reviewCardsStatus', { count: DEMO_WORDS.length })
                        : t('reviewCardsWaiting')}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(190,24,93,0.3)',
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(249,168,212,0.25)',
                    borderRadius: '10px',
                    px: 1.5,
                    py: 0.75,
                    gap: 1,
                    flexWrap: 'wrap',
                    opacity: showReview ? 1 : 0.4,
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.57rem',
                      fontWeight: 700,
                      color: '#C2709A',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('setViewModeLabel')}
                  </Typography>
                  <ToggleButtonGroup
                    value="hiragana"
                    exclusive
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        px: 0.9,
                        py: 0.3,
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        minWidth: 0,
                        border: '1px solid rgba(249,168,212,0.4)',
                        color: '#C2709A',
                        '&.Mui-selected': {
                          bgcolor: 'rgba(249,168,212,0.2)',
                          color: '#BE185D',
                          borderColor: 'rgba(236,72,153,0.5)',
                        },
                        '&:hover': { bgcolor: 'rgba(249,168,212,0.06)' },
                      },
                    }}
                  >
                    <ToggleButton value="hiragana">{t('viewModes.hiragana')}</ToggleButton>
                    <ToggleButton value="kanji">{t('viewModes.kanji')}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              <Box
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  flex: 1,
                }}
              >
                {!showReview &&
                  [0, 1, 2, 3, 4].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        border: '1.5px solid rgba(249,168,212,0.15)',
                        borderRadius: '14px',
                        bgcolor: 'rgba(255,248,252,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 1.5,
                        py: 0.875,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '7px',
                          bgcolor: 'rgba(249,168,212,0.08)',
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            height: 12,
                            borderRadius: 1,
                            bgcolor: 'rgba(249,168,212,0.12)',
                            mb: 0.6,
                            width: `${55 + i * 7}%`,
                          }}
                        />
                        <Box
                          sx={{
                            height: 9,
                            borderRadius: 1,
                            bgcolor: 'rgba(249,168,212,0.08)',
                            width: `${40 + i * 4}%`,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}

                {showReview &&
                  DEMO_REVIEW_CARDS.map((card, i) => (
                    <Box
                      key={card.word}
                      sx={{
                        border: '1.5px solid rgba(249,168,212,0.3)',
                        borderRadius: '14px',
                        bgcolor: '#FFFBFE',
                        overflow: 'hidden',
                        opacity: reviewFilled > i ? 1 : 0,
                        transform: reviewFilled > i ? 'translateX(0)' : 'translateX(-12px)',
                        transition:
                          'opacity 0.35s ease, transform 0.35s ease, box-shadow 0.15s ease',
                        '&:hover': { boxShadow: '0 2px 12px rgba(249,168,212,0.2)' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.5,
                          py: 1,
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            flexShrink: 0,
                            overflow: 'hidden',
                            bgcolor: 'rgba(249,168,212,0.12)',
                          }}
                        >
                          {DEMO_IMAGE_CARDS[i]?.imageUrl ? (
                            <Box
                              component="img"
                              src={DEMO_IMAGE_CARDS[i].imageUrl}
                              alt=""
                              // See ImageCard: eager <img> ⇒ server-emitted preload.
                              loading="lazy"
                              decoding="async"
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography sx={{ fontSize: '0.68rem', color: '#C2709A' }}>
                                —
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            noWrap
                            sx={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: '#9D174D',
                              lineHeight: 1.25,
                            }}
                          >
                            {card.word}
                          </Typography>
                          <Typography
                            noWrap
                            sx={{
                              fontSize: '0.68rem',
                              color: '#C2709A',
                              fontWeight: 600,
                              lineHeight: 1.2,
                            }}
                          >
                            {card.reading} · {card.meaning}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            ml: -0.5,
                            flexShrink: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgba(248,113,113,0.4)',
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                          </Box>
                          <Box sx={{ color: '#C2709A', display: 'flex', alignItems: 'center' }}>
                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ))}
              </Box>

              <Box
                sx={{
                  px: { xs: 1.5, sm: 2.5 },
                  py: 1.75,
                  borderTop: '1.5px solid rgba(249,168,212,0.2)',
                  display: 'flex',
                  gap: 1.5,
                  justifyContent: 'flex-end',
                  background: 'linear-gradient(0deg, #FFFBFE 0%, transparent 100%)',
                  opacity: showReview ? 1 : 0.4,
                  transition: 'opacity 0.5s ease',
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 0.7,
                    borderRadius: '10px',
                    border: '1px solid rgba(249,168,212,0.5)',
                    color: '#BE185D',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                  }}
                >
                  {t('cancelButton')}
                </Box>
                <Box
                  sx={{
                    px: 2.25,
                    py: 0.7,
                    borderRadius: '10px',
                    background: showReview
                      ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)'
                      : alpha(purple[100], 0.8),
                    color: showReview ? '#fff' : alpha(purple[700], 0.4),
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    boxShadow: showReview ? '0 4px 14px rgba(236,72,153,0.35)' : 'none',
                    transition: 'all 0.5s ease',
                  }}
                >
                  {t('addCardsToDeckButton', { count: DEMO_WORDS.length })}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Box
          sx={{
            opacity: phase === 'cards' ? 1 : 0,
            transform: phase === 'cards' ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: alpha(pink[300], 0.3) }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${pink[400]} 0%, ${purple[500]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 8px ${alpha(pink[500], 0.38)}`,
                }}
              >
                <Typography
                  sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 900, lineHeight: 1 }}
                >
                  3
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: pink[500],
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('studyYourDeckLabel')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: 1, bgcolor: alpha(pink[300], 0.3) }} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'stretch',
              justifyContent: 'center',
            }}
          >
            <ThemeProvider theme={sakuraTheme}>
              {DEMO_IMAGE_CARDS.map((card, i) => (
                <Box
                  key={card.id}
                  sx={{
                    width: 240,
                    '& > div': { height: '100%' },
                    '& > div > div': { height: '100%' },
                    opacity: cardsVisible > i ? 1 : 0,
                    transform:
                      cardsVisible > i ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.94)',
                    transition:
                      'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                >
                  <ImageCard card={card} onDelete={() => {}} />
                </Box>
              ))}
            </ThemeProvider>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
