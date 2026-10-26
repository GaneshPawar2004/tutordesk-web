import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs separately (backend/, port 4000).
    proxy: { '/api': 'http://localhost:4000' },
  },
});
