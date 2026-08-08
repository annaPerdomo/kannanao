'use client';
import { alpha, useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useTranslations } from 'next-intl';

import { GROUP_DASHBOARD_TABS, type GroupDashboardTab } from './constants';

interface TabBarProps {
  value: GroupDashboardTab;
  onChange: (tab: GroupDashboardTab) => void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  const t = useTranslations('Group.dashboardTabs');
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Tabs
      value={value}
      onChange={(_, next: GroupDashboardTab) => onChange(next)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{
        mb: 3,
        minHeight: 0,
        borderBottom: `1px solid ${alpha(brand[300], 0.4)}`,
        '& .MuiTab-root': {
          minHeight: 0,
          py: 1.25,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.88rem',
        },
      }}
    >
      {GROUP_DASHBOARD_TABS.map((key) => (
        <Tab key={key} value={key} label={t(key)} />
      ))}
    </Tabs>
  );
}
