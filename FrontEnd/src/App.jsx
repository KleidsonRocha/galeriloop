import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './utils/ProtectedRoute'

// Lazy loading dos componentes
const Login = lazy(() => import('./components/Login/Login'))
const Home = lazy(() => import('./components/Home/Home'))
const About = lazy(() => import('./components/About/About'))
const Settings = lazy(() => import('./components/settings/Settings'))
const AlbumDetails = lazy(() => import('./components/Album/AlbumDetails'))
const SharedAlbum = lazy(() => import('./components/SharedAlbum/SharedAlbum'))  

function App() {
  return (
    <div className="App">
      <Suspense fallback={<div>Carregando...</div>}>
        <Routes>
          {/* Rota pública */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/shared/:token" element={<SharedAlbum />} /> 

          {/* Rota protegida */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/album/:id" element={<ProtectedRoute><AlbumDetails /></ProtectedRoute>} /> {/* Rota dinâmica */}
        </Routes>
      </Suspense>
    </div>
  )
}

export default App