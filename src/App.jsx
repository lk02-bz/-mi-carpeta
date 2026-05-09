/*
╔══════════════════════════════════════════════════════════╗
║  src/App.jsx — VERSIÓN FINAL                             ║
║                                                          ║
║  Todas las pantallas reales. Sin placeholders.           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from './context/AppContext'

import TopBar    from './components/layout/TopBar'
import BottomNav from './components/layout/BottomNav'
import Toast     from './components/layout/Toast'

import AuthScreen       from './components/screens/AuthScreen'
import HomeScreen       from './components/screens/HomeScreen'
import CategoriesScreen from './components/screens/CategoriesScreen'
import CategoryDetail   from './components/screens/CategoryDetail'
import AddCategory      from './components/screens/AddCategory'
import EditorScreen     from './components/screens/EditorScreen'
import SearchScreen     from './components/screens/SearchScreen'

export default function App() {
  const { user, authLoading, currentFrame } = useApp()
  const s = currentFrame.screen

  if (authLoading) {
    return (
      <div id="app" style={{ justifyContent:'center', alignItems:'center' }}>
        <p style={{ color:'var(--text2)', fontSize:14 }}>Cargando...</p>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <div id="app">
      <TopBar />
      <div className="screens">

        <div className={`screen ${s === 'home'   ? 'active' : ''}`}><HomeScreen /></div>
        <div className={`screen ${s === 'cats'   ? 'active' : ''}`}><CategoriesScreen /></div>
        <div className={`screen ${s === 'catd'   ? 'active' : ''}`}><CategoryDetail /></div>
        <div className={`screen ${s === 'addcat' ? 'active' : ''}`}><AddCategory /></div>
        <div className={`screen ${s === 'editor' ? 'active' : ''}`}><EditorScreen /></div>
        <div className={`screen ${s === 'search' ? 'active' : ''}`}><SearchScreen /></div>

      </div>
      <BottomNav />
      <Toast />
    </div>
  )
}
