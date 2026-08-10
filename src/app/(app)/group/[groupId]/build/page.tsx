import { redirect } from 'next/navigation';

/** The lesson builder moved to the Materials Builder; old links keep working. */
export default async function LegacyLessonBuilderPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/materials?group=${groupId}`);
}
