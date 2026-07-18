'use client';

import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { alpha, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { PageHeader } from '@/components/PageHeader';
import { useSpeech } from '@/hooks/useSpeech';
import { logTravelEvent } from '@/lib/supabase';
import { LAYOUT } from '@/theme';

import { AuthGatedSaveDialog } from './AuthGatedSaveDialog';
import { TravelPhrase } from './TravelPhrase';

// ─── Data ─────────────────────────────────────────────────────────

interface HeardPhrase {
  id: string;
  japanese: string;
  romaji: string;
  english: string;
  context: string;
  yourResponse?: string;
  yourResponseRomaji?: string;
}

interface Location {
  key: string;
  icon: string;
  phrases: HeardPhrase[];
}

const LOCATIONS: Location[] = [
  {
    key: 'konbini',
    icon: '🏪',
    phrases: [
      {
        id: 'k1',
        japanese: 'いらっしゃいませ',
        romaji: 'irasshaimase',
        english: 'Welcome! (to our store)',
        context: 'Said the moment you walk in. No response needed — just a nod is fine.',
      },
      {
        id: 'k2',
        japanese: 'ポイントカードはお{持|も}ちですか？',
        romaji: 'pointo kaado wa omochi desu ka?',
        english: 'Do you have a point card?',
        context: "They're asking about a loyalty card. You probably don't have one.",
        yourResponse: 'ないです',
        yourResponseRomaji: "nai desu (= I don't have one)",
      },
      {
        id: 'k3',
        japanese: '{袋|ふくろ}いりますか？',
        romaji: 'fukuro irimasu ka?',
        english: 'Do you need a bag?',
        context: "Plastic bags cost ¥3-5. They're asking if you want to buy one.",
        yourResponse: 'はい、お{願|ねが}いします / いいえ、{大丈夫|だいじょうぶ}です',
        yourResponseRomaji: 'hai, onegai shimasu (yes please) / iie, daijoubu desu (no thanks)',
      },
      {
        id: 'k4',
        japanese: '{温|あたた}めますか？',
        romaji: 'atatamemasu ka?',
        english: 'Shall I heat it up?',
        context: "Asked when you buy a bento, onigiri, or nikuman. They'll microwave it for you.",
        yourResponse: 'はい、お願いします',
        yourResponseRomaji: 'hai, onegai shimasu (yes please)',
      },
      {
        id: 'k5',
        japanese: 'お{箸|はし}つけますか？',
        romaji: 'ohashi tsukemasu ka?',
        english: 'Do you want chopsticks?',
        context: 'Asked with food purchases. They may also offer a spoon (スプーン).',
        yourResponse: 'はい / いいえ',
        yourResponseRomaji: 'hai (yes) / iie (no)',
      },
      {
        id: 'k6',
        japanese: '〇〇{円|えん}になります',
        romaji: '... en ni narimasu',
        english: "That'll be __ yen",
        context:
          'The total price. Listen for the number before 円 (en). Look at the register display if unsure.',
      },
      {
        id: 'k7',
        japanese: 'レシートいりますか？',
        romaji: 'reshiito irimasu ka?',
        english: 'Do you need a receipt?',
        context: 'Some stores ask instead of automatically printing one.',
        yourResponse: 'いいえ、{大丈夫|だいじょうぶ}です',
        yourResponseRomaji: 'iie, daijoubu desu (no thanks)',
      },
    ],
  },
  {
    key: 'restaurant',
    icon: '🍜',
    phrases: [
      {
        id: 'r1',
        japanese: 'いらっしゃいませ！{何名様|なんめいさま}ですか？',
        romaji: 'irasshaimase! nanmei-sama desu ka?',
        english: 'Welcome! How many people?',
        context: 'They need to know your party size for seating.',
        yourResponse: '{一人|ひとり} / {二人|ふたり} / {三人|さんにん}',
        yourResponseRomaji: 'hitori (1) / futari (2) / sannin (3)',
      },
      {
        id: 'r2',
        japanese: 'こちらへどうぞ',
        romaji: 'kochira e douzo',
        english: 'This way, please',
        context: "They're leading you to your table. Just follow them.",
      },
      {
        id: 'r3',
        japanese: 'ご{注文|ちゅうもん}はお{決|き}まりですか？',
        romaji: 'go-chuumon wa okimari desu ka?',
        english: 'Are you ready to order?',
        context: 'If you need more time, say "mada desu" (not yet).',
        yourResponse: 'はい / まだです',
        yourResponseRomaji: 'hai (yes) / mada desu (not yet)',
      },
      {
        id: 'r4',
        japanese: 'お{飲|の}み{物|もの}はいかがですか？',
        romaji: 'onomimono wa ikaga desu ka?',
        english: 'Would you like something to drink?',
        context: "They're asking about drinks, usually at the start.",
        yourResponse: '{水|みず}をお{願|ねが}いします',
        yourResponseRomaji: 'mizu wo onegai shimasu (water please)',
      },
      {
        id: 'r5',
        japanese: '{以上|いじょう}でよろしいですか？',
        romaji: 'ijou de yoroshii desu ka?',
        english: 'Will that be all?',
        context: 'Confirming your order is complete.',
        yourResponse: 'はい',
        yourResponseRomaji: 'hai (yes)',
      },
      {
        id: 'r6',
        japanese: 'お{会計|かいけい}は{別々|べつべつ}ですか？',
        romaji: 'okaikei wa betsubetsu desu ka?',
        english: 'Separate checks?',
        context: 'Asking if you want to split the bill.',
        yourResponse: '{一緒|いっしょ}で',
        yourResponseRomaji: 'issho de (together)',
      },
    ],
  },
  {
    key: 'station',
    icon: '🚃',
    phrases: [
      {
        id: 's1',
        japanese: '{次|つぎ}は〇〇、〇〇です',
        romaji: 'tsugi wa ..., ... desu',
        english: 'Next stop is ___',
        context: 'The announcement before each stop. Listen for your station name.',
      },
      {
        id: 's2',
        japanese: 'ドアが{閉|し}まります。ご{注意|ちゅうい}ください',
        romaji: 'doa ga shimarimasu. go-chuui kudasai',
        english: 'The doors are closing. Please be careful.',
        context: "Don't try to rush in after this announcement!",
      },
      {
        id: 's3',
        japanese: 'この{電車|でんしゃ}は〇〇{行|い}きです',
        romaji: 'kono densha wa ... iki desu',
        english: 'This train is bound for ___',
        context: 'Tells you the final destination. Match it to your route map.',
      },
      {
        id: 's4',
        japanese: '〇〇{線|せん}はお{乗|の}り{換|か}えです',
        romaji: '... sen wa onorikae desu',
        english: 'Transfer here for the ___ line',
        context: 'Tells you this is where you switch to another line.',
      },
      {
        id: 's5',
        japanese: 'ICカードをタッチしてください',
        romaji: 'IC kaado wo tacchi shite kudasai',
        english: 'Please tap your IC card',
        context: 'At ticket gates — tap your Suica/Pasmo card on the reader.',
      },
    ],
  },
  {
    key: 'shop',
    icon: '🛍️',
    phrases: [
      {
        id: 'sh1',
        japanese: '{何|なに}かお{探|さが}しですか？',
        romaji: 'nanika osagashi desu ka?',
        english: 'Are you looking for something?',
        context: "Staff asking if you need help. It's OK to say you're just browsing.",
        yourResponse: '{見|み}ているだけです',
        yourResponseRomaji: 'mite iru dake desu (just looking)',
      },
      {
        id: 'sh2',
        japanese: 'サイズはいかがですか？',
        romaji: 'saizu wa ikaga desu ka?',
        english: 'What size would you like?',
        context: 'In clothing stores. Japanese sizes are different — S/M/L/LL are common.',
      },
      {
        id: 'sh3',
        japanese: 'お{試|ため}しになりますか？',
        romaji: 'otameshi ni narimasu ka?',
        english: 'Would you like to try it on?',
        context: "They're offering a fitting room.",
        yourResponse: 'はい、お願いします',
        yourResponseRomaji: 'hai, onegai shimasu (yes please)',
      },
      {
        id: 'sh4',
        japanese: '{免税|めんぜい}できます',
        romaji: 'menzei dekimasu',
        english: 'Tax-free is available',
        context: 'Purchases over ¥5,000 at one store qualify for tax-free (bring passport!).',
      },
      {
        id: 'sh5',
        japanese: 'お{包|つつ}みしますか？',
        romaji: 'otsutsumi shimasu ka?',
        english: 'Shall I gift-wrap it?',
        context: 'Japanese stores offer beautiful free gift wrapping.',
        yourResponse: 'はい、お願いします',
        yourResponseRomaji: 'hai, onegai shimasu (yes please)',
      },
    ],
  },
  {
    key: 'hotel',
    icon: '🏨',
    phrases: [
      {
        id: 'h1',
        japanese: 'チェックインですか？',
        romaji: 'chekkuin desu ka?',
        english: 'Are you checking in?',
        context: 'Front desk confirming what you need.',
        yourResponse: 'はい、チェックインお願いします',
        yourResponseRomaji: 'hai, chekkuin onegai shimasu',
      },
      {
        id: 'h2',
        japanese: 'パスポートを{見|み}せてください',
        romaji: 'pasupooto wo misete kudasai',
        english: 'Please show your passport',
        context: 'Required for all hotel check-ins in Japan (by law for foreign visitors).',
      },
      {
        id: 'h3',
        japanese: '{朝食|ちょうしょく}は7{時|じ}からです',
        romaji: 'choushoku wa shichi-ji kara desu',
        english: 'Breakfast starts at 7:00',
        context: "Listen for the number + 時 (ji = o'clock).",
      },
      {
        id: 'h4',
        japanese: 'Wi-Fiのパスワードはこちらです',
        romaji: 'waifai no pasuwaado wa kochira desu',
        english: "Here's the WiFi password",
        context: "They'll usually point to a card or paper with the password.",
      },
      {
        id: 'h5',
        japanese: 'チェックアウトは11{時|じ}です',
        romaji: 'chekkuauto wa juuichi-ji desu',
        english: 'Check-out is at 11:00',
        context: 'Standard check-out time. Some hotels allow late check-out for a fee.',
      },
    ],
  },
  {
    key: 'general',
    icon: '🇯🇵',
    phrases: [
      {
        id: 'g1',
        japanese: 'すみません',
        romaji: 'sumimasen',
        english: 'Excuse me / Sorry / Thank you',
        context: 'The Swiss Army knife of Japanese words. Used everywhere for everything polite.',
      },
      {
        id: 'g2',
        japanese: '{大丈夫|だいじょうぶ}ですか？',
        romaji: 'daijoubu desu ka?',
        english: 'Are you OK?',
        context: 'Someone checking on you — if you look lost or confused.',
        yourResponse: '{大丈夫|だいじょうぶ}です',
        yourResponseRomaji: "daijoubu desu (I'm fine)",
      },
      {
        id: 'g3',
        japanese: '{写真|しゃしん}{撮|と}りましょうか？',
        romaji: 'shashin torimashoo ka?',
        english: 'Shall I take a photo for you?',
        context: 'A kind stranger offering to photograph you. Japanese people are helpful!',
        yourResponse: 'お願いします！',
        yourResponseRomaji: 'onegai shimasu! (yes please!)',
      },
      {
        id: 'g4',
        japanese: '{日本語|にほんご}お{上手|じょうず}ですね',
        romaji: 'nihongo ojouzu desu ne',
        english: 'Your Japanese is good!',
        context:
          'Even if you only said one word — Japanese people encourage any effort. Smile and say thanks!',
        yourResponse: 'ありがとうございます',
        yourResponseRomaji: 'arigatou gozaimasu (thank you)',
      },
      {
        id: 'g5',
        japanese: '{英語|えいご}できますか？',
        romaji: 'eigo dekimasu ka?',
        english: 'Can you speak English?',
        context: 'You might hear this from someone trying to help you, or you can ask it yourself.',
      },
    ],
  },
];

export function WhatDidTheySay() {
  const t = useTranslations('Travel.whatDidTheySay');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('konbini');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [phrasesToSave, setPhrasesToSave] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);
  const [deckSaved, setDeckSaved] = useState(false);

  const visibleLocations = useMemo(
    () => (activeFilter === 'all' ? LOCATIONS : LOCATIONS.filter((l) => l.key === activeFilter)),
    [activeFilter],
  );

  const handleFilter = (key: string) => {
    setActiveFilter(key);
    setDeckSaved(false);
    if (key !== 'all') logTravelEvent('listening', 'start', { location: key });
  };

  const allVisiblePhrases = useMemo(
    () => visibleLocations.flatMap((l) => l.phrases),
    [visibleLocations],
  );

  const activeLocation =
    activeFilter !== 'all' ? LOCATIONS.find((l) => l.key === activeFilter) : null;

  return (
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title={t('heading')}
          subtitle={t('subheading')}
          onBack={() => router.push('/travel')}
          mb={0}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryAddIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                setDeckSaved(false);
                setPhrasesToSave(
                  allVisiblePhrases.map((p) => ({
                    japanese: p.japanese,
                    romaji: p.romaji,
                    english: p.english,
                  })),
                );
                setSaveDialogOpen(true);
              }}
              disabled={deckSaved}
              sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.72rem' }}
            >
              {deckSaved ? t('saved') : t('saveAll')}
            </Button>
          }
        />

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={t('all')}
            onClick={() => handleFilter('all')}
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            sx={{
              borderRadius: 2,
              fontWeight: activeFilter === 'all' ? 700 : 500,
              borderColor: alpha(brand[300], 0.4),
              ...(activeFilter === 'all' && {
                bgcolor: alpha(brand[500], 0.12),
                color: brand[700],
                borderColor: brand[400],
              }),
            }}
          />
          {LOCATIONS.map((loc) => (
            <Chip
              key={loc.key}
              label={`${loc.icon} ${t(`locations.${loc.key}.label`)}`}
              onClick={() => handleFilter(loc.key)}
              variant={activeFilter === loc.key ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: activeFilter === loc.key ? 700 : 500,
                borderColor: alpha(brand[300], 0.4),
                ...(activeFilter === loc.key && {
                  bgcolor: alpha(brand[500], 0.12),
                  color: brand[700],
                  borderColor: brand[400],
                }),
              }}
            />
          ))}
        </Box>

        {/* Phrases grouped by location */}
        {visibleLocations.map((loc) => (
          <Box key={loc.key}>
            {/* Section header (only when showing all) */}
            {activeFilter === 'all' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{loc.icon}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>
                  {t(`locations.${loc.key}.label`)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('phraseCount', { count: loc.phrases.length })}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.5,
              }}
            >
              {loc.phrases.map((phrase) => (
                <Box
                  key={phrase.id}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    bgcolor: 'background.paper',
                    border: `1px solid ${alpha(brand[300], 0.2)}`,
                    boxShadow: `0 1px 3px ${alpha(brand[400], 0.06)}`,
                  }}
                >
                  {/* What they say */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <TravelPhrase
                        japanese={phrase.japanese}
                        romaji={phrase.romaji}
                        primarySize="1.05rem"
                        secondarySize="0.78rem"
                      />
                    </Box>
                    <Tooltip title={t('listen')}>
                      <IconButton
                        size="small"
                        onClick={() => speak(stripFurigana(phrase.japanese))}
                        aria-label={t('listen')}
                        sx={{ p: 0.5 }}
                      >
                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('saveToDeck')}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setPhrasesToSave([
                            {
                              japanese: phrase.japanese,
                              romaji: phrase.romaji,
                              english: phrase.english,
                            },
                          ]);
                          setSaveDialogOpen(true);
                        }}
                        aria-label={t('saveToDeck')}
                        sx={{ p: 0.5 }}
                      >
                        <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.85rem', mb: 0.75 }}
                  >
                    {phrase.english}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', fontSize: '0.78rem', mb: 1, lineHeight: 1.5 }}
                  >
                    {phrase.context}
                  </Typography>

                  {/* Your response */}
                  {phrase.yourResponse && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: alpha(brand[50], 0.8),
                        border: `1px solid ${alpha(brand[200], 0.3)}`,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: brand[600],
                          letterSpacing: '0.04em',
                          fontSize: '0.6rem',
                        }}
                      >
                        {t('yourResponse')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Box sx={{ flex: 1 }}>
                          <TravelPhrase
                            japanese={phrase.yourResponse!}
                            romaji={phrase.yourResponseRomaji ?? ''}
                            primarySize="0.92rem"
                            secondarySize="0.72rem"
                          />
                        </Box>
                        <Tooltip title={t('listen')}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              speak(stripFurigana(phrase.yourResponse!.split(' / ')[0]))
                            }
                            aria-label={t('listenToResponse')}
                            sx={{ p: 0.5 }}
                          >
                            <VolumeUpIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>

      <AuthGatedSaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        phrases={phrasesToSave}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName={
          activeLocation
            ? `${activeLocation.icon} ${t(`locations.${activeLocation.key}.label`)} ${t('deckNameSuffix')}`
            : `👂 ${t('heading')}`
        }
      />
    </Box>
  );
}
