/*
╔══════════════════════════════════════════════════════════╗
║  src/App.jsx                                             ║
║                                                          ║
║  Rediseño Cósmico:                                       ║
║  ✦ StarField global — estrellas en TODAS las pantallas   ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from './context/AppContext'

import StarField  from './components/StarField'
import TopBar     from './components/layout/TopBar'
import BottomNav  from './components/layout/BottomNav'
import Toast      from './components/layout/Toast'
import SplashScreen from './components/layout/SplashScreen'

import AuthScreen         from './components/screens/AuthScreen'
import HomeScreen         from './components/screens/HomeScreen'
import CategoriesScreen   from './components/screens/CategoriesScreen'
import CategoryDetail     from './components/screens/CategoryDetail'
import AddCategory        from './components/screens/AddCategory'
import EditorScreen       from './components/screens/EditorScreen'
import SearchScreen       from './components/screens/SearchScreen'
import CalendarScreen     from './components/screens/CalendarScreen'
import StatsScreen        from './components/screens/StatsScreen'
import ProfileScreen      from './components/screens/ProfileScreen'
import GoalsScreen        from './components/screens/GoalsScreen'
import VisionBoardScreen  from './components/screens/VisionBoardScreen'
import AssistantScreen    from './components/screens/AssistantScreen'

export default function App() {
  const { user, authLoading, currentFrame } = useApp()
  const s = currentFrame.screen

  if (authLoading) return <SplashScreen />
  if (!user)       return <AuthScreen />

  return (
    <div id="app">

      {/* ── Fondo cósmico global — detrás de todo ── */}
      <StarField />

      <TopBar />
      <div className="screens">

        <div className={`screen ${s === 'home'      ? 'active' : ''}`}><HomeScreen /></div>
        <div className={`screen ${s === 'cats'      ? 'active' : ''}`}><CategoriesScreen /></div>
        <div className={`screen ${s === 'catd'      ? 'active' : ''}`}><CategoryDetail /></div>
        <div className={`screen ${s === 'addcat'    ? 'active' : ''}`}><AddCategory /></div>
        <div className={`screen ${s === 'editor'    ? 'active' : ''}`}><EditorScreen /></div>
        <div className={`screen ${s === 'search'    ? 'active' : ''}`}><SearchScreen /></div>
        <div className={`screen ${s === 'calendar'  ? 'active' : ''}`}><CalendarScreen /></div>
        <div className={`screen ${s === 'stats'     ? 'active' : ''}`}><StatsScreen /></div>
        <div className={`screen ${s === 'profile'   ? 'active' : ''}`}><ProfileScreen /></div>
        <div className={`screen ${s === 'goals'     ? 'active' : ''}`}><GoalsScreen /></div>
        <div className={`screen ${s === 'vision'    ? 'active' : ''}`}><VisionBoardScreen /></div>
        <div className={`screen ${s === 'asistente' ? 'active' : ''}`}><AssistantScreen /></div>

      </div>
      <BottomNav />
      <Toast />
    </div>
  )
}
