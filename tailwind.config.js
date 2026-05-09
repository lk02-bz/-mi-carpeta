/*
  tailwind.config.js — Configuración de Tailwind CSS

  ¿Qué es Tailwind?
  En lugar de escribir CSS personalizado para cada cosa, Tailwind te da
  clases utilitarias pre-hechas. Ejemplo: en vez de escribir CSS para
  padding, usás la clase "p-4". Pero en este proyecto usamos un enfoque
  híbrido: Tailwind disponible para cosas nuevas + nuestras clases CSS
  originales para mantener el diseño visual idéntico.

  content: Le dice a Tailwind dónde buscar clases para incluirlas.
  Si no está listado acá, Tailwind no generará esas clases.
*/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}', // Todos los archivos JS y JSX dentro de src/
  ],
  theme: {
    extend: {}, // Acá podés extender Tailwind con tus propios valores
  },
  plugins: [],
}
