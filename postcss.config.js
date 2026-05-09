/*
  postcss.config.js — Configuración de PostCSS

  ¿Qué es PostCSS?
  Es un procesador de CSS que corre "plugins" sobre tu código CSS.
  Tailwind lo usa internamente para generar sus clases.
  Autoprefixer agrega automáticamente prefijos de navegador (-webkit-, -moz-, etc.)
  para que tu CSS funcione en todos los navegadores sin que tengas que hacerlo manualmente.

  No necesitás entender este archivo en detalle — Tailwind lo requiere y así funciona.
*/

export default {
  plugins: {
    '@tailwindcss/postcss': {}, // ← Tailwind v4 usa este paquete separado
    autoprefixer: {},
  },
}
