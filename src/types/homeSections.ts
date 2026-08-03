export type SectionKey = 'todo' | 'groups' | 'leaderboard' | 'assignments' | 'decks' | 'speeches';

export interface GridLayoutItem {
  i: string; // SectionKey
  x: number;
  y: number;
  w: number; // columns out of 12
  h: number; // row units
}

export interface HomeSections {
  todo: boolean;
  groups: boolean;
  leaderboard: boolean;
  assignments: boolean;
  decks: boolean;
  speeches: boolean;
  gridLayout?: GridLayoutItem[];
  // Legacy fields (kept for backward compat during migration)
  sectionOrder?: SectionKey[];
  sectionWidths?: Partial<Record<SectionKey, string>>;
}

export const ALL_SECTION_KEYS: SectionKey[] = [
  'todo',
  'groups',
  'leaderboard',
  'assignments',
  'decks',
  'speeches',
];

export interface SectionMeta {
  label: string;
  emoji: string;
}

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  todo: { label: 'To-Do List', emoji: '✅' },
  groups: { label: 'Pinned Groups', emoji: '👥' },
  leaderboard: { label: 'Leaderboard', emoji: '🏆' },
  assignments: { label: 'Assignments', emoji: '📋' },
  // "Pinned" is load-bearing: the home versions of these sections only ever show
  // pinned items, and the label is what tells you why a deck or group you own
  // isn't here. The empty states point at the pin icon to match.
  decks: { label: 'Pinned Decks', emoji: '📚' },
  speeches: { label: 'Pinned Speeches', emoji: '🎤' },
};

/**
 * Kept apart because they are not opposites: learning in someone's group earns
 * the leaderboard and assignments, being entitled to run groups earns the
 * groups section, and an account can have both.
 */
export interface HomeRole {
  isInGroup: boolean;
  canRunGroups: boolean;
}

export function getSectionsForRole(role: HomeRole, groupShowLeaderboard = true): Set<SectionKey> {
  const keys = new Set<SectionKey>(['todo', 'decks', 'speeches']);
  if (role.isInGroup) {
    if (groupShowLeaderboard) keys.add('leaderboard');
    keys.add('assignments');
  }
  if (role.canRunGroups) keys.add('groups');
  return keys;
}

/** Default section display order */
export function getDefaultSectionOrder(role: HomeRole): SectionKey[] {
  const order: SectionKey[] = ['todo'];
  if (role.isInGroup) order.push('leaderboard', 'assignments');
  if (role.canRunGroups) order.push('groups');
  order.push('decks', 'speeches');
  return order;
}

/** Resolve visible section order from saved preferences */
export function resolveSectionOrder(
  sections: HomeSections,
  role: HomeRole,
  groupShowLeaderboard = true,
): SectionKey[] {
  const validKeys = getSectionsForRole(role, groupShowLeaderboard);
  const saved = sections.sectionOrder;
  const defaults = getDefaultSectionOrder(role);

  if (!saved || saved.length === 0) {
    return defaults.filter((k) => validKeys.has(k) && sections[k]);
  }

  const ordered = saved.filter((k) => validKeys.has(k) && sections[k]);
  const existing = new Set(saved);
  const missing = defaults.filter((k) => validKeys.has(k) && sections[k] && !existing.has(k));

  return [...ordered, ...missing];
}

/**
 * Default grid layout — two-column dashboard.
 *
 * Heights are in grid units of 30px plus a 16px gutter, so a section of height
 * `h` is `46h - 16` pixels tall — set just above what each section's content
 * actually measures.
 *
 * Only new dashboards get these. A saved `gridLayout` always wins, so anyone who
 * has dragged their sections keeps the sizes they chose until they hit Reset layout.
 */
export function getDefaultGridLayout(role: HomeRole): GridLayoutItem[] {
  // The two single-role layouts are spelled out rather than generated: they are
  // what existing dashboards that never saved a layout already render, and
  // regenerating them would shuffle tiles for people who changed nothing.
  if (role.isInGroup && !role.canRunGroups) {
    return [
      { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
      { i: 'leaderboard', x: 6, y: 0, w: 6, h: 7 },
      { i: 'assignments', x: 6, y: 7, w: 6, h: 5 },
      { i: 'decks', x: 6, y: 12, w: 6, h: 7 },
      { i: 'speeches', x: 0, y: 18, w: 6, h: 5 },
    ];
  }
  if (!role.isInGroup) {
    return [
      { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
      { i: 'groups', x: 6, y: 0, w: 6, h: 6 },
      { i: 'decks', x: 6, y: 6, w: 6, h: 7 },
      { i: 'speeches', x: 6, y: 13, w: 6, h: 5 },
    ];
  }
  // Runs a group and learns in one: the learner sections first, then groups.
  return [
    { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
    { i: 'leaderboard', x: 6, y: 0, w: 6, h: 7 },
    { i: 'assignments', x: 6, y: 7, w: 6, h: 5 },
    { i: 'groups', x: 6, y: 12, w: 6, h: 6 },
    { i: 'decks', x: 6, y: 18, w: 6, h: 7 },
    { i: 'speeches', x: 0, y: 18, w: 6, h: 5 },
  ];
}

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  todo: true,
  groups: true,
  leaderboard: true,
  assignments: true,
  decks: true,
  speeches: true,
};

/** Ensure all visible section keys have a layout entry */
export function resolveGridLayout(sections: HomeSections, role: HomeRole): GridLayoutItem[] {
  const saved = sections.gridLayout;
  const defaults = getDefaultGridLayout(role);

  if (!saved || saved.length === 0) return defaults;

  // Add any missing sections (new features added since user last saved)
  const existing = new Set(saved.map((l) => l.i));
  const maxY = Math.max(...saved.map((l) => l.y + l.h), 0);
  const missing = defaults
    .filter((d) => !existing.has(d.i))
    .map((d, idx) => ({ ...d, y: maxY + idx * d.h, x: 0 }));

  return [...saved, ...missing];
}

/** Merge a partial DB value with defaults, respecting legacy showTodo */
export function resolveHomeSections(
  raw: Partial<HomeSections> | null | undefined,
  legacyShowTodo?: boolean,
): HomeSections {
  const sections: HomeSections = { ...DEFAULT_HOME_SECTIONS, ...raw };
  if (raw && !('todo' in raw) && legacyShowTodo !== undefined) {
    sections.todo = legacyShowTodo;
  }
  if (!raw && legacyShowTodo !== undefined) {
    sections.todo = legacyShowTodo;
  }
  return sections;
}
