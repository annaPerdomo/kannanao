'use client';
import { useState, useEffect } from 'react';
import { fetchImage } from '@/services/api';

export function useImage(query: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetchImage(query)
      .then((url) => setImageUrl(url))
      .catch(() => setImageUrl(null))
      .finally(() => setLoading(false));
  }, [query]);

  return { imageUrl, loading };
}
