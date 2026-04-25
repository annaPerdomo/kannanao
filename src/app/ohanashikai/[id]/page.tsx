'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { use } from 'react';

import OhanashikaiDetail from '@/pages/OhanashikaiDetail';
import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

export default function OhanashikaiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const backPath = searchParams?.get('from') === 'home' ? '/' : '/ohanashikai';

  return (
    <OhanashikaiDetail
      ohanashikaiId={id}
      onBack={() => router.push(backPath)}
      onPractice={(mode: OhanashikaiPracticeMode) =>
        router.push(`/ohanashikai/${id}/practice/${mode}`)
      }
    />
  );
}
