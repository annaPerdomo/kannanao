export const GROUP_DASHBOARD_TABS = [
  'overview',
  'learners',
  'assignments',
  'words',
  'activity',
] as const;

export type GroupDashboardTab = (typeof GROUP_DASHBOARD_TABS)[number];

export function isGroupDashboardTab(value: string | null): value is GroupDashboardTab {
  return !!value && (GROUP_DASHBOARD_TABS as readonly string[]).includes(value);
}
