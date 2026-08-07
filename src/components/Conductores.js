// frontend/src/components/Conductores.js

import React, { useState, useEffect } from 'react';
import {
  UserCog, Phone, Mail, CreditCard, Truck, Search, X, MapPin,
  CheckCircle, XCircle, Clock, MoreVertical, Activity, Shield,
  AlertCircle, RefreshCw, ChevronRight, Calendar, Package,
  Info, ClipboardCheck, ClipboardX, ClipboardList,
  Navigation, Wifi, WifiOff, Download, User, FileText, Edit3, Save
} from 'lucide-react';
import Modal from './Modal';
import styles from './Conductores.module.css';
import { descargarChecklistPDF } from './checklistPdf';

const BASE_URL = 'https://app.backend.cooespatrans.com';
const API_URL = 'https://api.cooespatrans.com/api';
const URL_EDITAR = (id) => `${BASE_URL}/chofer/${id}`;
const URL_LISTA = `${BASE_URL}/chofer/todos`;

const URL_PERFIL = (id) => `${BASE_URL}/chofer/perfil-completo/${id}`;
const URL_ELIMINAR = (id) => `${BASE_URL}/chofer/${id}`;
const URL_CHECKLIST = (id) => `${BASE_URL}/api/checklist/semanal/${id}`;
const URL_DISPONIBILIDAD = `${API_URL}/viajes/choferes/disponibles`;
const URL_HISTORIAL = (id) => `${BASE_URL}/api/checklist/historial/${id}`;

// 🆕 Etiquetas legibles para cada ítem del checklist (usadas en el PDF)
const ETIQUETAS = {
  documentos: {
    licenciaConduccion: 'Licencia de conducción',
    licenciaTransito: 'Licencia de tránsito',
    tarjetaOperacion: 'Tarjeta de operación',
    seguroSOAT: 'Seguro SOAT',
    revisionTecnica: 'Revisión técnico-mecánica',
    revisionPreventiva: 'Revisión preventiva',
    polizaResponsabilidad: 'Póliza de responsabilidad',
    formatoFUEC: 'Formato FUEC',
    soporteInspeccion: 'Soporte de inspección',
    soporteLimpieza: 'Soporte de limpieza',
  },
  equipos: {
    cinturonesPito: 'Cinturones y pito',
    luces: 'Luces',
    cajaHerramientas: 'Caja de herramientas',
    gatoConos: 'Gato y conos',
    extintor: 'Extintor',
    sistemaElectrico: 'Sistema eléctrico',
    sistemasBaterias: 'Sistema de baterías',
  },
  vehiculo: {
    espejosRetrovisores: 'Espejos retrovisores',
    direccion: 'Dirección',
    inspeccionMotor: 'Inspección del motor',
    tanqueCombustible: 'Tanque de combustible',
    vidriosPanoramicos: 'Vidrios panorámicos',
    limpiaparabrisas: 'Limpiaparabrisas',
    frenosServicio: 'Frenos de servicio',
    llantasEstado: 'Estado de llantas',
  },
};


