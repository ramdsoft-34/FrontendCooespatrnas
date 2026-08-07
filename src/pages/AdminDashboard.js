import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  Shield,FileText, MapPin,
} from 'lucide-react';
import styles from './AdminDashboard.module.css';
import Modal from '../components/Modal';
import ManifiestoCorreo from '../admin/ManifiestoCorreo'; 
import GestionUsuarios from '../admin/GestionUsuarios';
import GestionSedes from '../admin/GestionSedes'; 

export default function AdminDashboard({ user, onLogout }) {
  const [active, setActive] = useState('panel');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 'panel',        label: 'Panel',        icon: LayoutDashboard },
    { id: 'usuarios',     label: 'Usuarios',      icon: Users           },
    { id: 'manifiestos', label: 'Manifiestos', icon: FileText },
    { id: 'sedes',        label: 'Sedes',         icon: MapPin          }, 
  ];

  const renderSection = () => {
    switch (active) {
      case 'panel':        return <div />;
      case 'manifiestos': return <ManifiestoCorreo />;
      case 'usuarios': return <GestionUsuarios />;
      case 'sedes': return <GestionSedes />;
      default:             return <div />;
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    } else {
      navigate('/');
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Mobile menu button */}
      <button
        className={styles.mobileMenuBtn}
        onClick={() => setSidebarOpen(!sidebarOpen)}
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
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>A</span>
            <span className={styles.titleText}>COOESPATRANS</span>
          </h2>
          <button
            className={styles.closeSidebar}
            onClick={() => setSidebarOpen(false)}
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
          onClick={() => setShowLogoutModal(true)}
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

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
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