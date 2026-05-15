/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/SplashScreen.jsx                  ║
║                                                          ║
║  Fix visual:                                             ║
║  ✦ Safe area inset para celulares con notch              ║
║  ✦ Contenido perfectamente centrado en pantalla          ║
╚══════════════════════════════════════════════════════════╝
*/

export default function SplashScreen() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 999,
    }}>

      {/* Logo */}
      <div style={{
        width: 88, height: 88,
        borderRadius: 22,
        background: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 42,
        marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        animation: 'splashPulse 1.4s ease-in-out infinite',
      }}>
        📚
      </div>

      {/* Nombre */}
      <div style={{
        fontSize: 26,
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        marginBottom: 6,
      }}>
        Mi Carpeta
      </div>

      {/* Subtítulo */}
      <div style={{
        fontSize: 13,
        color: 'var(--text2)',
        marginBottom: 32,
      }}>
        Tu espacio personal de organización
      </div>

      {/* Barra de carga */}
      <div style={{
        width: 72, height: 3,
        borderRadius: 99,
        background: 'var(--card)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'var(--accent)',
          borderRadius: 99,
          animation: 'splashBar 1.4s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1);    opacity: 1;   }
          50%       { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes splashBar {
          0%   { width: 0%;  margin-left: 0%;   }
          50%  { width: 65%; margin-left: 17%;  }
          100% { width: 0%;  margin-left: 100%; }
        }
      `}</style>

    </div>
  )
}