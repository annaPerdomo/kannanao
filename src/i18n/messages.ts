import deepmerge from 'deepmerge';

import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

import { DEFAULT_LOCALE, type Locale } from './config';

export type Messages = typeof en;

/**
 * Message resolution, kept free of any server-only import (no `next/headers`).
 *
 * src/i18n/request.ts reads the locale cookie and calls this per request. The
 * landing pages call it at BUILD time with a hardcoded locale — importing
 * `cookies()` transitively from here would opt them out of static prerendering,
 * which is the one thing that must not happen. Keep this module cookie-free.
 *
 * English is the source of truth for keys. Merging the locale's messages on top
 * of it means any key that hasn't been translated yet renders its English copy
 * instead of throwing — which is what lets us ship extraction (which lands
 * first) ahead of translation.
 */
// Both JSON trees are build-time constants, so the merge result is too — cache
// it per locale instead of re-merging two ~100KB trees on every request (per-
// request CPU is the scarce resource on the Hobby tier). Callers must treat the
// returned tree as read-only, which they already do.
const mergedCache = new Map<Locale, Messages>();

export function messagesFor(locale: Locale): Messages {
  if (locale === DEFAULT_LOCALE) return en;
  const cached = mergedCache.get(locale);
  if (cached) return cached;
  const merged = deepmerge<Messages>(en, ja as Partial<Messages>, {
    // deepmerge CONCATENATES arrays by default, which is wrong for every
    // array we keep in messages (Landing.seo.featureList, the FAQ list,
    // Shop.buddies.*.homePhrases…): a translated 9-item list would merge
    // into 18 items, English first. A locale's array replaces English
    // wholesale; omitting it still falls back, since the key is absent.
    arrayMerge: (_english, translated) => translated,
  });
  mergedCache.set(locale, merged);
  return merged;
}

/**
 * The top-level namespaces the landing tree can actually reach, and the only
 * ones serialized into its HTML.
 *
 * The landing renders far more than its own copy: AppShell's providers and
 * NavBar all call useTranslations, and a namespace absent at render time
 * renders its key path as visible text. So this is not "Landing + Common" — it
 * is every namespace reachable from <StaticIntlProvider> down, including ones
 * only a click away (the user menu, the sign-in dialog), ones pulled in by a
 * dialog that mounts unconditionally (DeckDialogContext always renders
 * <CreateDeckDialog>, which is why `Deck` is here despite nothing on the
 * landing linking to it), and `Study`, which the hero's demo <Flashcard> needs.
 *
 * A new namespace anywhere under AppShell has to be added here too — and since
 * a miss degrades the page instead of failing the build, the list is pinned to
 * the landing's actual import graph by messages.test.ts. The payoff for that
 * bookkeeping: the landing carries its own copy (~42KB) instead of the whole
 * app's (~88KB), twice over — once in the prerendered HTML, once in the JS.
 */
export const LANDING_NAMESPACES = [
  'Auth',
  'Common',
  'Deck',
  'Home',
  'Landing',
  'Messages',
  'Nav',
  'Review',
  'Shop',
  'Study',
] as const satisfies readonly (keyof Messages)[];

type LandingNamespace = (typeof LANDING_NAMESPACES)[number];

type LandingBuddies = {
  [K in keyof Messages['Shop']['buddies']]: Omit<Messages['Shop']['buddies'][K], 'friendship'>;
};

export type LandingMessages = Omit<Pick<Messages, LandingNamespace>, 'Landing' | 'Shop'> & {
  Landing: Omit<Messages['Landing'], 'seo'>;
  Shop: Omit<Messages['Shop'], 'buddies'> & { buddies: LandingBuddies };
};

export function landingMessagesFor(locale: Locale): LandingMessages {
  const messages = messagesFor(locale);
  const picked = Object.fromEntries(LANDING_NAMESPACES.map((ns) => [ns, messages[ns]])) as Pick<
    Messages,
    LandingNamespace
  >;

  // Landing.seo is the JSON-LD copy, and only LandingContent reads it — a
  // Server Component, at build time, via landingSeoFor(). It never reaches a
  // useTranslations call, so shipping it to the browser would send the same
  // ~4KB twice: once in the <script type="application/ld+json"> it renders
  // into, once in the provider's messages.
  const { seo: _seo, ...landing } = picked.Landing;

  // Nothing on the landing renders friendship copy — GlobalBuddy gates the buddy
  // tree on `session`, seeded null here — and HomeBuddy reads it via a guarded raw().
  const buddies = Object.fromEntries(
    Object.entries(picked.Shop.buddies as Record<string, Record<string, unknown>>).map(
      ([key, buddy]) => {
        const { friendship: _friendship, ...rest } = buddy;
        return [key, rest];
      },
    ),
  ) as LandingBuddies;

  return { ...picked, Landing: landing, Shop: { ...picked.Shop, buddies } };
}

/**
 * The JSON-LD copy for a landing page. Server-side only — see landingMessagesFor.
 */
export function landingSeoFor(locale: Locale): Messages['Landing']['seo'] {
  return messagesFor(locale).Landing.seo;
}
