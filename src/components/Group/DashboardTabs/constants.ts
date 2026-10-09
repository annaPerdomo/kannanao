export const GROUP_DASHBOARD_TABS = ['today', 'lessons', 'learners', 'words'] as const;

export type GroupDashboardTab = (typeof GROUP_DASHBOARD_TABS)[number];

export const DEFAULT_TAB: GroupDashboardTab = 'today';

export const LEGACY_TAB_ALIASES: Record<string, GroupDashboardTab> = {
  overview: 'today',
  activity: 'today',
  plan: 'lessons',
  assignments: 'lessons',
};

export function isGroupDashboardTab(value: string | null): value is GroupDashboardTab {
  return !!value && (GROUP_DASHBOARD_TABS as readonly string[]).includes(value);
}

export function resolveDashboardTab(value: string | null): GroupDashboardTab {
  if (isGroupDashboardTab(value)) return value;
  if (value && value in LEGACY_TAB_ALIASES) return LEGACY_TAB_ALIASES[value];
  return DEFAULT_TAB;
}