export default function Conductores() {
  const [conductores, setConductores] = useState([]);
  const [checklists, setChecklists] = useState({});
  const [disponibilidad, setDisponibilidad] = useState({});
  const [cargando, setCargando] = useState(false);
  const [cargandoChecklists, setCargandoChecklists] = useState(false);
  const [error, setError] = useState('');
  const [filtroConductores, setFiltroConductores] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState('todos');

  const [modalDetalle, setModalDetalle] = useState(false);
  const [conductorDetalle, setConductorDetalle] = useState(null);
  const [checklistDetalle, setChecklistDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null);

  // 🆕 Edición de chofer
  const [modalEditar, setModalEditar] = useState(false);
  const [formEditar, setFormEditar] = useState({
    nombre: '', email: '', cedula: '', telefono: '', direccion: '', licenciaVencimiento: '',
    placa: '', capacidad: '', soat: '', tecnomecanico: ''
  });
  const [choferAEditar, setChoferAEditar] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // 🆕 Historial de checklists por fecha
  const [historialChecklists, setHistorialChecklists] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [checklistSeleccionado, setChecklistSeleccionado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [tabActiva, setTabActiva] = useState('perfil');

  const [modalEliminar, setModalEliminar] = useState(false);
  const [conductorAEliminar, setConductorAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info', confirmColor: 'primary' });

  const mostrarAlerta = (title, message, type = 'info', confirmColor = 'primary') =>
    setAlertModal({ isOpen: true, title, message, type, confirmColor });
  const cerrarAlerta = () =>
    setAlertModal({ isOpen: false, title: '', message: '', type: 'info', confirmColor: 'primary' });

  useEffect(() => { cargarConductores(); }, []);

  useEffect(() => {
    const handler = () => { if (menuAbierto) setMenuAbierto(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuAbierto]);

  // ─── Carga ────────────────────────────────────────────────────────────────
  const cargarConductores = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await fetch(URL_LISTA);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.choferes || [];
      setConductores(lista);
      cargarTodosChecklists(lista);
      cargarDisponibilidad();
    } catch (err) {
      console.error('Error cargando conductores:', err);
      setError('No se pudieron cargar los conductores.');
    } finally {
      setCargando(false);
    }
  };

  const cargarTodosChecklists = async (lista) => {
    if (!lista?.length) return;
    setCargandoChecklists(true);
    try {
      const resultados = await Promise.allSettled(
        lista.map(c => fetch(URL_CHECKLIST(c._id)).then(r => r.json()).then(d => ({ id: c._id, data: d })))
      );
      const mapa = {};
      resultados.forEach(r => {
        if (r.status === 'fulfilled') mapa[r.value.id] = r.value.data?.success ? r.value.data.data : null;
      });
      setChecklists(mapa);
    } catch (err) {
      console.error('Error cargando checklists:', err);
    } finally {
      setCargandoChecklists(false);
    }
  };

  // 🆕 Cargar disponibilidad de todos los conductores
  const cargarDisponibilidad = async () => {
    try {
      const res = await fetch(URL_DISPONIBILIDAD);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      const mapa = {};
      (data.choferes || []).forEach(c => {
        mapa[c._id.toString()] = {
          disponible: c.disponible,
          viajeActual: c.viajeActual || null
        };
      });
      setDisponibilidad(mapa);
    } catch (err) {
      console.error('Error cargando disponibilidad:', err);
    }
  };

  // ─── Detalle ──────────────────────────────────────────────────────────────
  const verDetalle = async (conductor, e) => {
    e?.stopPropagation();
    setMenuAbierto(null);
    setModalDetalle(true);
    setCargandoDetalle(true);
    setChecklistDetalle(null);
    // 🆕 reset de historial
    setHistorialChecklists([]);
    setChecklistSeleccionado(null);
    setFechaSeleccionada('');
    setTabActiva('perfil');
    try {
      const [resPerfil, resChecklist] = await Promise.allSettled([
        fetch(URL_PERFIL(conductor._id)).then(r => r.json()),
        fetch(URL_CHECKLIST(conductor._id)).then(r => r.json()),
      ]);
      setConductorDetalle(resPerfil.status === 'fulfilled' ? (resPerfil.value.chofer || conductor) : conductor);
      setChecklistDetalle(resChecklist.status === 'fulfilled' && resChecklist.value?.success ? resChecklist.value.data : null);
      // 🆕 cargar historial en paralelo (no bloquea el perfil)
      cargarHistorial(conductor._id);
    } catch {
      setConductorDetalle(conductor);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // 🆕 Cargar historial de checklists del conductor
  const cargarHistorial = async (id) => {
    setCargandoHistorial(true);
    try {
      const res = await fetch(URL_HISTORIAL(id));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const lista = data?.success ? (data.data || data.historial || []) : (Array.isArray(data) ? data : []);
      setHistorialChecklists(lista);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorialChecklists([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // 🆕 Seleccionar un checklist por fecha
  const seleccionarChecklistFecha = (fecha) => {
    setFechaSeleccionada(fecha);
    if (!fecha) { setChecklistSeleccionado(null); return; }
    const encontrado = historialChecklists.find(
      h => new Date(h.fecha || h.fechaCreacion || h.createdAt).toISOString().slice(0, 10) === fecha
    );
    setChecklistSeleccionado(encontrado || null);
  };


  // ─── Eliminar ─────────────────────────────────────────────────────────────
  const abrirEliminar = (conductor, e) => {
    e?.stopPropagation();
    setMenuAbierto(null);
    setConductorAEliminar(conductor);
    setModalEliminar(true);
  };

  // 🆕 Abrir modal de edición precargado
  const abrirEditar = (conductor, e) => {
    e?.stopPropagation();
    setMenuAbierto(null);
    setChoferAEditar(conductor);
    setFormEditar({
      nombre: conductor.nombre || '',
      email: conductor.email || '',
      cedula: conductor.cedula || '',
      telefono: conductor.telefono || '',
      direccion: conductor.direccion || '',
      licenciaVencimiento: conductor.licenciaVencimiento || '',
      placa: conductor.vehiculo?.placa || '',
      capacidad: conductor.vehiculo?.capacidad || '',
      soat: conductor.vehiculo?.soat || '',
      tecnomecanico: conductor.vehiculo?.tecnomecanico || '',
    });
    setModalEditar(true);
  };

  // 🆕 Actualizar un campo del formulario
  const cambiarCampoEditar = (campo, valor) => {
    setFormEditar(prev => ({ ...prev, [campo]: valor }));
  };

  // 🆕 Guardar cambios
  const guardarEdicion = async () => {
    if (!formEditar.nombre.trim() || !formEditar.email.trim()) {
      mostrarAlerta('Campos requeridos', 'El nombre y el email no pueden quedar vacíos.', 'alert', 'danger');
      return;
    }
    setGuardandoEdicion(true);
    try {
      const res = await fetch(URL_EDITAR(choferAEditar._id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEditar),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        mostrarAlerta('¡Éxito!', 'Datos del conductor actualizados', 'success', 'success');
        setModalEditar(false);
        setChoferAEditar(null);
        // Si el modal de detalle está abierto sobre este chofer, refrescarlo
        if (conductorDetalle && conductorDetalle._id === choferAEditar._id) {
          setConductorDetalle(data.chofer);
        }
        await cargarConductores();
      } else {
        mostrarAlerta('Error', data.mensaje || 'No se pudo actualizar', 'alert', 'danger');
      }
    } catch {
      mostrarAlerta('Error', 'Error de conexión al actualizar', 'alert', 'danger');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      const res = await fetch(URL_ELIMINAR(conductorAEliminar._id), { method: 'DELETE' });
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Conductor eliminado del sistema', 'success', 'success');
        setModalEliminar(false);
        setConductorAEliminar(null);
        await cargarConductores();
      } else {
        const data = await res.json().catch(() => ({}));
        mostrarAlerta('Error', data.mensaje || 'No se pudo eliminar', 'alert', 'danger');
      }
    } catch {
      mostrarAlerta('Error', 'Error de conexión al eliminar', 'alert', 'danger');
    } finally {
      setEliminando(false);
    }
  };

  const toggleMenu = (id, e) => { e.stopPropagation(); setMenuAbierto(menuAbierto === id ? null : id); };

  // ─── Helpers visuales ────────────────────────────────────────────────────
  const getPerfilInfo = (c) => {
    if (!c.activo) return { label: 'Inactivo', icon: XCircle, color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' };
    if (c.perfilCompleto) return { label: 'Perfil completo', icon: CheckCircle, color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' };
    return { label: 'Perfil incompleto', icon: Clock, color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' };
  };

  // 🆕 Estado de disponibilidad
  const getDisponibilidadInfo = (conductor) => {
    const choferId = conductor._id?.toString();
    const d = disponibilidad[choferId];
    const cl = checklists[conductor._id];
    const perfilOk = conductor.perfilCompleto && conductor.activo;
    const checklistOk = cl?.activo === true;

    // Perfil incompleto o inactivo → bloquear
    if (!perfilOk) return {
      label: 'No disponible · perfil incompleto',
      icon: WifiOff, color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb'
    };

    // Checklist vencido o ausente → bloquear
    if (!checklistOk) return {
      label: 'No disponible · sin checklist',
      icon: WifiOff, color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb'
    };

    // Ambos OK: evaluar si tiene viaje activo
    if (d === undefined) return null; // disponibilidad de viajes aún cargando
    if (d.disponible) return {
      label: 'Disponible',
      icon: Wifi, color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7'
    };
    return {
      label: d.viajeActual ? `En viaje · ${d.viajeActual.codigoViaje}` : 'En viaje',
      icon: Navigation, color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd',
      viajeActual: d.viajeActual
    };
  };

  const getChecklistInfo = (choferId) => {
    const cl = checklists[choferId];
    if (cl === undefined) return null;
    if (!cl || !cl.activo) return {
      label: cl?.completo ? 'Checklist vencido' : 'Sin checklist',
      icon: cl?.completo ? ClipboardX : ClipboardList,
      color: '#ef4444', bg: '#fef2f2', border: '#fca5a5'
    };
    return {
      label: `Checklist al día${cl.diasRestantes > 0 ? ` · ${cl.diasRestantes}d` : ''}`,
      icon: ClipboardCheck,
      color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7'
    };
  };

  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  // 🆕 Render de un checklist con sus 3 secciones
  const renderChecklistDetallado = (cl) => {
    if (!cl) return null;
    const secciones = [
      { titulo: 'Documentos', obj: cl.documentos, etiquetas: ETIQUETAS.documentos },
      { titulo: 'Equipos', obj: cl.equipos, etiquetas: ETIQUETAS.equipos },
      { titulo: 'Vehículo', obj: cl.vehiculo, etiquetas: ETIQUETAS.vehiculo },
    ];
    return (
      <div className={styles.checklistDetalleWrap}>
        {secciones.map(({ titulo, obj, etiquetas }) => obj && (
          <div key={titulo} className={styles.checklistSeccion}>
            <h4 className={styles.checklistSeccionTitulo}>{titulo}</h4>
            <div className={styles.checklistItems}>
              {Object.entries(etiquetas).map(([k, label]) => {
                const ok = obj[k] === true;
                return (
                  <div key={k} className={styles.checklistItem}>
                    {ok
                      ? <CheckCircle size={14} className={styles.checkOk} />
                      : <XCircle size={14} className={styles.checkFail} />}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const conductoresFiltrados = conductores.filter(c => {
    const t = filtroConductores.toLowerCase();
    const matchTexto =
      c.nombre?.toLowerCase().includes(t) ||
      c.email?.toLowerCase().includes(t) ||
      c.cedula?.includes(t) ||
      c.telefono?.includes(t) ||
      c.vehiculo?.placa?.toLowerCase().includes(t);
    const matchEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'completo' && c.perfilCompleto && c.activo) ||
      (filtroEstado === 'incompleto' && !c.perfilCompleto && c.activo) ||
      (filtroEstado === 'inactivo' && !c.activo);

    const disp = disponibilidad[c._id?.toString()];
    const cl = checklists[c._id];
    const habilitado = c.perfilCompleto && c.activo && cl?.activo;
    const matchDisponibilidad =
      filtroDisponibilidad === 'todos' ||
      (filtroDisponibilidad === 'disponible' && habilitado && disp?.disponible) ||
      (filtroDisponibilidad === 'en_viaje' && habilitado && disp && !disp.disponible);
    return matchTexto && matchEstado && matchDisponibilidad;
  });

  const stats = {
    total: conductores.length,
    completos: conductores.filter(c => c.perfilCompleto && c.activo).length,
    incompletos: conductores.filter(c => !c.perfilCompleto && c.activo).length,
    inactivos: conductores.filter(c => !c.activo).length,
    // Ahora exigen: perfil completo + checklist activo + sin viaje activo
    disponibles: conductores.filter(c => {
      const d = disponibilidad[c._id?.toString()];
      const cl = checklists[c._id];
      return c.perfilCompleto && c.activo && cl?.activo && d?.disponible;
    }).length,
    enViaje: conductores.filter(c => {
      const d = disponibilidad[c._id?.toString()];
      const cl = checklists[c._id];
      return c.perfilCompleto && c.activo && cl?.activo && d && !d.disponible;
    }).length,
  };

  if (cargando) return (
    <div className={styles.conductores}>
      <div className={styles.loadingState}><div className={styles.spinner}></div><p>Cargando conductores...</p></div>
    </div>
  );

  return (
    <div className={styles.conductores}>

      {/* STATS STRIP — perfil */}
      <div className={styles.statsStrip}>
        <div className={`${styles.statPill} ${filtroEstado === 'todos' ? styles.statPillActive : ''}`} onClick={() => setFiltroEstado('todos')}>
          <Activity size={14} /><span className={styles.statPillNum}>{stats.total}</span><span className={styles.statPillLabel}>Total</span>
        </div>
        <div className={`${styles.statPill} ${filtroEstado === 'completo' ? styles.statPillActiveGreen : ''}`} onClick={() => setFiltroEstado('completo')}>
          <CheckCircle size={14} /><span className={styles.statPillNum}>{stats.completos}</span><span className={styles.statPillLabel}>Perfil completo</span>
        </div>
        <div className={`${styles.statPill} ${filtroEstado === 'incompleto' ? styles.statPillActiveYellow : ''}`} onClick={() => setFiltroEstado('incompleto')}>
          <Clock size={14} /><span className={styles.statPillNum}>{stats.incompletos}</span><span className={styles.statPillLabel}>Incompleto</span>
        </div>
        <div className={`${styles.statPill} ${filtroEstado === 'inactivo' ? styles.statPillActiveRed : ''}`} onClick={() => setFiltroEstado('inactivo')}>
          <XCircle size={14} /><span className={styles.statPillNum}>{stats.inactivos}</span><span className={styles.statPillLabel}>Inactivos</span>
        </div>

        {/* Filtros de disponibilidad */}
        <div style={{ width: 1, background: 'var(--color-border-tertiary)', margin: '0 4px' }} />
        <div className={`${styles.statPill} ${filtroDisponibilidad === 'disponible' ? styles.statPillActiveGreen : ''}`} onClick={() => setFiltroDisponibilidad(filtroDisponibilidad === 'disponible' ? 'todos' : 'disponible')}>
          <Wifi size={14} /><span className={styles.statPillNum}>{stats.disponibles}</span><span className={styles.statPillLabel}>Disponibles</span>
        </div>
        <div className={`${styles.statPill} ${filtroDisponibilidad === 'en_viaje' ? styles.statPillActive : ''}`} onClick={() => setFiltroDisponibilidad(filtroDisponibilidad === 'en_viaje' ? 'todos' : 'en_viaje')}>
          <Navigation size={14} /><span className={styles.statPillNum}>{stats.enViaje}</span><span className={styles.statPillLabel}>En viaje</span>
        </div>
      </div>

      {/* SEARCH */}
      <div className={styles.searchBar}>
        <div className={styles.searchBox}>
          <Search size={17} className={styles.searchIcon} />
          <input type="text" placeholder="Buscar por nombre, cédula, placa, email o teléfono..." value={filtroConductores} onChange={e => setFiltroConductores(e.target.value)} className={styles.searchInput} />
          {filtroConductores && <button className={styles.clearSearch} onClick={() => setFiltroConductores('')}><X size={13} /></button>}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} /><span>{error}</span>
          <button className={styles.retryBtn} onClick={cargarConductores}><RefreshCw size={13} /> Reintentar</button>
        </div>
      )}

      {/* GRID */}
      {conductoresFiltrados.length > 0 ? (
        <div className={styles.conductoresGrid}>
          {conductoresFiltrados.map(conductor => {
            const info = getPerfilInfo(conductor);
            const clInfo = getChecklistInfo(conductor._id);
            const dispInfo = getDisponibilidadInfo(conductor);
            const InfoIcon = info.icon;
            const ClIcon = clInfo?.icon;
            const DispIcon = dispInfo?.icon;

            return (
              <div key={conductor._id} className={styles.conductorCard} onClick={e => verDetalle(conductor, e)}>
                {/* Top */}
                <div className={styles.cardTop}>
                  <div className={styles.avatarCircle} style={{ background: `${info.color}15`, borderColor: info.border }}>
                    <span className={styles.avatarInitials} style={{ color: info.color }}>
                      {(conductor.nombre?.split(' ')[0]?.[0] || '?').toUpperCase()}
                      {(conductor.nombre?.split(' ')[1]?.[0] || '').toUpperCase()}
                    </span>
                  </div>

                  <div className={styles.cardTopRight}>
                    {/* Menú (arriba a la derecha) */}
                    <div style={{ position: 'relative' }}>
                      <button className={styles.menuBtn} onClick={e => toggleMenu(conductor._id, e)}><MoreVertical size={15} /></button>
                      {menuAbierto === conductor._id && (
                        <div className={styles.dropdownMenu}>
                          <button className={styles.dropdownItem} onClick={e => verDetalle(conductor, e)}><Info size={13} /> Ver detalle</button>
                          <button className={styles.dropdownItem} onClick={e => abrirEditar(conductor, e)}><Edit3 size={13} /> Editar</button>
                          <button className={styles.dropdownItemDanger} onClick={e => abrirEliminar(conductor, e)}><XCircle size={13} /> Eliminar</button>
                        </div>
                      )}
                    </div>

                    {/* Chips de estado (orden: disponibilidad → checklist → perfil) */}
                    <div className={styles.chipStack}>
                      {dispInfo ? (
                        <span className={styles.chip} style={{ color: dispInfo.color, background: dispInfo.bg, borderColor: dispInfo.border }}>
                          <DispIcon size={11} /> <span className={styles.chipText}>{dispInfo.label}</span>
                        </span>
                      ) : (
                        <span className={`${styles.chip} ${styles.chipLoading}`}><Clock size={11} /> <span className={styles.chipText}>Verificando…</span></span>
                      )}

                      {clInfo ? (
                        <span className={styles.chip} style={{ color: clInfo.color, background: clInfo.bg, borderColor: clInfo.border }}>
                          <ClIcon size={11} /> <span className={styles.chipText}>{clInfo.label}</span>
                        </span>
                      ) : cargandoChecklists ? (
                        <span className={`${styles.chip} ${styles.chipLoading}`}><Clock size={11} /> <span className={styles.chipText}>Checklist…</span></span>
                      ) : null}

                      <span className={styles.chip} style={{ color: info.color, background: info.bg, borderColor: info.border }}>
                        <InfoIcon size={11} /> <span className={styles.chipText}>{info.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className={styles.cardBody}>
                  <h3 className={styles.conductorNombre}>{conductor.nombre}</h3>
                  <div className={styles.detailsList}>
                    {conductor.email && <div className={styles.detailRow}><Mail size={12} /><span>{conductor.email}</span></div>}
                    {conductor.telefono && <div className={styles.detailRow}><Phone size={12} /><span>{conductor.telefono}</span></div>}
                    {conductor.cedula && <div className={styles.detailRow}><CreditCard size={12} /><span>{conductor.cedula}</span></div>}
                    {conductor.direccion && <div className={styles.detailRow}><MapPin size={12} /><span>{conductor.direccion}</span></div>}
                  </div>
                </div>

                {/* Footer */}
                <div className={styles.cardFooter}>
                  {conductor.vehiculo?.placa
                    ? <div className={styles.placaBadge}><Truck size={11} /> {conductor.vehiculo.placa}</div>
                    : <div className={styles.sinVehiculo}><Truck size={11} /> Sin vehículo</div>
                  }
                  {conductor.fechaCreacion && <span className={styles.fechaRegistro}><Calendar size={11} /> {formatFecha(conductor.fechaCreacion)}</span>}
                  <ChevronRight size={13} className={styles.arrowIcon} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          {filtroConductores || filtroEstado !== 'todos' || filtroDisponibilidad !== 'todos' ? (
            <>
              <Search size={50} className={styles.emptyIcon} />
              <h3>Sin resultados</h3>
              <p>No hay conductores con los filtros aplicados.</p>
              <button className={styles.btnSecondary} onClick={() => { setFiltroConductores(''); setFiltroEstado('todos'); setFiltroDisponibilidad('todos'); }}>Limpiar filtros</button>
            </>
          ) : (
            <>
              <UserCog size={50} className={styles.emptyIcon} />
              <h3>No hay conductores registrados</h3>
              <p>Aparecerán aquí cuando se registren desde la app móvil.</p>
              <button className={styles.btnSecondary} onClick={cargarConductores}><RefreshCw size={14} /> Actualizar</button>
            </>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {modalDetalle && (
        <div className={styles.modalOverlay} onClick={() => setModalDetalle(false)}>
          <div className={styles.modalV2} onClick={e => e.stopPropagation()}>
            {cargandoDetalle ? (
              <div className={styles.loadingModal}><div className={styles.spinner}></div><p>Cargando perfil...</p></div>
            ) : conductorDetalle && (() => {
              const info = getPerfilInfo(conductorDetalle);
              const Icon = info.icon;
              const dispInfo = getDisponibilidadInfo(conductorDetalle);

              return (
                <>
                  {/* HERO con gradiente */}
                  <div className={styles.heroHeader}>
                    <button onClick={() => abrirEditar(conductorDetalle)} className={styles.heroEdit} title="Editar"><Edit3 size={17} /></button>
                    <button onClick={() => setModalDetalle(false)} className={styles.heroClose}><X size={20} /></button>
                    <div className={styles.heroAvatar}>
                      <span>
                        {(conductorDetalle.nombre?.split(' ')[0]?.[0] || '?').toUpperCase()}
                        {(conductorDetalle.nombre?.split(' ')[1]?.[0] || '').toUpperCase()}
                      </span>
                    </div>
                    <h2 className={styles.heroNombre}>{conductorDetalle.nombre}</h2>
                    <div className={styles.heroBadges}>
                      <span className={styles.heroBadge} style={{ color: info.color, background: info.bg, borderColor: info.border }}>
                        <Icon size={12} /> {info.label}
                      </span>
                      {dispInfo && (
                        <span className={styles.heroBadge} style={{ color: dispInfo.color, background: dispInfo.bg, borderColor: dispInfo.border }}>
                          <dispInfo.icon size={12} /> {dispInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TABS */}
                  <div className={styles.tabsBar}>
                    <button
                      className={`${styles.tabBtn} ${tabActiva === 'perfil' ? styles.tabBtnActive : ''}`}
                      onClick={() => setTabActiva('perfil')}
                    >
                      <User size={15} /> Perfil
                    </button>
                    <button
                      className={`${styles.tabBtn} ${tabActiva === 'checklist' ? styles.tabBtnActive : ''}`}
                      onClick={() => setTabActiva('checklist')}
                    >
                      <ClipboardCheck size={15} /> Checklist
                    </button>
                    <button
                      className={`${styles.tabBtn} ${tabActiva === 'vehiculo' ? styles.tabBtnActive : ''}`}
                      onClick={() => setTabActiva('vehiculo')}
                    >
                      <Truck size={15} /> Vehículo
                    </button>
                  </div>

                  {/* CONTENIDO DE TABS */}
                  <div className={styles.tabContent}>

                    {/* ── TAB PERFIL ── */}
                    {tabActiva === 'perfil' && (
                      <div className={styles.tabPane}>


                        {/* Datos personales */}
                        <div className={styles.paneSeccion}>
                          <p className={styles.paneTitulo}><span className={styles.accentBlue}></span> Datos Personales</p>
                          <div className={styles.detalleGrid}>
                            {[
                              { icon: Mail, label: 'Email', val: conductorDetalle.email },
                              { icon: CreditCard, label: 'Cédula', val: conductorDetalle.cedula },
                              { icon: Phone, label: 'Teléfono', val: conductorDetalle.telefono },
                              { icon: MapPin, label: 'Dirección', val: conductorDetalle.direccion },
                              { icon: Shield, label: 'Venc. Licencia', val: conductorDetalle.licenciaVencimiento },
                              { icon: Calendar, label: 'Fecha registro', val: formatFecha(conductorDetalle.fechaCreacion) },
                            ].map(({ icon: ItemIcon, label, val }) => (
                              <div className={styles.detalleItem} key={label}>
                                <ItemIcon size={14} />
                                <div><small>{label}</small><span>{val || <em className={styles.sinDato}>No registrado</em>}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── TAB CHECKLIST ── */}
                    {tabActiva === 'checklist' && (
                      <div className={styles.tabPane}>
                        {/* Estado del checklist actual */}
                        <div className={styles.paneSeccion}>
                          <p className={styles.paneTitulo}><span className={styles.accentGreen}></span> Checklist Semanal Actual</p>
                          {checklistDetalle ? (
                            <div className={`${styles.statusCard} ${checklistDetalle.activo ? styles.statusOk : styles.statusBad}`}>
                              {checklistDetalle.activo ? <ClipboardCheck size={26} color="#10b981" /> : <ClipboardX size={26} color="#ef4444" />}
                              <div>
                                <strong style={{ color: checklistDetalle.activo ? '#059669' : '#dc2626' }}>
                                  {checklistDetalle.activo ? 'Checklist al día' : 'Checklist vencido'}
                                </strong>
                                <p>{checklistDetalle.activo ? `Válido por ${checklistDetalle.diasRestantes} día${checklistDetalle.diasRestantes !== 1 ? 's' : ''} más` : 'Debe renovarlo desde la app'}</p>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.sinChecklistMsg}><ClipboardList size={22} /><p>No ha completado el checklist semanal.</p></div>
                          )}
                        </div>

                        {/* Descargar por fecha */}
                        <div className={styles.paneSeccion}>
                          <p className={styles.paneTitulo}><span className={styles.accentIndigo}></span> Descargar Checklist por Fecha</p>

                          {cargandoHistorial ? (
                            <div className={styles.sinChecklistMsg}><Clock size={22} /><p>Cargando historial...</p></div>
                          ) : historialChecklists.length > 0 ? (
                            <div className={styles.descargaBox}>
                              <div className={styles.descargaRow}>
                                <div className={styles.descargaSelectWrap}>
                                  <Calendar size={16} className={styles.descargaSelectIcon} />
                                  <select
                                    className={styles.historialSelect}
                                    value={fechaSeleccionada}
                                    onChange={e => seleccionarChecklistFecha(e.target.value)}
                                  >
                                    <option value="">Selecciona una fecha…</option>
                                    {historialChecklists.map((h, i) => {
                                      const raw = h.fecha || h.fechaCreacion || h.createdAt;
                                      const iso = raw ? new Date(raw).toISOString().slice(0, 10) : `item-${i}`;
                                      return (
                                        <option key={iso + i} value={iso}>
                                          {formatFecha(raw)}{h.activo ? ' · al día' : ' · vencido'}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                                <button
                                  className={styles.btnDescargarPdf}
                                  disabled={!checklistSeleccionado}
                                  onClick={() => descargarChecklistPDF(conductorDetalle, checklistSeleccionado, mostrarAlerta)}
                                >
                                  <Download size={16} /> Descargar PDF
                                </button>
                              </div>
                              {fechaSeleccionada && !checklistSeleccionado && (
                                <p className={styles.descargaHint}>No se encontró checklist para esa fecha.</p>
                              )}
                              {checklistSeleccionado && (
                                <p className={styles.descargaOk}>
                                  <FileText size={13} /> Listo para descargar el checklist del {formatFecha(checklistSeleccionado.fecha || checklistSeleccionado.fechaCreacion || checklistSeleccionado.createdAt)}.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className={styles.sinChecklistMsg}><ClipboardList size={22} /><p>No hay checklists anteriores registrados.</p></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── TAB VEHÍCULO ── */}
                    {tabActiva === 'vehiculo' && (
                      <div className={styles.tabPane}>
                        <div className={styles.paneSeccion}>
                          <p className={styles.paneTitulo}><span className={styles.accentAmber}></span> Información del Vehículo</p>
                          {conductorDetalle.vehiculo?.placa ? (
                            <div className={styles.detalleGrid}>
                              {[
                                { icon: Truck, label: 'Placa', val: conductorDetalle.vehiculo.placa, bold: true },
                                { icon: Package, label: 'Capacidad', val: conductorDetalle.vehiculo.capacidad ? `${conductorDetalle.vehiculo.capacidad} unid.` : null },
                                { icon: Shield, label: 'Venc. SOAT', val: conductorDetalle.vehiculo.soat },
                                { icon: CheckCircle, label: 'Venc. Tecno.', val: conductorDetalle.vehiculo.tecnomecanico },
                              ].map(({ icon: ItemIcon, label, val, bold }) => (
                                <div className={styles.detalleItem} key={label}>
                                  <ItemIcon size={14} />
                                  <div><small>{label}</small><span className={bold ? styles.placaTexto : ''}>{val || <em className={styles.sinDato}>No registrado</em>}</span></div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.sinVehiculoMsg}><Truck size={26} /><p>El conductor aún no ha registrado su vehículo.</p></div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR ── */}
      {modalEditar && (
        <div className={styles.modalOverlay} onClick={() => setModalEditar(false)}>
          <div className={styles.modalV2} onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className={styles.editHeader}>
              <div className={styles.editHeaderTitle}>
                <Edit3 size={18} />
                <h3>Editar conductor</h3>
              </div>
              <button onClick={() => setModalEditar(false)} className={styles.heroClose}><X size={20} /></button>
            </div>

            <div className={styles.tabContent}>
              {/* Datos personales */}
              <div className={styles.paneSeccion}>
                <p className={styles.paneTitulo}><span className={styles.accentBlue}></span> Datos Personales</p>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>Nombre completo *</span>
                    <input value={formEditar.nombre} onChange={e => cambiarCampoEditar('nombre', e.target.value)} placeholder="Nombre completo" />
                  </label>
                  <label className={styles.formField}>
                    <span>Email *</span>
                    <input type="email" value={formEditar.email} onChange={e => cambiarCampoEditar('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </label>
                  <label className={styles.formField}>
                    <span>Cédula</span>
                    <input value={formEditar.cedula} onChange={e => cambiarCampoEditar('cedula', e.target.value)} placeholder="Número de cédula" />
                  </label>
                  <label className={styles.formField}>
                    <span>Teléfono</span>
                    <input value={formEditar.telefono} onChange={e => cambiarCampoEditar('telefono', e.target.value)} placeholder="Número de teléfono" />
                  </label>
                  <label className={styles.formField}>
                    <span>Dirección</span>
                    <input value={formEditar.direccion} onChange={e => cambiarCampoEditar('direccion', e.target.value)} placeholder="Dirección" />
                  </label>
                  <label className={styles.formField}>
                    <span>Venc. Licencia (DD/MM/AAAA)</span>
                    <input value={formEditar.licenciaVencimiento} onChange={e => cambiarCampoEditar('licenciaVencimiento', e.target.value)} placeholder="DD/MM/AAAA" />
                  </label>
                </div>
              </div>

              {/* Vehículo */}
              <div className={styles.paneSeccion}>
                <p className={styles.paneTitulo}><span className={styles.accentAmber}></span> Vehículo</p>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>Placa</span>
                    <input value={formEditar.placa} onChange={e => cambiarCampoEditar('placa', e.target.value)} placeholder="ABC123" style={{ textTransform: 'uppercase' }} />
                  </label>
                  <label className={styles.formField}>
                    <span>Capacidad (unidades)</span>
                    <input type="number" min="1" value={formEditar.capacidad} onChange={e => cambiarCampoEditar('capacidad', e.target.value)} placeholder="Ej. 40" />
                  </label>
                  <label className={styles.formField}>
                    <span>Venc. SOAT (DD/MM/AAAA)</span>
                    <input value={formEditar.soat} onChange={e => cambiarCampoEditar('soat', e.target.value)} placeholder="DD/MM/AAAA" />
                  </label>
                  <label className={styles.formField}>
                    <span>Venc. Tecnomecánica (DD/MM/AAAA)</span>
                    <input value={formEditar.tecnomecanico} onChange={e => cambiarCampoEditar('tecnomecanico', e.target.value)} placeholder="DD/MM/AAAA" />
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.editFooter}>
              <button className={styles.btnCancel} onClick={() => setModalEditar(false)} disabled={guardandoEdicion}>Cancelar</button>
              <button className={styles.btnGuardar} onClick={guardarEdicion} disabled={guardandoEdicion}>
                <Save size={16} /> {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL ELIMINAR ── */}
      <Modal
        isOpen={modalEliminar}
        onClose={() => { setModalEliminar(false); setConductorAEliminar(null); }}
        onConfirm={confirmarEliminar}
        title="Eliminar conductor"
        message={`¿Eliminar a ${conductorAEliminar?.nombre}? Esta acción no se puede deshacer.`}
        confirmText={eliminando ? 'Eliminando...' : 'Sí, eliminar'}
        cancelText="Cancelar"
        type="warning"
        confirmColor="danger"
      />

      {/* ── ALERTAS ── */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={cerrarAlerta}
        onConfirm={cerrarAlerta}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Aceptar"
        type={alertModal.type}
        confirmColor={alertModal.confirmColor}
        showCloseButton={true}
      />
    </div>
  );
}