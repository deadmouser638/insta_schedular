import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toast } from './components/ui/Toast';
import { useAuthStore } from './stores/authStore';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Queue = lazy(() => import('./pages/Queue').then(m => ({ default: m.Queue })));
const Compose = lazy(() => import('./pages/Compose').then(m => ({ default: m.Compose })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Connect = lazy(() => import('./pages/Connect').then(m => ({ default: m.Connect })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

function App() {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-bold text-gray-400 animate-pulse tracking-wide">Loading IG Scheduler...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/" element={<Queue />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
      <Toast />
    </BrowserRouter>
  );
}

export default App;
