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

interface FoodItem {
  japanese: string;
  romaji: string;
  english: string;
  note?: string;
}

interface FoodCategory {
  key: string;
  icon: string;
  items: FoodItem[];
}

const FOOD_DATA: FoodCategory[] = [
  {
    key: 'ramen',
    icon: '🍜',
    items: [
      {
        japanese: '{醤油|しょうゆ}ラーメン',
        romaji: 'shouyu raamen',
        english: 'Soy sauce ramen',
        note: 'Clear brown broth, the classic Tokyo style',
      },
      {
        japanese: '{味噌|みそ}ラーメン',
        romaji: 'miso raamen',
        english: 'Miso ramen',
        note: 'Rich, savory fermented soybean broth. Hokkaido specialty',
      },
      {
        japanese: '{豚骨|とんこつ}ラーメン',
        romaji: 'tonkotsu raamen',
        english: 'Pork bone ramen',
        note: 'Creamy white broth, Fukuoka/Hakata style',
      },
      {
        japanese: '{塩|しお}ラーメン',
        romaji: 'shio raamen',
        english: 'Salt ramen',
        note: 'Light, clear broth. Mildest flavor',
      },
      {
        japanese: 'つけ{麺|めん}',
        romaji: 'tsukemen',
        english: 'Dipping noodles',
        note: 'Cold noodles you dip into hot broth. Great in summer',
      },
      {
        japanese: '{替|か}え{玉|たま}',
        romaji: 'kaedama',
        english: 'Extra noodles',
        note: 'A noodle refill (common at tonkotsu shops). Usually ¥100-200',
      },
      {
        japanese: '{大盛|おおも}り',
        romaji: 'oomori',
        english: 'Large serving',
        note: 'More noodles. Say this when ordering for bigger portions',
      },
    ],
  },
  {
    key: 'sushi',
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
      { japanese: '{鉄火巻|てっかまき}', romaji: 'tekkamaki', english: 'Tuna roll' },
      {
        japanese: 'かっぱ{巻|まき}',
        romaji: 'kappamaki',
        english: 'Cucumber roll',
        note: 'Safe vegetarian option',
      },
    ],
  },
  {
    key: 'common',
    icon: '🍱',
    items: [
      {
        japanese: 'カレーライス',
        romaji: 'karee raisu',
        english: 'Curry rice',
        note: 'Japanese curry — mild, sweet, thick. A comfort food staple',
      },
      {
        japanese: '{牛丼|ぎゅうどん}',
        romaji: 'gyuudon',
        english: 'Beef bowl',
        note: 'Sliced beef on rice. Cheap & filling (Yoshinoya, Matsuya)',
      },
      {
        japanese: 'カツ{丼|どん}',
        romaji: 'katsudon',
        english: 'Pork cutlet on rice',
        note: 'Breaded pork with egg on rice',
      },
      {
        japanese: '{親子丼|おやこどん}',
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
        japanese: '{焼肉|やきにく}',
        romaji: 'yakiniku',
        english: 'Grilled meat',
        note: 'You grill it yourself at the table',
      },
      {
        japanese: 'お{好|この}み{焼|や}き',
        romaji: 'okonomiyaki',
        english: 'Savory pancake',
        note: 'Osaka specialty — cabbage, meat, topped with sauce',
      },
      {
        japanese: 'たこ{焼|や}き',
        romaji: 'takoyaki',
        english: 'Octopus balls',
        note: 'Round fried balls with octopus inside. Street food classic',
      },
      {
        japanese: '{天|てん}ぷら',
        romaji: 'tempura',
        english: 'Tempura (battered fried items)',
        note: 'Shrimp, vegetables, or fish in light crispy batter',
      },
    ],
  },
  {
    key: 'drinks',
    icon: '🍵',
    items: [
      {
        japanese: '{水|みず}',
        romaji: 'mizu',
        english: 'Water',
        note: 'Free at restaurants. Tap water is safe everywhere in Japan',
      },
      {
        japanese: 'お{茶|ちゃ}',
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
        japanese: '{日本酒|にほんしゅ}',
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
        japanese: '{抹茶|まっちゃ}ラテ',
        romaji: 'matcha rate',
        english: 'Matcha latte',
        note: 'Available at every Starbucks & convenience store',
      },
    ],
  },
  {
    key: 'konbini',
    icon: '🏪',
    items: [
      {
        japanese: 'おにぎり',
        romaji: 'onigiri',
        english: 'Rice ball',
        note: 'Triangle-shaped, wrapped in seaweed. ¥100-200. Many flavors',
      },
      {
        japanese: '{弁当|べんとう}',
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
        japanese: '{肉|にく}まん',
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
        japanese: 'お{会計|かいけい}',
        romaji: 'okaikei',
        english: 'The check/bill',
        note: 'Or just make an X with your fingers in the air',
      },
      { japanese: '{持|も}ち{帰|かえ}り', romaji: 'mochikaeri', english: 'To go / takeout' },
      {
        japanese: '{店内|てんない}',
        romaji: 'tennai',
        english: 'Eating here (dine in)',
        note: "At konbini or fast food — they'll ask mochikaeri or tennai",
      },
      { japanese: 'アレルギー', romaji: 'arerugii', english: 'Allergy' },
      { japanese: '{辛|から}い', romaji: 'karai', english: 'Spicy' },
      { japanese: '{甘|あま}い', romaji: 'amai', english: 'Sweet' },
    ],
  },
];

