/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/StatsScreen.jsx                  ║
║                                                          ║
║  Cambios Fase 6:                                         ║
║  ✦ useStats recibe tasks para taskStats                  ║
║  ✦ Sección "Métricas de tareas" con 4 datos             ║
║  ✦ Sección "Hábitos consolidados 🏆" al final            ║
║    muestra achievements archivados con fecha y racha     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp }   from '../../context/AppContext'
import { useStats } from '../../hooks/useStats'


export default function StatsScreen() {

  const {
    notes, habits, habitLogs, tasks,
    achievements,
    calLoading, dataLoading,
  } = useApp()

  const {
    habitStats,
    notesByWeek,
    taskStats,
    totalNotes,
    habitsDoneToday,
    bestStreak,
  } = useStats({ notes, habits, habitLogs, tasks })

  const maxWeekCount = Math.max(...notesByWeek.map(w => w.count), 1)

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
          MÉTRICAS DE TAREAS
          ══════════════════════════════════════════════ */}
      <div className="sec">Métricas de tareas</div>

      {tasks.length === 0 ? (
        <div className="empty" style={{ marginBottom: 28 }}>
          Cuando cargues tareas van a aparecer métricas acá.
        </div>
      ) : (
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <StatCard
            label="Completadas esta semana"
            value={`${taskStats.porcentajeCompletadasEstaSemana}%`}
            sub={taskStats.porcentajeCompletadasEstaSemana < 40 ? '⚠️ Bajo' : taskStats.porcentajeCompletadasEstaSemana >= 80 ? '✅ Excelente' : 'Bien'}
          />
          <StatCard
            label="Promedio por día"
            value={taskStats.promedioTareasPorDia}
            sub="últimos 7 días"
          />
          <StatCard
            label="Días con sobrecarga"
            value={taskStats.diasConSobrecarga.length}
            sub={taskStats.diasConSobrecarga.length > 0 ? '5+ pendientes' : 'Sin sobrecarga 👌'}
          />
          <StatCard
            label="Días sin tareas"
            value={taskStats.diasVacios}
            sub="esta semana"
          />
        </div>
      )}


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
              <span className="week-bar-count">
                {week.count > 0 ? week.count : ''}
              </span>
              <div className="week-bar-track">
                {week.count > 0 && (
                  <div
                    className="week-bar-fill"
                    style={{ height: `${(week.count / maxWeekCount) * 100}%` }}
                  />
                )}
              </div>
              <span className="week-bar-label">{week.label}</span>
            </div>
          ))}
        </div>
      )}


      {/* ══════════════════════════════════════════════
          RACHAS DE HÁBITOS ACTIVOS
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


      {/* ══════════════════════════════════════════════
          HÁBITOS CONSOLIDADOS
          Solo visible si el usuario archivó alguno.
          ══════════════════════════════════════════════ */}
      {achievements.length > 0 && (
        <>
          <div className="sec" style={{ marginTop: 8 }}>
            Hábitos consolidados 🏆
          </div>
          <div style={{ marginBottom: 24 }}>
            {achievements.map((ach, i) => (
              <AchievementRow key={ach.id ?? i} achievement={ach} />
            ))}
          </div>
        </>
      )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   SUB-COMPONENTES
   ════════════════════════════════════════════════════════ */

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


function HabitStatRow({ habit }) {
  return (
    <div className="habit-stat-row">
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
        <div style={{ textAlign: 'right' }}>
          <div className="sv" style={{ fontSize: 24, lineHeight: 1 }}>
            {habit.streak}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 1 }}>
            {habit.streak === 1 ? 'día' : 'días'}
          </div>
        </div>
      </div>

      <div className="streak-dots">
        {habit.last7.map((day, i) => (
          <div key={i} className="streak-dot-item">
            <div
              className={`sdot ${day.done ? 'done' : ''}`}
              style={day.isRecovered ? { background: '#a78bfa', opacity: 0.9 } : {}}
              title={day.isRecovered ? 'Racha recuperada ⚡' : ''}
            />
            <span className="sdot-label">
              {new Date(day.dateStr + 'T12:00:00')
                .toLocaleDateString('es-AR', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ── AchievementRow — un hábito archivado ─────────────── */
function AchievementRow({ achievement }) {
  const fecha = achievement.achieved_at
    ? new Date(achievement.achieved_at + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 14px', marginBottom: 8,
      background: 'var(--card)', borderRadius: 14,
      border: '1.5px solid rgba(249,115,22,0.15)',
    }}>
      {/* Emoji del hábito */}
      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
        {achievement.habit_emoji || '⭐'}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          {achievement.habit_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
          Logrado el {fecha}
        </div>
      </div>

      {/* Racha alcanzada */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-habits)', lineHeight: 1 }}>
          {achievement.streak_reached}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2 }}>días 🔥</div>
      </div>
    </div>
  )
}