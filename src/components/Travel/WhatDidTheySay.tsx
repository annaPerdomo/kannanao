'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { alpha, Box, Card, Container, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSpeech } from '@/hooks/useSpeech';

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
  label: string;
  icon: string;
  phrases: HeardPhrase[];
}

const LOCATIONS: Location[] = [
  {
    key: 'konbini',
    label: 'Convenience Store',
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
        japanese: 'ポイントカードはお持ちですか？',
        romaji: 'pointo kaado wa omochi desu ka?',
        english: 'Do you have a point card?',
        context: "They're asking about a loyalty card. You probably don't have one.",
        yourResponse: 'ないです',
        yourResponseRomaji: "nai desu (= I don't have one)",
      },
      {
        id: 'k3',
        japanese: '袋いりますか？',
        romaji: 'fukuro irimasu ka?',
        english: 'Do you need a bag?',
        context: "Plastic bags cost ¥3-5. They're asking if you want to buy one.",
        yourResponse: 'はい、お願いします / いいえ、大丈夫です',
        yourResponseRomaji: 'hai, onegai shimasu (yes please) / iie, daijoubu desu (no thanks)',
      },
      {
        id: 'k4',
        japanese: '温めますか？',
        romaji: 'atatamemasu ka?',
        english: 'Shall I heat it up?',
        context: "Asked when you buy a bento, onigiri, or nikuman. They'll microwave it for you.",
        yourResponse: 'はい、お願いします',
        yourResponseRomaji: 'hai, onegai shimasu (yes please)',
      },
      {
        id: 'k5',
        japanese: 'お箸つけますか？',
        romaji: 'ohashi tsukemasu ka?',
        english: 'Do you want chopsticks?',
        context: 'Asked with food purchases. They may also offer a spoon (スプーン).',
        yourResponse: 'はい / いいえ',
        yourResponseRomaji: 'hai (yes) / iie (no)',
      },
      {
        id: 'k6',
        japanese: '〇〇円になります',
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
        yourResponse: 'いいえ、大丈夫です',
        yourResponseRomaji: 'iie, daijoubu desu (no thanks)',
      },
    ],
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    icon: '🍜',
    phrases: [
      {
        id: 'r1',
        japanese: 'いらっしゃいませ！何名様ですか？',
        romaji: 'irasshaimase! nanmei-sama desu ka?',
        english: 'Welcome! How many people?',
        context: 'They need to know your party size for seating.',
        yourResponse: '一人 / 二人 / 三人',
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
        japanese: 'ご注文はお決まりですか？',
        romaji: 'go-chuumon wa okimari desu ka?',
        english: 'Are you ready to order?',
        context: 'If you need more time, say "mada desu" (not yet).',
        yourResponse: 'はい / まだです',
        yourResponseRomaji: 'hai (yes) / mada desu (not yet)',
      },
      {
        id: 'r4',
        japanese: 'お飲み物はいかがですか？',
        romaji: 'onomimono wa ikaga desu ka?',
        english: 'Would you like something to drink?',
        context: "They're asking about drinks, usually at the start.",
        yourResponse: '水をお願いします',
        yourResponseRomaji: 'mizu wo onegai shimasu (water please)',
      },
      {
        id: 'r5',
        japanese: '以上でよろしいですか？',
        romaji: 'ijou de yoroshii desu ka?',
        english: 'Will that be all?',
        context: 'Confirming your order is complete.',
        yourResponse: 'はい',
        yourResponseRomaji: 'hai (yes)',
      },
      {
        id: 'r6',
        japanese: 'お会計は別々ですか？',
        romaji: 'okaikei wa betsubetsu desu ka?',
        english: 'Separate checks?',
        context: 'Asking if you want to split the bill.',
        yourResponse: '一緒で',
        yourResponseRomaji: 'issho de (together)',
      },
    ],
  },
  {
    key: 'station',
    label: 'Train Station',
    icon: '🚃',
    phrases: [
      {
        id: 's1',
        japanese: '次は〇〇、〇〇です',
        romaji: 'tsugi wa ..., ... desu',
        english: 'Next stop is ___',
        context: 'The announcement before each stop. Listen for your station name.',
      },
      {
        id: 's2',
        japanese: 'ドアが閉まります。ご注意ください',
        romaji: 'doa ga shimarimasu. go-chuui kudasai',
        english: 'The doors are closing. Please be careful.',
        context: "Don't try to rush in after this announcement!",
      },
      {
        id: 's3',
        japanese: 'この電車は〇〇行きです',
        romaji: 'kono densha wa ... iki desu',
        english: 'This train is bound for ___',
        context: 'Tells you the final destination. Match it to your route map.',
      },
      {
        id: 's4',
        japanese: '〇〇線はお乗り換えです',
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
    label: 'Shops & Stores',
    icon: '🛍️',
    phrases: [
      {
        id: 'sh1',
        japanese: '何かお探しですか？',
        romaji: 'nanika osagashi desu ka?',
        english: 'Are you looking for something?',
        context: "Staff asking if you need help. It's OK to say you're just browsing.",
        yourResponse: '見ているだけです',
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
        japanese: 'お試しになりますか？',
        romaji: 'otameshi ni narimasu ka?',
        english: 'Would you like to try it on?',
        context: "They're offering a fitting room.",
        yourResponse: 'はい、お願いします',
        yourResponseRomaji: 'hai, onegai shimasu (yes please)',
      },
      {
        id: 'sh4',
        japanese: '免税できます',
        romaji: 'menzei dekimasu',
        english: 'Tax-free is available',
        context: 'Purchases over ¥5,000 at one store qualify for tax-free (bring passport!).',
      },
      {
        id: 'sh5',
        japanese: 'お包みしますか？',
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
    label: 'Hotel',
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
        japanese: 'パスポートを見せてください',
        romaji: 'pasupooto wo misete kudasai',
        english: 'Please show your passport',
        context: 'Required for all hotel check-ins in Japan (by law for foreign visitors).',
      },
      {
        id: 'h3',
        japanese: '朝食は7時からです',
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
        japanese: 'チェックアウトは11時です',
        romaji: 'chekkuauto wa juuichi-ji desu',
        english: 'Check-out is at 11:00',
        context: 'Standard check-out time. Some hotels allow late check-out for a fee.',
      },
    ],
  },
  {
    key: 'general',
    label: 'Everywhere',
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
        japanese: '大丈夫ですか？',
        romaji: 'daijoubu desu ka?',
        english: 'Are you OK?',
        context: 'Someone checking on you — if you look lost or confused.',
        yourResponse: '大丈夫です',
        yourResponseRomaji: "daijoubu desu (I'm fine)",
      },
      {
        id: 'g3',
        japanese: '写真撮りましょうか？',
        romaji: 'shashin torimashoo ka?',
        english: 'Shall I take a photo for you?',
        context: 'A kind stranger offering to photograph you. Japanese people are helpful!',
        yourResponse: 'お願いします！',
        yourResponseRomaji: 'onegai shimasu! (yes please!)',
      },
      {
        id: 'g4',
        japanese: '日本語お上手ですね',
        romaji: 'nihongo ojouzu desu ne',
        english: 'Your Japanese is good!',
        context:
          'Even if you only said one word — Japanese people encourage any effort. Smile and say thanks!',
        yourResponse: 'ありがとうございます',
        yourResponseRomaji: 'arigatou gozaimasu (thank you)',
      },
      {
        id: 'g5',
        japanese: '英語できますか？',
        romaji: 'eigo dekimasu ka?',
        english: 'Can you speak English?',
        context: 'You might hear this from someone trying to help you, or you can ask it yourself.',
      },
    ],
  },
];

