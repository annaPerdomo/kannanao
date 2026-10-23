import { v5 as uuidv5 } from 'uuid';

export const DEMO_USERNAME_PREFIX = 'demo-';

/** 403 code a cost route returns for a demo account; the client matches it to a translated message. */
export const DEMO_ACCOUNT_BLOCKED = 'DEMO_ACCOUNT_BLOCKED';

/** 403 code the invite route returns for a demo organizer; the client matches it to a translated message. */
export const DEMO_NO_INVITES = 'DEMO_NO_INVITES';

export function isDemoUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.toLowerCase().startsWith(DEMO_USERNAME_PREFIX);
}

const DEMO_UUID_NAMESPACE = '8f3b6d1e-0a2c-4e5a-9b1d-6b2f7a9d4c10';

/** Deterministic across runs (fixed namespace), so a demo card/deck/sentence keeps its id every nightly reset. */
export function demoUuid(key: string): string {
  return uuidv5(key, DEMO_UUID_NAMESPACE);
}
