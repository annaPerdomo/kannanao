'use client';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import Shop from '@/pages/Shop';
import Stats from '@/pages/Stats';
import { LAYOUT } from '@/theme';

type MeTab = 'progress' | 'shop';

export function MePage() {
  const t = useTranslations('Me');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: MeTab = searchParams?.get('tab') === 'shop' ? 'shop' : 'progress';

  return (
    <Box>
      <Box
        sx={{
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          pt: { xs: 1.5, sm: 2 },
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, next: MeTab) =>
            router.replace(next === 'shop' ? '/me?tab=shop' : '/me', { scroll: false })
          }
          variant="fullWidth"
          aria-label={t('tabsAria')}
          sx={{
            '& .MuiTab-root': { fontWeight: 800, fontSize: '1rem', textTransform: 'none' },
          }}
        >
          <Tab value="progress" label={`📈 ${t('progress')}`} />
          <Tab value="shop" label={`🎁 ${t('shop')}`} />
        </Tabs>
      </Box>
      {tab === 'progress' ? <Stats embedded /> : <Shop embedded />}
    </Box>
  );
}
