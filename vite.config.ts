import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Bibliotecas grandes em arquivos próprios: mudam pouco, então o navegador guarda e não baixa de novo a cada versão do app
const VENDOR_CHUNKS: Record<string, string[]> = {
  react: ['react', 'react-dom', 'scheduler'],
  supabase: ['@supabase'],
  motion: ['motion', 'framer-motion', 'motion-dom', 'motion-utils'],
  icons: ['lucide-react'],
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const pkg = id.split('node_modules/').pop()!.replace(/\\/g, '/');
          for (const [chunk, names] of Object.entries(VENDOR_CHUNKS)) {
            if (names.some(name => pkg === name || pkg.startsWith(`${name}/`))) return chunk;
          }
        },
      },
    },
  },
  server: {
    allowedHosts: true,
  },
});
