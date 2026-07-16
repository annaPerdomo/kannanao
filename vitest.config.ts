import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` is a Next.js build-time marker with no runtime module to
      // resolve under Vitest — point it at an empty stub so server data modules
      // can be unit-tested.
      'server-only': fileURLToPath(new URL('./src/test/serverOnlyStub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    // Globs, not bare names: 'node_modules' only ever matched a path literally
    // named that, and setting `exclude` at all replaces Vitest's defaults — so
    // nested copies (agent worktrees under .claude/) got crawled as real suites.
    exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**', '**/.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**', '**/.claude/**', 'src/test/**'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 75,
      },
    },
  },
});
