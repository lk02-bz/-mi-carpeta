/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/StatsScreen.jsx                  ║
║                                                          ║
║  Muestra:                                                ║
║    • Cards de resumen (totales rápidos)                  ║
║    • Gráfico de barras: apuntes por semana               ║
║    • Rachas de hábitos con puntitos de últimos 7 días    ║
║                                                          ║
║  Fase 3.1.A — Estadísticas                               ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp }   from '../../context/AppContext'
import { useStats } from '../../hooks/useStats'


export default function StatsScreen() {

  /* Datos del contexto — ya están cargados, no hace fetch */
  const { notes, habits, habitLogs, calLoading, dataLoading } = useApp()

  /* Métricas calculadas localmente */
  const {
    habitStats,
    notesByWeek,
    totalNotes,
    habitsDoneToday,
    bestStreak,
  } = useStats({ notes, habits, habitLogs })

  /* Máximo de apuntes en una semana → escala el 100% de la barra */
  const maxWeekCount = Math.max(...notesByWeek.map(w => w.count), 1)

  /* ── Cargando ── */
  if (calLoading || dataLoading) {
    return (
      <div className="cnt">
        <div className="empty">Calculando estadísticas…</div>
      </div>
    )
  }


  return (
    <div className="cnt">

      {/* ══════════════════════════════════════════════
          CARDS DE RESUMEN
          4 tarjetas en grilla 2×2 con los números
          más importantes de un vistazo.
          ══════════════════════════════════════════════ */}

      <div className="stats-grid">
        <StatCard label="Apuntes totales" value={totalNotes} />
        <StatCard
          label="Hábitos hoy"
          value={`${habitsDoneToday} / ${habits.length}`}
          sub={habits.length === 0 ? 'Sin hábitos aún' : null}
        />
        <StatCard
          label="Mejor racha"
          value={bestStreak > 0 ? `${bestStreak}d` : '—'}
          sub={bestStreak > 0 ? 'días seguidos' : 'Empezá hoy'}
        />
        <StatCard label="Hábitos activos" value={habits.length} />
      </div>


      {/* ══════════════════════════════════════════════
          GRÁFICO DE BARRAS — Apuntes por semana
          ══════════════════════════════════════════════ */}

      <div className="sec">Apuntes por semana</div>

      {notesByWeek.every(w => w.count === 0) ? (
        <div className="empty" style={{ marginBottom: 28 }}>
          Cuando crees apuntes van a aparecer acá.
        </div>
      ) : (
        <div className="week-chart">
          {notesByWeek.map((week, i) => (
            <div key={i} className="week-bar-item">
              {/* Cantidad encima de la barra */}
              <span className="week-bar-count">
                {week.count > 0 ? week.count : ''}
              </span>

              {/* Barra */}
              <div className="week-bar-track">
                {week.count > 0 && (
                  <div
                    className="week-bar-fill"
                    style={{ height: `${(week.count / maxWeekCount) * 100}%` }}
                  />
                )}
              </div>

              {/* Etiqueta debajo */}
              <span className="week-bar-label">{week.label}</span>
            </div>
          ))}
        </div>
      )}


      {/* ══════════════════════════════════════════════
          RACHAS DE HÁBITOS
          Por cada hábito: nombre + racha + puntitos
          de los últimos 7 días.
          ══════════════════════════════════════════════ */}

      <div className="sec">Rachas de hábitos</div>

      {habits.length === 0 ? (
        <div className="empty">
          Todavía no tenés hábitos.{'\n'}
          Agregá uno desde el Calendario.
        </div>
      ) : (
        habitStats.map(h => (
          <HabitStatRow key={h.id} habit={h} />
        ))
      )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   SUB-COMPONENTES

   Los extraemos del componente principal para que cada
   parte sea más fácil de leer y modificar por separado.
   ════════════════════════════════════════════════════════ */

/**
 * StatCard — Tarjeta de resumen con etiqueta y valor grande.
 * Reutiliza las clases .sl y .sv que ya existen en el CSS
 * (las mismas que usan las tarjetas de Inicio).
 */
function StatCard({ label, value, sub }) {
  return (
    <div className="stats-card">
      <div className="sl">{label}</div>
      <div className="sv">{value}</div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}


/**
 * HabitStatRow — Fila de un hábito con:
 *   - Emoji + nombre + total de completaciones
 *   - Número de racha (días consecutivos)
 *   - 7 puntitos: los últimos 7 días (gris = no hecho, accent = hecho)
 *
 * @param {{ habit: object }} props
 *   habit incluye los campos originales + streak, total, doneToday, last7
 */
function HabitStatRow({ habit }) {
  return (
    <div className="habit-stat-row">

      {/* ── Encabezado: info + número de racha ── */}
      <div className="habit-stat-header">

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>
            {habit.emoji || '⭐'}
          </span>
          <div>
            <div className="nt" style={{ fontSize: 13 }}>{habit.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
              {habit.total === 0
                ? 'Empezá hoy'
                : `${habit.total} vez${habit.total !== 1 ? 'ces' : ''} completado`
              }
            </div>
          </div>
        </div>

        {/* Racha — número grande a la derecha */}
        <div style={{ textAlign: 'right' }}>
          <div className="sv" style={{ fontSize: 24, lineHeight: 1 }}>
            {habit.streak}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 1 }}>
            {habit.streak === 1 ? 'día' : 'días'}
          </div>
        </div>

      </div>

      {/* ── Puntitos — últimos 7 días ── */}
      <div className="streak-dots">
        {habit.last7.map((day, i) => (
          <div key={i} className="streak-dot-item">
            <div className={`sdot ${day.done ? 'done' : ''}`} />
            <span className="sdot-label">
              {/*
                Parseamos como mediodía local para evitar el bug de zona horaria:
                '2025-01-15' + 'T12:00:00' → nunca se desplaza un día
              */}
              {new Date(day.dateStr + 'T12:00:00')
                .toLocaleDateString('es-AR', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