export function WhatDidTheySay() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  const location = LOCATIONS.find((l) => l.key === activeLocation);

  // Location selection
  if (!activeLocation) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
            >
              What Did They Say?
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Common things Japanese people will say TO you — organized by where you are. Learn to
            recognize these so you&apos;re not caught off guard.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {LOCATIONS.map((loc) => (
              <Card
                key={loc.key}
                onClick={() => setActiveLocation(loc.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveLocation(loc.key);
                  }
                }}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `1px solid ${alpha(brand[300], 0.25)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha(brand[400], 0.12)}`,
                    borderColor: alpha(brand[400], 0.4),
                  },
                }}
              >
                <Typography sx={{ fontSize: '2rem', mb: 0.75 }}>{loc.icon}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {loc.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {loc.phrases.length} phrases
                </Typography>
              </Card>
            ))}
          </Box>
        </Stack>
      </Container>
    );
  }

  // Phrase list for selected location
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => setActiveLocation(null)} aria-label="Back to locations">
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: '1.3rem' }}>{location?.icon}</Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
          >
            {location?.label}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {location?.phrases.map((phrase) => (
            <Card
              key={phrase.id}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(brand[300], 0.3)}`,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ p: 2 }}>
                {/* What they say */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.jp,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      flex: 1,
                    }}
                  >
                    {phrase.japanese}
                  </Typography>
                  <Tooltip title="Listen">
                    <IconButton
                      size="small"
                      onClick={() => speak(phrase.japanese)}
                      aria-label="Listen"
                    >
                      <VolumeUpIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: brand[600], fontStyle: 'italic', mb: 0.5 }}
                >
                  {phrase.romaji}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                  {phrase.english}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {phrase.context}
                </Typography>

                {/* Your response */}
                {phrase.yourResponse && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(brand[100], 0.5),
                      border: `1px solid ${alpha(brand[200], 0.4)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: brand[600], letterSpacing: '0.05em' }}
                    >
                      YOUR RESPONSE
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.jp,
                          fontSize: '0.95rem',
                          color: 'text.primary',
                        }}
                      >
                        {phrase.yourResponse}
                      </Typography>
                      <Tooltip title="Listen">
                        <IconButton
                          size="small"
                          onClick={() => speak(phrase.yourResponse!.split(' / ')[0])}
                          aria-label="Listen to response"
                        >
                          <VolumeUpIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {phrase.yourResponseRomaji}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
