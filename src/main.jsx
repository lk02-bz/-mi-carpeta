/*
  src/main.jsx — Punto de entrada de React

  Este es el archivo que Vite ejecuta primero.
  Equivale al <script src="app.js"> del index.html original,
  pero en lugar de cargar funciones globales, "monta" React
  en el div#root del index.html.

  ¿Qué hace createRoot y render?
  React toma el control del div#root y gestiona todo el DOM
  adentro de él. A partir de acá, React es responsable de
  actualizar la pantalla cuando cambia el estado.

  <StrictMode> es una herramienta de desarrollo de React que:
    - Detecta problemas potenciales en el código
    - Avisa sobre patrones desaconsejados
    - NO afecta el comportamiento en producción
    - En desarrollo, monta los componentes DOS veces a propósito
      para detectar side effects (por eso los useEffect se ejecutan 2 veces en dev)

  <AppProvider> envuelve toda la app para que cualquier componente
  pueda acceder al contexto global con useApp().
*/

import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'

import { AppProvider } from './context/AppContext'
import App             from './App'
import './index.css' // Estilos globales (incluye Tailwind + nuestro CSS original)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
