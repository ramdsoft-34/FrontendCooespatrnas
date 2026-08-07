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
  Activity
} from 'lucide-react';
import styles from './Dashboard.module.css';
import Panel from '../components/Panel';
import Cargar from '../components/Cargar';
import Bodegas from '../components/Bodegas';
import Viajes from '../components/Viajes';
import Reportes from '../components/Reportes';
import Modal from '../components/Modal';
import Conductores from '../components/Conductores';


export default function Dashboard({ user, onLogout }) {
  const [active, setActive] = useState('panel');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'panel', label: 'Panel', icon: LayoutDashboard },
    { id: 'cargar', label: 'Cargar', icon: Upload },
    { id: 'Bodegas', label: 'Bodegas', icon: Warehouse },
    { id: 'Viajes', label: 'Viajes', icon: Route },
    { id: 'conductores', label: 'Conductores', icon: UserCog },
    { id: 'reportes', label: 'Reportes', icon: FileText },
  ];

  const renderSection = () => {
    switch (active) {
      case 'panel': return <Panel user={user} />;
      case 'cargar': return <Cargar />;
      case 'Bodegas': return <Bodegas />;
      case 'Viajes': return <Viajes />;
      case 'conductores': return <Conductores />;
      case 'reportes': return <Reportes />;
      default: return <Panel user={user} />;
    }
  };

  // MODIFICADO: Ahora abre el modal en lugar de window.confirm
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // NUEVO: Confirmar cierre de sesión
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  // NUEVO: Cancelar cierre de sesión
  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMouseEnter = () => {
    setSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    setSidebarHovered(false);
  };

  return (
    <div className={styles.dashboard}>
      {/* Mobile menu button */}
      <button
        className={styles.mobileMenuBtn}
        onClick={toggleSidebar}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${sidebarHovered ? styles.sidebarExpanded : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
        <div className={styles.contentWrapper}>
          {renderSection()}
        </div>
      </main>

      {/* NUEVO: Modal de confirmación de cierre de sesión */}
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