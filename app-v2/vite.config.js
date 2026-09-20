import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Le build sort dans ../v2/ : servi sur belfit.be/v2/ A COTE du site actuel.
// Le site live (app.html, main.html...) n'est jamais touche par ce chantier.
export default defineConfig({
  plugins: [preact()],
  // Dev (aperçu) à la racine. Production sur belfit.be/v2/.
  base: process.env.NODE_ENV === 'production' ? '/v2/' : '/',
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
  build: {
    outDir: '../v2',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Firebase dans son propre morceau : le coeur de l'app se charge
        // et s'affiche sans attendre le SDK (gain sur le premier rendu)
        manualChunks: {
          // Auth = necessaire au premier ecran. Firestore = seulement apres
          // connexion. Scanner = a la demande. Trois morceaux distincts pour
          // que le premier rendu ne telecharge que le minimum.
          'fb-auth': ['firebase/app', 'firebase/auth'],
          'fb-store': ['firebase/firestore'],
          scanner: ['html5-qrcode'],
        },
      },
    },
  }
});
