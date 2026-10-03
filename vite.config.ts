import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isHttps = mode === 'https' || process.env.HTTPS === 'true' || process.env.VITE_HTTPS === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isHttps ? [basicSsl()] : []),
    ],
    base: process.env.NODE_ENV === 'production' ? '/kondi-pages/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});

