/*
  vite.config.js — Configuración de Vite (el bundler que compila tu app React)
  
  ¿Qué es Vite?
  Es la herramienta que convierte tu código React (JSX, módulos ES) en archivos
  que el navegador puede entender. También incluye un servidor de desarrollo con
  hot-reload (la pantalla se actualiza sola cuando guardás un archivo).
*/

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(), // Habilita soporte para JSX y el sistema de componentes de React
  ],
})
