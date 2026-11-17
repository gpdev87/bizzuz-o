/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const COR_TEMA = '#1b2a3a';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icone.svg'],
      manifest: {
        name: 'Consulta Operacional',
        short_name: 'Consulta',
        description: 'Consulta rápida de infrações de trânsito para o serviço operacional',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: COR_TEMA,
        background_color: COR_TEMA,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Os dados (json) ficam fora do service worker: o app os guarda no IndexedDB.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
