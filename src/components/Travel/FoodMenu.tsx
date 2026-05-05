'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { alpha, Box, Card, Container, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSpeech } from '@/hooks/useSpeech';

interface FoodItem {
  japanese: string;
  romaji: string;
  english: string;
  note?: string;
}

interface FoodCategory {
  key: string;
  label: string;
  icon: string;
  items: FoodItem[];
}

const FOOD_DATA: FoodCategory[] = [
  {
    key: 'ramen',
    label: 'Ramen Types',
    icon: '🍜',
    items: [
      {
        japanese: '醤油ラーメン',
        romaji: 'shouyu raamen',
        english: 'Soy sauce ramen',
        note: 'Clear brown broth, the classic Tokyo style',
      },
      {
        japanese: '味噌ラーメン',
        romaji: 'miso raamen',
        english: 'Miso ramen',
        note: 'Rich, savory fermented soybean broth. Hokkaido specialty',
      },
      {
        japanese: '豚骨ラーメン',
        romaji: 'tonkotsu raamen',
        english: 'Pork bone ramen',
        note: 'Creamy white broth, Fukuoka/Hakata style',
      },
      {
        japanese: '塩ラーメン',
        romaji: 'shio raamen',
        english: 'Salt ramen',
        note: 'Light, clear broth. Mildest flavor',
      },
      {
        japanese: 'つけ麺',
        romaji: 'tsukemen',
        english: 'Dipping noodles',
        note: 'Cold noodles you dip into hot broth. Great in summer',
      },
      {
        japanese: '替え玉',
        romaji: 'kaedama',
        english: 'Extra noodles',
        note: 'A noodle refill (common at tonkotsu shops). Usually ¥100-200',
      },
      {
        japanese: '大盛り',
        romaji: 'oomori',
        english: 'Large serving',
        note: 'More noodles. Say this when ordering for bigger portions',
      },
    ],
  },
  {
    key: 'sushi',
    label: 'Sushi & Fish',
    icon: '🍣',
    items: [
      { japanese: 'まぐろ', romaji: 'maguro', english: 'Tuna' },
      {
        japanese: 'サーモン',
        romaji: 'saamon',
        english: 'Salmon',
        note: 'Most popular with tourists',
      },
      { japanese: 'えび', romaji: 'ebi', english: 'Shrimp' },
      { japanese: 'いか', romaji: 'ika', english: 'Squid' },
      { japanese: 'たまご', romaji: 'tamago', english: 'Egg (sweet omelet on rice)' },
      {
        japanese: 'いくら',
        romaji: 'ikura',
        english: 'Salmon roe',
        note: 'Orange fish eggs, salty-sweet',
      },
      {
        japanese: 'うに',
        romaji: 'uni',
        english: 'Sea urchin',
        note: 'Creamy, rich. An acquired taste',
      },
      { japanese: '鉄火巻', romaji: 'tekkamaki', english: 'Tuna roll' },
      {
        japanese: 'かっぱ巻',
        romaji: 'kappamaki',
        english: 'Cucumber roll',
        note: 'Safe vegetarian option',
      },
    ],
  },
  {
    key: 'common',
    label: 'Common Dishes',
    icon: '🍱',
    items: [
      {
        japanese: 'カレーライス',
        romaji: 'karee raisu',
        english: 'Curry rice',
        note: 'Japanese curry — mild, sweet, thick. A comfort food staple',
      },
      {
        japanese: '牛丼',
        romaji: 'gyuudon',
        english: 'Beef bowl',
        note: 'Sliced beef on rice. Cheap & filling (Yoshinoya, Matsuya)',
      },
      {
        japanese: 'カツ丼',
        romaji: 'katsudon',
        english: 'Pork cutlet on rice',
        note: 'Breaded pork with egg on rice',
      },
      {
        japanese: '親子丼',
        romaji: 'oyakodon',
        english: 'Chicken & egg on rice',
        note: '"Parent and child" bowl — chicken and egg',
      },
      {
        japanese: 'うどん',
        romaji: 'udon',
        english: 'Thick wheat noodles',
        note: 'Served hot in broth or cold with dipping sauce',
      },
      {
        japanese: 'そば',
        romaji: 'soba',
        english: 'Buckwheat noodles',
        note: 'Thin brown noodles. Hot or cold',
      },
      {
        japanese: '焼肉',
        romaji: 'yakiniku',
        english: 'Grilled meat',
        note: 'You grill it yourself at the table',
      },
      {
        japanese: 'お好み焼き',
        romaji: 'okonomiyaki',
        english: 'Savory pancake',
        note: 'Osaka specialty — cabbage, meat, topped with sauce',
      },
      {
        japanese: 'たこ焼き',
        romaji: 'takoyaki',
        english: 'Octopus balls',
        note: 'Round fried balls with octopus inside. Street food classic',
      },
      {
        japanese: '天ぷら',
        romaji: 'tempura',
        english: 'Tempura (battered fried items)',
        note: 'Shrimp, vegetables, or fish in light crispy batter',
      },
    ],
  },
  {
    key: 'drinks',
    label: 'Drinks',
    icon: '🍵',
    items: [
      {
        japanese: '水',
        romaji: 'mizu',
        english: 'Water',
        note: 'Free at restaurants. Tap water is safe everywhere in Japan',
      },
      {
        japanese: 'お茶',
        romaji: 'ocha',
        english: 'Green tea',
        note: 'Often free at restaurants. On vending machines too',
      },
      {
        japanese: 'ビール',
        romaji: 'biiru',
        english: 'Beer',
        note: 'Asahi, Kirin, Sapporo, Suntory are the big brands',
      },
      {
        japanese: '日本酒',
        romaji: 'nihonshu',
        english: 'Sake (rice wine)',
        note: 'Can be served hot or cold',
      },
      {
        japanese: 'コーヒー',
        romaji: 'koohii',
        english: 'Coffee',
        note: 'Vending machines have hot & cold cans!',
      },
      { japanese: 'コーラ', romaji: 'koora', english: 'Cola' },
      {
        japanese: '抹茶ラテ',
        romaji: 'matcha rate',
        english: 'Matcha latte',
        note: 'Available at every Starbucks & convenience store',
      },
    ],
  },
  {
    key: 'konbini',
    label: 'Konbini Food',
    icon: '🏪',
    items: [
      {
        japanese: 'おにぎり',
        romaji: 'onigiri',
        english: 'Rice ball',
        note: 'Triangle-shaped, wrapped in seaweed. ¥100-200. Many flavors',
      },
      {
        japanese: '弁当',
        romaji: 'bentou',
        english: 'Lunch box (bento)',
        note: 'Full meal in a box. ¥400-700. Staff will heat it for you',
      },
      {
        japanese: 'サンドイッチ',
        romaji: 'sandoicchi',
        english: 'Sandwich',
        note: 'Japanese sandwiches are soft, crustless, and surprisingly good',
      },
      {
        japanese: '肉まん',
        romaji: 'nikuman',
        english: 'Steamed meat bun',
        note: 'Near the register in a heated case. Perfect winter snack',
      },
      {
        japanese: 'からあげ',
        romaji: 'karaage',
        english: 'Fried chicken',
        note: 'Japanese fried chicken — usually near the hot food counter',
      },
      {
        japanese: 'プリン',
        romaji: 'purin',
        english: 'Pudding/flan',
        note: 'Caramel custard. Japanese dessert staple',
      },
    ],
  },
  {
    key: 'ordering',
    label: 'Ordering Words',
    icon: '📝',
    items: [
      {
        japanese: 'これください',
        romaji: 'kore kudasai',
        english: 'This one, please',
        note: 'Point at what you want + say this. Works everywhere!',
      },
      {
        japanese: 'おすすめは？',
        romaji: 'osusume wa?',
        english: 'What do you recommend?',
        note: "Great when you can't decide",
      },
      { japanese: 'メニュー', romaji: 'menyuu', english: 'Menu' },
      {
        japanese: 'お会計',
        romaji: 'okaikei',
        english: 'The check/bill',
        note: 'Or just make an X with your fingers in the air',
      },
      { japanese: '持ち帰り', romaji: 'mochikaeri', english: 'To go / takeout' },
      {
        japanese: '店内',
        romaji: 'tennai',
        english: 'Eating here (dine in)',
        note: "At konbini or fast food — they'll ask mochikaeri or tennai",
      },
      { japanese: 'アレルギー', romaji: 'arerugii', english: 'Allergy' },
      { japanese: '辛い', romaji: 'karai', english: 'Spicy' },
      { japanese: '甘い', romaji: 'amai', english: 'Sweet' },
    ],
  },
];

export function FoodMenu() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const category = FOOD_DATA.find((c) => c.key === activeCategory);

  if (!activeCategory) {
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
              Food Menu Cheat Sheet
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            You&apos;ll eat 3 meals a day for your whole trip. Here&apos;s what&apos;s on the menu —
            literally.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {FOOD_DATA.map((cat) => (
              <Card
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveCategory(cat.key);
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
                <Typography sx={{ fontSize: '2rem', mb: 0.75 }}>{cat.icon}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {cat.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {cat.items.length} items
                </Typography>
              </Card>
            ))}
          </Box>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => setActiveCategory(null)} aria-label="Back to categories">
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: '1.3rem' }}>{category?.icon}</Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
          >
            {category?.label}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          {category?.items.map((item, i) => (
            <Card
              key={i}
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${alpha(brand[300], 0.25)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.jp,
                        fontSize: '1.05rem',
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                    >
                      {item.japanese}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand[600] }}>
                      {item.romaji}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {item.english}
                  </Typography>
                  {item.note && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                    >
                      {item.note}
                    </Typography>
                  )}
                </Box>
                <Tooltip title="Listen">
                  <IconButton size="small" onClick={() => speak(item.japanese)} aria-label="Listen">
                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
