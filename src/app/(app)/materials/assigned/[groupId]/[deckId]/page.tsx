import { redirect } from 'next/navigation';

export default async function AssignedHandoutRedirect({
  params,
}: {
  params: Promise<{ groupId: string; deckId: string }>;
}) {
  const { groupId, deckId } = await params;
  redirect(`/group/${groupId}/handout/${deckId}`);
}
