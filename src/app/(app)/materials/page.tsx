'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { materialsRedirectTarget } from '@/lib/materialsRedirect';
import { enqueueQuizletHash } from '@/lib/quizlet';

/** A server redirect can't read a URL hash, and browsers don't reliably keep one across a redirect. */
export default function MaterialsForwarder() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    enqueueQuizletHash();
    const group = searchParams?.get('group') ?? undefined;
    const tab = searchParams?.get('tab') ?? undefined;
    router.replace(materialsRedirectTarget({ group, tab }));
  }, [router, searchParams]);

  return null;
}
