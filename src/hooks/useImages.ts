'use client';
import { useEffect, useState } from 'react';

import { encodeUnsplashUrl, fetchImage, triggerUnsplashDownload } from '@/services/api';

export function useImage(query: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetchImage(query)
      .then((result) => {
        if (result) {
          triggerUnsplashDownload(result.downloadLocation);
          setImageUrl(encodeUnsplashUrl(result));
        } else {
          setImageUrl(null);
        }
      })
      .catch(() => setImageUrl(null))
      .finally(() => setLoading(false));
  }, [query]);

  return { imageUrl, loading };
}
