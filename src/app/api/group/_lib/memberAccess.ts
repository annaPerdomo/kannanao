import { getServiceSupabase } from './serviceSupabase';

/** True when the learner is one of this organizer's members. */
export async function isMemberOfOrganizer(memberId: string, organizerId: string): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('organizer_id', organizerId)
    .maybeSingle();

  return !!data;
}
