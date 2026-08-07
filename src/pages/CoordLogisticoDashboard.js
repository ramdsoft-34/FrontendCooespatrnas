// frontend/src/pages/CoordLogisticoDashboard.js
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard del Coordinador Logístico.
// Unifica los módulos del rol `user` (Panel, Cargar, Bodegas, Viajes,
// Conductores, Reportes) con los del rol `adminSede` (Seguimiento, Manifiestos,
// Mensajes), reutilizando exactamente los mismos componentes de cada rol.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  LayoutDashboard,
  Upload,
  Route,
  FileText,
  LogOut,
  Menu,
  X,
  UserCog,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';
import styles from './Dashboard.module.css';

// Módulos del rol USER
import Panel from '../components/Panel';
import Cargar from '../components/Cargar';
import Bodegas from '../components/Bodegas';
import Viajes from '../components/Viajes';
import Reportes from '../components/Reportes';
import Conductores from '../components/Conductores';
import Modal from '../components/Modal';

// Módulos del rol ADMIN DE SEDE
import { SeguimientoPlanillas } from './AdminSedeDashboard';
import GestionManifiestos from '../admin/GestionManifiestos';
import ChatMessenger from './ChatMessenger';

export default function CoordLogisticoDashboard({ user, onLogout }) {
  const [active, setActive] = useState('panel');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    // ── Módulos heredados de USER ──────────────────────────────
    { id: 'panel',        label: 'Panel',        icon: LayoutDashboard },
    { id: 'cargar',       label: 'Cargar',       icon: Upload },
    { id: 'Bodegas',      label: 'Bodegas',      icon: Warehouse },
    { id: 'Viajes',       label: 'Viajes',       icon: Route },
    { id: 'conductores',  label: 'Conductores',  icon: UserCog },
    { id: 'reportes',     label: 'Reportes',     icon: FileText },
    // ── Módulos heredados de ADMIN DE SEDE ─────────────────────
    { id: 'seguimiento',  label: 'Seguimiento',  icon: ClipboardList },
    { id: 'manifiestos',  label: 'Manifiestos',  icon: FileText },
    { id: 'mensajes',     label: 'Mensajes',     icon: MessageSquare },
  ];

  const renderSection = () => {
    switch (active) {
      case 'panel':        return <Panel user={user} />;
      case 'cargar':       return <Cargar />;
      case 'Bodegas':      return <Bodegas />;
      case 'Viajes':       return <Viajes />;
      case 'conductores':  return <Conductores />;
      case 'reportes':     return <Reportes />;
      case 'seguimiento':  return <SeguimientoPlanillas user={user} />;
      case 'manifiestos':  return <GestionManifiestos user={user} />;
      case 'mensajes':     return <ChatMessenger user={user} />;
      default:             return <Panel user={user} />;
    }
  };

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    if (onLogout) onLogout();
    else navigate('/');
  };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // El módulo de Mensajes necesita ocupar todo el alto sin padding.
  const contentStyle = active === 'mensajes'
    ? { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }
    : {};

  return (
    <div className={styles.dashboard}>
      <button
        className={styles.mobileMenuBtn}
        onClick={toggleSidebar}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${sidebarHovered ? styles.sidebarExpanded : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>C</span>
            <span className={styles.titleText}>COOESPATRANS</span>
          </h2>
          <button
            className={styles.closeSidebar}
            onClick={toggleSidebar}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setSidebarOpen(false);
                }}
                className={`${styles.navButton} ${active === item.id ? styles.active : ''}`}
                aria-current={active === item.id ? 'page' : undefined}
                title={item.label}
              >
                <IconComponent size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleLogoutClick}
          className={styles.logout}
          title="Cerrar sesión"
        >
          <LogOut size={20} className={styles.logoutIcon} />
          <span className={styles.logoutLabel}>Cerrar sesión</span>
        </button>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentWrapper} style={contentStyle}>
          {renderSection()}
        </div>
      </main>

      <Modal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        title="Cerrar sesión"
        message="¿Está seguro que desea cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        type="warning"
        confirmColor="danger"
      />
    </div>
  );
}
