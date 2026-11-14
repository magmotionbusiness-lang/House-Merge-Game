import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
