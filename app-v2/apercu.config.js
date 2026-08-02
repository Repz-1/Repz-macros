import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Build de l'apercu uniquement. Separe du build de production : il ne
// sort pas dans ../v2 et ne part donc jamais en ligne.
export default defineConfig({
  plugins: [preact()],
  root: 'apercu',
  base: './',
  build: {
    outDir: 'construit',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
});
