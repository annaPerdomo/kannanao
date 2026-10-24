import { DEMO_USERNAME_PREFIX } from './identity';

export interface DemoDay {
  /** >= 1: how many days before `now` this study day happened. */
  daysAgo: number;
  /** Card ids answered wrong first, before any retry. */
  misses: string[];
}

export interface DemoPersona {
  key: string;
  username: string;
  displayName: string;
  featured: boolean;
  history: DemoDay[];
}

const persona = (
  key: string,
  displayName: string,
  featured: boolean,
  history: DemoDay[],
): DemoPersona => ({
  key,
  username: `${DEMO_USERNAME_PREFIX}${key}`,
  displayName,
  featured,
  history,
});

const MON = 'demo-card-getsuyoubi';
const TUE = 'demo-card-kayoubi';
const WED = 'demo-card-suiyoubi';
const THU = 'demo-card-mokuyoubi';
const FRI = 'demo-card-kinyoubi';
const SAT = 'demo-card-doyoubi';
const SUN = 'demo-card-nichiyoubi';
const TODAY_W = 'demo-card-kyou';
const TOMORROW_W = 'demo-card-ashita';
const YESTERDAY_W = 'demo-card-kinou';
const OCLOCK = 'demo-card-ji';
const MINUTES = 'demo-card-fun';
const WEEKEND = 'demo-card-shuumatsu';

const mayaHistory: DemoDay[] = Array.from({ length: 14 }, (_, i) => i + 1)
  .filter((daysAgo) => daysAgo !== 6 && daysAgo !== 13)
  .map((daysAgo) => ({ daysAgo, misses: [MON, TUE, SAT, SUN] }));

const kenHistory: DemoDay[] = Array.from({ length: 9 }, (_, i) => i + 6).map((daysAgo) => ({
  daysAgo,
  misses: daysAgo % 4 === 0 ? [THU] : [],
}));

const soraHistory: DemoDay[] = [];

const hanaHistory: DemoDay[] = Array.from({ length: 14 }, (_, i) => i + 1)
  .filter((daysAgo) => daysAgo !== 9)
  .map((daysAgo) => ({ daysAgo, misses: daysAgo === 11 ? [FRI] : [] }));

const leoHistory: DemoDay[] = [
  { daysAgo: 13, misses: [MON, TUE, OCLOCK, WED] },
  { daysAgo: 11, misses: [MON, TUE, OCLOCK, MINUTES, WEEKEND] },
  { daysAgo: 9, misses: [MON, TUE, OCLOCK, THU, FRI] },
  { daysAgo: 7, misses: [MON, TUE, OCLOCK, SAT, SUN] },
  { daysAgo: 5, misses: [MON, TUE, OCLOCK, WED, THU, FRI] },
  { daysAgo: 3, misses: [MON, TUE, OCLOCK, SAT, SUN, MINUTES, WEEKEND] },
  { daysAgo: 1, misses: [MON, TUE, OCLOCK, WED, THU, FRI, SAT, SUN] },
];

const rinHistory: DemoDay[] = [1, 2, 3, 4, 5, 6].map((daysAgo) => ({
  daysAgo,
  misses: daysAgo === 3 ? [TODAY_W] : daysAgo === 5 ? [TOMORROW_W, YESTERDAY_W] : [],
}));

export const DEMO_PERSONAS: DemoPersona[] = [
  persona('maya', 'Maya', true, mayaHistory),
  persona('ken', 'Ken', true, kenHistory),
  persona('sora', 'Sora', true, soraHistory),
  persona('hana', 'Hana', false, hanaHistory),
  persona('leo', 'Leo', false, leoHistory),
  persona('rin', 'Rin', false, rinHistory),
];
