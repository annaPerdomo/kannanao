import type { SupabaseClient, User } from '@supabase/supabase-js';

import { FAKE_DOMAIN } from '@/app/api/_lib/profile-actions';

import { DEMO_APP_METADATA, mustSucceed } from './shared';

export interface DemoAccount {
  username: string;
  displayName: string;
  accountType: 'organizer' | 'member';
}

const LIST_PAGE_SIZE = 200;
/** A sane ceiling (10k users) on how far pagination will search for an orphaned auth user. */
const MAX_LIST_PAGES = 50;

/** supabase-js has no admin.getUserByEmail — page through admin.listUsers() instead. */
async function findAuthUserByEmail(sb: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);
    const users = data?.users ?? [];
    const match = users.find((u) => u.email === email);
    if (match) return match;
    if (users.length < LIST_PAGE_SIZE) return null;
  }
  return null;
}

function assertDemoMarked(user: User, username: string): void {
  if (user.app_metadata?.demo !== true) {
    throw new Error(
      `Refusing to adopt auth user for ${username}: it exists but is not marked app_metadata.demo`,
    );
  }
}

async function upsertProfile(
  sb: SupabaseClient,
  userId: string,
  account: DemoAccount,
): Promise<void> {
  const result = await sb.from('profiles').upsert({
    id: userId,
    username: account.username,
    display_name: account.displayName,
    account_type: account.accountType,
    show_leaderboard: true,
  });
  await mustSucceed(`upsert profile ${account.username}`, result);
}

/** Idempotent across nightly runs. The orphan branch (auth user exists, no profile)
 * recovers from a previous run whose profile write failed partway through. */
export async function ensureAccount(
  sb: SupabaseClient,
  password: string,
  account: DemoAccount,
): Promise<string> {
  const email = `${account.username}@${FAKE_DOMAIN}`;

  const { data: existingProfile } = await sb
    .from('profiles')
    .select('id')
    .eq('username', account.username)
    .maybeSingle();

  if (existingProfile) {
    const userId = existingProfile.id as string;
    const { data, error: getError } = await sb.auth.admin.getUserById(userId);
    if (getError || !data?.user) {
      throw new Error(`Demo profile ${account.username} has no matching auth user`);
    }
    assertDemoMarked(data.user, account.username);

    const { error } = await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error)
      throw new Error(`Failed to update demo account ${account.username}: ${error.message}`);

    await upsertProfile(sb, userId, account);
    return userId;
  }

  const orphan = await findAuthUserByEmail(sb, email);
  if (orphan) {
    assertDemoMarked(orphan, account.username);
    const { error } = await sb.auth.admin.updateUserById(orphan.id, {
      password,
      email_confirm: true,
    });
    if (error)
      throw new Error(`Failed to update demo account ${account.username}: ${error.message}`);

    await upsertProfile(sb, orphan.id, account);
    return orphan.id;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: DEMO_APP_METADATA,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create demo account ${account.username}: ${error?.message}`);
  }

  await upsertProfile(sb, data.user.id, account);
  return data.user.id;
}
