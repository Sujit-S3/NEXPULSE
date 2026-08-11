/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@theme': path.resolve(__dirname, './src/theme'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@features': path.resolve(__dirname, './src/features'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(?:react|react-dom)\//.test(id)) {
            return 'react-vendor';
          }
          if (/node_modules\/(?:react-router|react-router-dom)\//.test(id)) return 'router-vendor';
          if (id.includes('/node_modules/@tanstack/react-query/')) return 'query-vendor';
          if (id.includes('/node_modules/framer-motion/')) return 'motion-vendor';
          if (
            id.includes('/node_modules/react-hook-form/')
            || id.includes('/node_modules/@hookform/resolvers/')
            || id.includes('/node_modules/zod/')
          ) return 'forms-vendor';
          if (id.includes('/node_modules/lucide-react/')) return 'icons-vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.tsx'],
    css: true,
    pool: 'forks',
  },
});
