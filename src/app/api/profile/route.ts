import { authenticateUser, handleProfileAction } from '../_lib/profile-actions';

export async function PATCH(req: Request) {
  const auth = await authenticateUser(req);
  if ('error' in auth) return auth.error;

  const body = (await req.json()) as Record<string, unknown>;
  return handleProfileAction(auth.serviceClient, auth.user.id, body);
}
