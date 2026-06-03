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
  groups: { label: 'My Groups', emoji: '👥' },
  leaderboard: { label: 'Leaderboard', emoji: '🏆' },
  assignments: { label: 'Assignments', emoji: '📋' },
  decks: { label: 'Decks', emoji: '📚' },
  speeches: { label: 'Speech Practice', emoji: '✨' },
};

export function getSectionsForRole(
  isMember: boolean,
  groupShowLeaderboard = true,
): Set<SectionKey> {
  const keys = new Set<SectionKey>(['todo', 'decks', 'speeches']);
  if (isMember) {
    if (groupShowLeaderboard) keys.add('leaderboard');
    keys.add('assignments');
  } else {
    keys.add('groups');
  }
  return keys;
}

/** Default section display order */
export function getDefaultSectionOrder(isMember: boolean): SectionKey[] {
  if (isMember) return ['todo', 'leaderboard', 'assignments', 'decks', 'speeches'];
  return ['todo', 'groups', 'decks', 'speeches'];
}

/** Resolve visible section order from saved preferences */
export function resolveSectionOrder(
  sections: HomeSections,
  isMember: boolean,
  groupShowLeaderboard = true,
): SectionKey[] {
  const validKeys = getSectionsForRole(isMember, groupShowLeaderboard);
  const saved = sections.sectionOrder;
  const defaults = getDefaultSectionOrder(isMember);

  if (!saved || saved.length === 0) {
    return defaults.filter((k) => validKeys.has(k) && sections[k]);
  }

  const ordered = saved.filter((k) => validKeys.has(k) && sections[k]);
  const existing = new Set(saved);
  const missing = defaults.filter((k) => validKeys.has(k) && sections[k] && !existing.has(k));

  return [...ordered, ...missing];
}

/** Default grid layout — two-column dashboard */
export function getDefaultGridLayout(isMember: boolean): GridLayoutItem[] {
  if (isMember) {
    return [
      { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
      { i: 'leaderboard', x: 6, y: 0, w: 6, h: 7 },
      { i: 'assignments', x: 6, y: 7, w: 6, h: 5 },
      { i: 'decks', x: 6, y: 12, w: 6, h: 10 },
      { i: 'speeches', x: 0, y: 18, w: 6, h: 6 },
    ];
  }
  return [
    { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
    { i: 'groups', x: 6, y: 0, w: 6, h: 7 },
    { i: 'decks', x: 6, y: 7, w: 6, h: 10 },
    { i: 'speeches', x: 6, y: 17, w: 6, h: 6 },
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
export function resolveGridLayout(sections: HomeSections, isMember: boolean): GridLayoutItem[] {
  const saved = sections.gridLayout;
  const defaults = getDefaultGridLayout(isMember);

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
