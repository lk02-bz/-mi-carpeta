/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Cambios Fase 4.1:                                       ║
║  ✦ Widget de hábitos con racha 🔥 y checkbox rápido      ║
║  ✦ Modal de premio al alcanzar 7, 14, 21… días           ║
║  ✦ Preview strip del Vision Board (3 imágenes)           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                                       from 'react'
import { useApp }                                         from '../../context/AppContext'
import { useStats }                                       from '../../hooks/useStats'
import { getGreeting, fdate, truncate, stripHtml }        from '../../utils/helpers'


/* ── Fecha local sin problemas de timezone ───────────────── */
function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}


export default function HomeScreen() {
  const {
    user,
    cats,
    notes,
    dataLoading,
    pushTo,
    navTo,
    toggleFavorite,
    getTagsForNote,
    displayName,
    habits,
    habitLogs,
    goalImages,
    toggleHabitLog,
  } = useApp()

  /* Métricas y rachas calculadas localmente */
  const { habitStats } = useStats({ notes, habits, habitLogs })

  /* Modal de premio */
  const [reward, setReward] = useState(null)
  // reward = { habitName, rewardText, streak } | null

  const favoritos = notes.filter(n => n.is_favorite)
  const recientes = notes.slice(0, 4)
  const today     = todayLocal()

  /* Últimas 4 imágenes del Vision Board */
  const boardPreview = goalImages.slice(0, 4)


  /* ── Marcar hábito desde Home ────────────────────────── */
  async function handleToggleHabit(habitId) {
    const result = await toggleHabitLog(habitId, today)
    if (result.milestone) {
      setReward({
        habitName:  result.habitName,
        rewardText: result.rewardText,
        streak:     result.milestone,
      })
    }
  }


  function getNombreCat(catId) {
    const cat = cats.find(c => c.id === catId)
    return cat ? `${cat.emoji} ${cat.name}` : ''
  }

  if (dataLoading) {
    return (
      <div className="cnt">
        <div className="empty">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="cnt">

      {/* ── Saludo ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p className="greet-name">{getGreeting()}</p>
        <p className="greet-sub">{displayName || user.email}</p>
      </div>

      {/* ── Stats rápidas ────────────────────────────────── */}
      <div className="stat-row" style={{ marginBottom: 20 }}>
        <div className="stat-c">
          <div className="sl">Categorías</div>
          <div className="sv">{cats.length}</div>
        </div>
        <div className="stat-c">
          <div className="sl">Apuntes</div>
          <div className="sv">{notes.length}</div>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════
          WIDGET DE HÁBITOS
          ══════════════════════════════════════════════════ */}
      {habitStats.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10,
          }}>
            <div className="sec" style={{ marginBottom: 0 }}>Hábitos de hoy</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {habitStats.filter(h => h.doneToday).length}/{habitStats.length} hechos
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habitStats.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onToggle={() => handleToggleHabit(habit.id)}
              />
            ))}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════
          VISION BOARD PREVIEW
          ══════════════════════════════════════════════════ */}
      {boardPreview.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10,
          }}>
            <div className="sec" style={{ marginBottom: 0 }}>Vision Board</div>
            <button
              onClick={() => navTo('vision')}
              style={{
                fontSize: 11, color: 'var(--accent)',
                background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Ver todo →
            </button>
          </div>

          <div style={{
            display: 'flex', gap: 8,
            overflowX: 'auto', paddingBottom: 4,
            scrollbarWidth: 'none',
          }}>
            {boardPreview.map(img => (
              <button
                key={img.id}
                onClick={() => navTo('vision')}
                style={{
                  flexShrink: 0, width: 90, height: 90,
                  borderRadius: 12, overflow: 'hidden',
                  border: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                <img
                  src={img.url}
                  alt={img.caption || 'Vision board'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </button>
            ))}
            {/* Botón para agregar más */}
            <button
              onClick={() => navTo('vision')}
              style={{
                flexShrink: 0, width: 90, height: 90,
                borderRadius: 12,
                border: '1.5px dashed var(--accent)',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: 22, cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Vision Board vacío — botón directo */}
      {boardPreview.length === 0 && (
        <button
          onClick={() => navTo('vision')}
          style={{
            width: '100%', marginBottom: 24,
            padding: '12px 0',
            borderRadius: 12,
            border: '1.5px dashed var(--accent)',
            background: 'transparent',
            color: 'var(--accent)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🖼️ Crear tu Vision Board
        </button>
      )}


      {/* ── Favoritos ────────────────────────────────────── */}
      {favoritos.length > 0 && (
        <>
          <div className="sec">Favoritos</div>
          {favoritos.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              catLabel={getNombreCat(note.category_id)}
              notaTags={getTagsForNote(note.id)}
              onPress={() => pushTo('editor', {
                noteId: note.id,
                catId:  note.category_id,
                title:  'Editar apunte',
              })}
              onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
            />
          ))}
        </>
      )}

      {/* ── Recientes ────────────────────────────────────── */}
      <div className="sec">Recientes</div>

      {recientes.length === 0 ? (
        <div className="empty">
          Todavía no tenés apuntes.<br />
          Tocá el <strong>+</strong> para crear el primero.
        </div>
      ) : (
        recientes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            catLabel={getNombreCat(note.category_id)}
            notaTags={getTagsForNote(note.id)}
            onPress={() => pushTo('editor', {
              noteId: note.id,
              catId:  note.category_id,
              title:  'Editar apunte',
            })}
            onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
          />
        ))
      )}


      {/* ══════════════════════════════════════════════════
          MODAL DE PREMIO 🎉
          ══════════════════════════════════════════════════ */}
      {reward && (
        <RewardModal
          streak={reward.streak}
          habitName={reward.habitName}
          rewardText={reward.rewardText}
          onClose={() => setReward(null)}
        />
      )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   COMPONENTE — Fila de hábito con racha
   ════════════════════════════════════════════════════════ */
function HabitRow({ habit, onToggle }) {
  const { doneToday, streak, last7 } = habit

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--card)',
      borderRadius: 12,
      border: doneToday
        ? '1.5px solid var(--accent)'
        : '1.5px solid transparent',
      transition: 'border-color 0.2s',
    }}>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 26, height: 26,
          borderRadius: 8, flexShrink: 0,
          border: `2px solid ${doneToday ? 'var(--accent)' : 'var(--text2)'}`,
          background: doneToday ? 'var(--accent)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {doneToday && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline
              points="1.5,6 5,9.5 10.5,2.5"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Emoji + nombre */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: doneToday ? 'var(--text2)' : 'var(--text)',
          textDecoration: doneToday ? 'line-through' : 'none',
          transition: 'all 0.15s',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {habit.emoji} {habit.name}
        </div>

        {/* Puntitos últimos 7 días */}
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {last7.map((day, i) => (
            <div
              key={i}
              title={day.dateStr}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: day.done ? 'var(--accent)' : 'var(--text2)',
                opacity: day.done ? 1 : 0.25,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Racha */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        flexShrink: 0,
      }}>
        {streak > 0 ? (
          <>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: streak >= 7 ? '#f97316' : 'var(--text)',
            }}>
              {streak}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text2)', opacity: 0.5 }}>—</span>
        )}
      </div>

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   COMPONENTE — Modal de premio 🎉
   ════════════════════════════════════════════════════════ */
function RewardModal({ streak, habitName, rewardText, onClose }) {
  const isSpecial = streak >= 21
  const emoji     = streak >= 21 ? '🏆' : streak >= 14 ? '🌟' : '🎉'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--bg)',
        borderRadius: 24,
        padding: '32px 24px',
        textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
        animation: 'popIn 0.25s ease',
      }}>

        {/* Emoji grande */}
        <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>
          {emoji}
        </div>

        {/* Título */}
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          ¡{streak} días seguidos!
        </div>

        {/* Hábito */}
        <div style={{
          fontSize: 14, color: 'var(--accent)',
          fontWeight: 600, marginBottom: 16,
        }}>
          {habitName}
        </div>

        {/* Premio personalizado */}
        {rewardText ? (
          <div style={{
            background: 'var(--card)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tu premio
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              🎁 {rewardText}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--card)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--text2)',
          }}>
            Podés configurar un premio en la pantalla de hábitos 🎁
          </div>
        )}

        {/* Botón */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isSpecial ? '¡Lo merezco! 🏆' : '¡Sigo así! 💪'}
        </button>

      </div>

      {/* Animación keyframe inline */}
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   COMPONENTE — Tarjeta de nota (sin cambios)
   ════════════════════════════════════════════════════════ */
function NoteCard({ note, catLabel, notaTags, onPress, onToggleFavorite }) {
  const preview = truncate(stripHtml(note.content))

  return (
    <div className="note-row" onClick={onPress}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="nt" style={{ flex: 1 }}>{note.title}</div>
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          aria-label={note.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px', lineHeight: 1, flexShrink: 0,
            opacity: note.is_favorite ? 1 : 0.25,
            color: 'var(--text)', transition: 'opacity 0.15s',
          }}
        >
          ★
        </button>
      </div>

      {preview ? <div className="np">{preview}</div> : null}

      {notaTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {notaTags.map(tag => (
            <span key={tag.id} className="chip">#{tag.name}</span>
          ))}
        </div>
      )}

      <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel ? <span className="chip">{catLabel}</span> : null}
      </div>

    </div>
  )
}
