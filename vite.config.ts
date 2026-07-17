// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { defineConfig } from 'vitest/config'; // setup guide told me to import from vitest/config if squiggly lines appear (https://vitest.dev/guide/)
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
});
