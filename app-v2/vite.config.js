import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Le build sort dans ../v2/ : servi sur belfit.be/v2/ A COTE du site actuel.
// Le site live (app.html, main.html...) n'est jamais touche par ce chantier.
export default defineConfig({
  plugins: [preact()],
  base: '/v2/',
  build: {
    outDir: '../v2',
    emptyOutDir: true
  }
});
