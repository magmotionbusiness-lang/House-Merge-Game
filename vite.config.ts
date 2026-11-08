import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
