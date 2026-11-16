import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.BASE_PATH ?? '';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
      base: `${base}/`,
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Backlog — suivi de jeux sans spoiler',
        short_name: 'Backlog',
        description: 'Backlog vidéoludique local-first, anti-spoiler par conception.',
        lang: 'fr',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: `${base}/`,
        scope: `${base}/`,
        icons: [
          { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'À quoi je joue ce soir ?',
            short_name: 'Piocher',
            url: `${base}/picker`,
            icons: [{ src: `${base}/icon-192.png`, sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        navigateFallback: `${base}/200.html`,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
