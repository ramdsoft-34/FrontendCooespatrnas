// App.js
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSedeDashboard from './pages/AdminSedeDashboard';
import SedeDashboard from './pages/SedeDashboard';
import CoordLogisticoDashboard from './pages/CoordLogisticoDashboard';
import ManifiestoPage from './pages/ManifiestoPage';
import PrivacidadAPP from './pages/PrivacidadAPP';
import JefeBodegaDashboard from './pages/JefeBodegaDashboard';
import './App.css';

function routeForRole(role) {
  switch (role) {
    case 'admin':          return '/admin';
    case 'adminSede':      return '/adminSede';
    case 'sede':           return '/sede';
    case 'userManifiesto': return '/manifiestos';
    case 'coordLogistico': return '/coordinador';
    case 'jefeBodega':     return '/jefeBodega';
    default:               return '/dashboard';
  }
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/"               element={<LandingPage />} />
        <Route path="/login"          element={<LoginWrapper />} />
        <Route path="/dashboard"      element={<DashboardWrapper />} />
        <Route path="/admin"          element={<AdminWrapper />} />
        <Route path="/adminSede"      element={<AdminSedeWrapper />} />
        <Route path="/sede"           element={<SedeWrapper />} />
        <Route path="/coordinador"    element={<CoordLogisticoWrapper />} />
        <Route path="/manifiestos"    element={<ManifiestoWrapper />} />
        <Route path="/privacidadAPP"  element={<PrivacidadAPP />} />
        <Route path="/jefeBodega" element={<JefeBodegaWrapper />} />
        <Route path="*"               element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function useLogout() {
  const navigate = useNavigate();
  return () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    navigate('/', { replace: true });
    window.history.pushState(null, '', window.location.href);
  };
}

function blockBackButton() {
  window.history.pushState(null, '', window.location.href);
}

function LoginWrapper() {
  const navigate = useNavigate();
  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    navigate(routeForRole(user.role), { replace: true });
  };
  return <Login onLoginSuccess={handleLoginSuccess} />;
}

function DashboardWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'user') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <Dashboard user={user} onLogout={onLogout} />;
}

function AdminWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'admin') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <AdminDashboard user={user} onLogout={onLogout} />;
}

function AdminSedeWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'adminSede') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <AdminSedeDashboard user={user} onLogout={onLogout} />;
}

function SedeWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'sede') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <SedeDashboard user={user} onLogout={onLogout} />;
}

function CoordLogisticoWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'coordLogistico') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <CoordLogisticoDashboard user={user} onLogout={onLogout} />;
}

function JefeBodegaWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'jefeBodega') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <JefeBodegaDashboard user={user} onLogout={onLogout} />;
}

// ── MANIFIESTO WRAPPER ────────────────────────────────────────────────────
function ManifiestoWrapper() {
  const navigate = useNavigate();
  const onLogout = useLogout();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { navigate('/', { replace: true }); return; }
    if (user.role !== 'userManifiesto') { navigate(routeForRole(user.role), { replace: true }); return; }
    blockBackButton();
    window.addEventListener('popstate', blockBackButton);
    return () => window.removeEventListener('popstate', blockBackButton);
  }, []);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return <ManifiestoPage user={user} onLogout={onLogout} />;
}

export default App;