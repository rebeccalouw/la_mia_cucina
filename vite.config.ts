import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // `true` disabled host-header checking entirely. Set DEV_ALLOWED_HOSTS to a
      // comma-separated list when reaching the dev server through a tunnel or proxy.
      allowedHosts: env.DEV_ALLOWED_HOSTS ? env.DEV_ALLOWED_HOSTS.split(',') : [],
    },
  };
});
