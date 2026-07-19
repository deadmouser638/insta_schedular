import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Shell from './components/layout/Shell'
import ProtectedRoute from './components/ProtectedRoute'

const Queue = lazy(() => import('./pages/Queue'))
const Compose = lazy(() => import('./pages/Compose'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Connect = lazy(() => import('./pages/Connect'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-zinc-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      }>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<Shell />}>
              <Route path="/" element={<Queue />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/settings" element={<Settings />} />
              {/* Fallback to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