export function FoodMenu() {
  const t = useTranslations('Travel.foodMenu');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('ramen');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [phrasesToSave, setPhrasesToSave] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);
  const [deckSaved, setDeckSaved] = useState(false);

  const visibleCategories = useMemo(
    () => (activeFilter === 'all' ? FOOD_DATA : FOOD_DATA.filter((c) => c.key === activeFilter)),
    [activeFilter],
  );

  const handleFilter = (key: string) => {
    setActiveFilter(key);
    setDeckSaved(false);
    if (key !== 'all') logTravelEvent('food_menu', 'browse', { category: key });
  };

  const allVisibleItems = useMemo(
    () => visibleCategories.flatMap((c) => c.items),
    [visibleCategories],
  );

  const activeCategory =
    activeFilter !== 'all' ? FOOD_DATA.find((c) => c.key === activeFilter) : null;

  return (
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
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
                  allVisibleItems.map((item) => ({
                    japanese: item.japanese,
                    romaji: item.romaji,
                    english: item.english,
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
            label={t('allFilter')}
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
          {FOOD_DATA.map((cat) => (
            <Chip
              key={cat.key}
              label={`${cat.icon} ${t(`categories.${cat.key}`)}`}
              onClick={() => handleFilter(cat.key)}
              variant={activeFilter === cat.key ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: activeFilter === cat.key ? 700 : 500,
                borderColor: alpha(brand[300], 0.4),
                ...(activeFilter === cat.key && {
                  bgcolor: alpha(brand[500], 0.12),
                  color: brand[700],
                  borderColor: brand[400],
                }),
              }}
            />
          ))}
        </Box>

        {/* Food items grouped by category */}
        {visibleCategories.map((cat) => (
          <Box key={cat.key}>
            {/* Section header (only when showing all) */}
            {activeFilter === 'all' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{cat.icon}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary' }}>
                  {t(`categories.${cat.key}`)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('itemsCount', { count: cat.items.length })}
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
              {cat.items.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.75,
                    borderRadius: '12px',
                    bgcolor: 'background.paper',
                    border: `1px solid ${alpha(brand[300], 0.15)}`,
                    boxShadow: `0 1px 2px ${alpha(brand[400], 0.05)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <TravelPhrase japanese={item.japanese} romaji={item.romaji} layout="row" />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.84rem' }}
                      >
                        {item.english}
                      </Typography>
                      {item.note && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            mt: 0.25,
                            fontSize: '0.72rem',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.note}
                        </Typography>
                      )}
                    </Box>
                    <Stack spacing={0.25}>
                      <Tooltip title={t('listen')}>
                        <IconButton
                          size="small"
                          onClick={() => speak(stripFurigana(item.japanese))}
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
                                japanese: item.japanese,
                                romaji: item.romaji,
                                english: item.english,
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
                    </Stack>
                  </Box>
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
          activeCategory
            ? `${activeCategory.icon} ${t(`categories.${activeCategory.key}`)}`
            : `🍱 ${t('defaultDeckName')}`
        }
      />
    </Box>
  );
}
