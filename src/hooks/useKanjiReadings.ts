'use client';
import { useEffect, useState } from 'react';

import { type KanjiReadingDict, loadKanjiReadings } from '@/lib/kanjiReadings';

export function useKanjiReadings() {
  const [data, setData] = useState<KanjiReadingDict | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadKanjiReadings()
      .then((dict) => active && setData(dict))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  return { data, loading: !data && !error, error };
}
