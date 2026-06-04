// Stub for the `server-only` marker package in the test environment. Next.js
// supplies the real module at build time; under Vitest there's nothing to
// resolve, so server data modules alias their `import 'server-only'` here.
export {};
