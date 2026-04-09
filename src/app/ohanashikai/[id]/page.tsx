'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import OhanashikaiDetail from '@/pages/OhanashikaiDetail';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

export default function OhanashikaiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <OhanashikaiDetail
      ohanashikaiId={id}
      onBack={() => router.push('/ohanashikai')}
      onPractice={(mode: OhanashikaiPracticeMode) => router.push(`/ohanashikai/${id}/practice/${mode}`)}
    />
  );
}
