import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { feedProxy } from './dev/feed-proxy';

// La versión sale de package.json: se cambia en un solo lugar.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // Rutas relativas: así la app funciona igual en una subruta de chiptecno.ar o en un subdominio.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    {
      name: 'feed-proxy',
      configureServer(server) {
        server.middlewares.use('/proxy', feedProxy);
      },
      configurePreviewServer(server) {
        server.middlewares.use('/proxy', feedProxy);
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'chip-rss',
        short_name: 'chip-rss',
        description: 'Lector de feeds RSS local-first. Un proyecto Chip Tecno.',
        lang: 'es-AR',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
      },
    }),
  ],
});
