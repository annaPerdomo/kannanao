import { redirect } from 'next/navigation';

export default async function LegacyLessonBuilderPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/group/${groupId}/add/lesson`);
}
