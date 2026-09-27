import { splitFuriganaDeep } from '@/lib/furiganaEdit';
import { loadKanjiReadings } from '@/lib/kanjiReadings';
import { logger } from '@/lib/logger';

export async function splitFuriganaSafe<T>(value: T, route: string): Promise<T> {
  try {
    const dict = await loadKanjiReadings();
    return splitFuriganaDeep(value, dict);
  } catch (err) {
    logger.error('Failed to split furigana per kanji', {
      route,
      error: err instanceof Error ? err.message : String(err),
    });
    return value;
  }
}
