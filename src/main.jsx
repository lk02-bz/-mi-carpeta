/*
╔══════════════════════════════════════════════════════════╗
║  src/main.jsx — Punto de entrada de React                ║
║                                                          ║
║  Cambios Fase 3.1.B:                                     ║
║  ✦ Aplica el color de acento guardado en localStorage    ║
║    ANTES del primer render, para evitar el "flash"       ║
║    donde se ve el color negro por un instante             ║
╚══════════════════════════════════════════════════════════╝
*/

import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'

import { AppProvider } from './context/AppContext'
import App             from './App'
import './index.css'


/* ── Inicialización del tema ANTES de montar React ────────
   
   ¿Por qué acá y no en un useEffect?
   Los useEffect se ejecutan DESPUÉS del primer render.
   Si guardaramos el color en un useEffect, el usuario vería
   un flash del color por defecto (negro) antes de que se aplique
   el color guardado. Ejecutarlo aquí, en el módulo principal,
   garantiza que el color esté aplicado antes de que React
   pinte algo en pantalla.

   Es el mismo patrón que usan Next.js y Remix para el dark mode.

   El bloque de colores acá es solo para la inicialización.
   La fuente de verdad de los colores vive en ACCENT_PRESETS
   dentro de useProfile.js. Si agregás un color nuevo, actualizá
   los dos archivos.
*/
;(function initTheme() {
  const PRESETS = {
    negro:   { accent: '#1a1a1a', fg: '#ffffff' },
    azul:    { accent: '#2563eb', fg: '#ffffff' },
    verde:   { accent: '#16a34a', fg: '#ffffff' },
    violeta: { accent: '#7c3aed', fg: '#ffffff' },
    rojo:    { accent: '#e11d48', fg: '#ffffff' },
    ambar:   { accent: '#d97706', fg: '#ffffff' },
  }

  const saved  = localStorage.getItem('mi-carpeta-accent')
  const preset = PRESETS[saved] ?? PRESETS.negro

  document.documentElement.style.setProperty('--accent',    preset.accent)
  document.documentElement.style.setProperty('--accent-fg', preset.fg)
})()


/* ── Montaje de React (sin cambios) ──────────────────── */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
