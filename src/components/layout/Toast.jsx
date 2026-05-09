/*
  src/components/layout/Toast.jsx — Notificación temporal

  Equivalente React del div#toast del HTML original.

  En la app vanilla, manipulábamos directamente el DOM:
    el.classList.add('show') / el.classList.remove('show')

  En React, el estado (visible) controla qué clases CSS se aplican.
  El CSS del toast y la animación son idénticos al original.
*/

import { useApp } from '../../context/AppContext'

export default function Toast() {
  const { toast } = useApp()

  /*
    La clase "show" activa la animación CSS definida en index.css.
    Cuando visible=false, el toast está en opacity:0 y translateY(20px).
    Cuando visible=true, pasa a opacity:1 y translateY(0) con transición suave.
  */
  return (
    <div id="toast" className={toast.visible ? 'show' : ''}>
      {toast.msg}
    </div>
  )
}
