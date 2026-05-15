import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import { VitePWA }      from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      /* ── Qué archivos cachear offline ─────────────────── */
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },

      /* ── Manifest — identidad de la app instalada ─────── */
      manifest: {
        name:             'Mi Carpeta',
        short_name:       'Mi Carpeta',
        description:      'Tu espacio personal para organizarte y crecer cada día.',
        theme_color:      '#1a1a1a',
        background_color: '#0f0f0f',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',

        icons: [
          {
            src:   '/icons/icon-192.png',
            sizes: '192x192',
            type:  'image/png',
          },
          {
            src:   '/icons/icon-512.png',
            sizes: '512x512',
            type:  'image/png',
          },
          {
            src:     '/icons/icon-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})