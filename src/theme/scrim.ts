/**
 * Deep plum, deliberately not a palette token: the banners are painted art with
 * their own light, and a brand-tinted scrim fights half of the ten colour
 * schemes. Its own module, not GreetingHero's export — the card that floats on
 * the hero needs it too, and that import would close a cycle.
 */
export const HERO_SCRIM = '72, 26, 84';
