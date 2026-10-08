import { notFound } from 'next/navigation';

import { AddMaterialPage } from '@/components/Group/AddToPlan/AddMaterialPage';
import { isAddSource } from '@/components/Group/AddToPlan/constants';

export default async function GroupAddMaterialPage({
  params,
}: {
  params: Promise<{ groupId: string; source: string }>;
}) {
  const { groupId, source } = await params;
  if (!isAddSource(source)) notFound();
  return <AddMaterialPage groupId={groupId} source={source} />;
}
