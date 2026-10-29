import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Used only when VITE_API_URL is empty: the site then calls /api on itself.
      proxy: { '/api': env.VITE_API_URL || 'http://localhost:4000' },
    },
  };
});
