import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'standalone' ? [viteSingleFile()] : [],
  server: {
    host: '0.0.0.0',
    port: 5188,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4188,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
}));
