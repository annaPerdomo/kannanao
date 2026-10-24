export interface SrsNextSource {
  file: string;
  sql: string;
  hash: string;
}

export function latestSrsNextSource(migrationsDir: string): SrsNextSource;
