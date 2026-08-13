// frontend/src/components/Viajes.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './Viajes.module.css';
import MapaRecorrido, { MapaInactivo, MapaRecorridoHistorico } from './MapaRecorrido';
import {
  Truck, MapPin, User, Phone, Building2, Calendar, Clock, FileText, Search,
  Filter, MoreVertical, CheckCircle, XCircle, AlertCircle, Eye, Trash2, X,
  UserCheck, Flag, AlertTriangle, Shield, Wrench, Car,
  Grid3X3, List, DollarSign, Wallet, ChevronDown,
  UserCog, Loader2, Navigation, RefreshCw, CreditCard, BellRing
} from 'lucide-react';
import GestionPDFs from './GestionPDFs';
import { authFetch } from '../utils/authFetch';


const API_BASE = 'https://api.cooespatrans.com/api';
const API_BACKEND = 'https://app.backend.cooespatrans.com/api';

export default function Viajes({ bodegaId } = {}) {
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [viajes, setViajes] = useState([]);
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vistaGrid, setVistaGrid] = useState(true);
  const idBodegaViaje = (v) => v.bodega?._id || v.bodega?.id || null;

  const [mostrarModalCambiarConductor, setMostrarModalCambiarConductor] = useState(false);
  const [choferes, setChoferes] = useState([]);
  const [cargandoChoferes, setCargandoChoferes] = useState(false);
  const [conductorNuevo, setConductorNuevo] = useState(null);
  const [busquedaConductor, setBusquedaConductor] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [cambiandoConductor, setCambiandoConductor] = useState(false);

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarConfirmacionCompletar, setMostrarConfirmacionCompletar] = useState(false);
  const [clientesCompletados, setClientesCompletados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [mostrarModalPDFs, setMostrarModalPDFs] = useState(false);

  const [ubicacionChofer, setUbicacionChofer] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const [ubicacionActiva, setUbicacionActiva] = useState(false);
  // 🆕 Estado de conexión del chofer: 'en_movimiento' | 'detenido' | 'sin_conexion'
  const [estadoConexion, setEstadoConexion] = useState(null);
  const intervalUbicacionRef = useRef(null);
  const intervalRefreshRef = useRef(null);
  const intervalClientesRef = useRef(null);

  // 🆕 Estados para "Notificar sin señal"
  const [enviandoNotif, setEnviandoNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState(null); // { tipo: 'ok'|'error', texto }
  const [filtroBodega, setFiltroBodega] = useState('todas');
  const [soloHoy, setSoloHoy] = useState(false);

  useEffect(() => { cargarViajes(); }, []);

  useEffect(() => {
    if (!viajeSeleccionado) {
      intervalRefreshRef.current = setInterval(cargarViajesSilencioso, 5000);
    }
    return () => clearInterval(intervalRefreshRef.current);
  }, [viajeSeleccionado]);

  useEffect(() => () => {
    detenerMonitoreoUbicacion();
    detenerMonitoreoClientes();
  }, []);

  useEffect(() => {
    const handler = () => setMostrarDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const esMismoDia = (fechaViaje) => {
    if (!fechaViaje) return false;
    const hoy = new Date();
    const f = new Date(fechaViaje);
    return (
      f.getFullYear() === hoy.getFullYear() &&
      f.getMonth() === hoy.getMonth() &&
      f.getDate() === hoy.getDate()
    );
  };
  const bodegasDisponibles = Array.from(
    new Map(
      viajes
        .filter(v => v.bodega?.nombre)
        .map(v => [v.bodega.nombre, v.bodega])
    ).values()
  );
  // ─────────────────────────────────────────────────────────
  // Carga de datos
  // ─────────────────────────────────────────────────────────
  const cargarViajes = async () => {
    setCargando(true);
    try {
      const res = await authFetch(`${API_BASE}/viajes/`);
      const data = await res.json();
      setViajes(data);
    } catch { setError('Error al cargar los viajes'); }
    finally { setCargando(false); }
  };

  const cargarViajesSilencioso = async () => {
    try {
      const res = await authFetch(`${API_BASE}/viajes/`);
      const data = await res.json();
      setViajes(data);
    } catch { }
  };

  const cargarChoferes = async () => {
    setCargandoChoferes(true);
    try {
      const res = await authFetch(`${API_BASE}/viajes/choferes/disponibles`);
      const data = await res.json();
      if (data.success) setChoferes(data.choferes || []);
    } catch { }
    finally { setCargandoChoferes(false); }
  };

  // ─────────────────────────────────────────────────────────
  // Cambiar conductor
  // ─────────────────────────────────────────────────────────
  const abrirModalCambiarConductor = () => {
    setConductorNuevo(null);
    setBusquedaConductor('');
    setMostrarDropdown(false);
    setMostrarModalCambiarConductor(true);
    cargarChoferes();
  };

  const cerrarModalCambiarConductor = () => {
    setMostrarModalCambiarConductor(false);
    setConductorNuevo(null);
    setBusquedaConductor('');
    setMostrarDropdown(false);
  };

  const confirmarCambioConductor = async () => {
    if (!conductorNuevo) return alert('Selecciona un conductor');
    setCambiandoConductor(true);
    try {
      const res = await authFetch(`${API_BASE}/viajes/cambiar-conductor/${viajeSeleccionado.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choferId: conductorNuevo._id })
      });
      const data = await res.json();
      if (res.ok) {
        setViajeSeleccionado({ ...viajeSeleccionado, choferInfo: data.choferInfo || conductorNuevo });
        cerrarModalCambiarConductor();
        cargarViajes();
      } else {
        alert(`❌ ${data.error || 'Error al cambiar conductor'}`);
      }
    } catch { alert('Error de conexión'); }
    finally { setCambiandoConductor(false); }
  };

  // ─────────────────────────────────────────────────────────
  // Helpers conductor
  // ─────────────────────────────────────────────────────────
  const choferesFiltrados = choferes.filter(c => {
    const t = busquedaConductor.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(t) ||
      c.placa?.toLowerCase().includes(t) ||
      c.telefono?.includes(t)
    );
  });

  // ─────────────────────────────────────────────────────────
  // Tracking ubicación
  // ─────────────────────────────────────────────────────────
  const cargarUbicacionChofer = async (viajeId) => {
    setCargandoUbicacion(true);
    try {
      const res = await fetch(`${API_BACKEND}/ubicacion/viaje/${viajeId}`);
      if (res.ok) {
        const data = await res.json();
        setUbicacionChofer(data.success && data.data ? data.data : null);
        setUbicacionActiva(!!(data.success && data.data?.esReciente));
        setEstadoConexion(data.success && data.data ? data.data.estadoConexion : null); // 🆕
      }
    } catch { }
    finally { setCargandoUbicacion(false); }
  };

  const iniciarMonitoreoUbicacion = (viajeId) => {
    cargarUbicacionChofer(viajeId);
    clearInterval(intervalUbicacionRef.current);
    intervalUbicacionRef.current = setInterval(() => cargarUbicacionChofer(viajeId), 10000);
  };

  const detenerMonitoreoUbicacion = () => {
    clearInterval(intervalUbicacionRef.current);
    intervalUbicacionRef.current = null;
    setUbicacionChofer(null);
    setUbicacionActiva(false);
    setEstadoConexion(null); // 🆕
  };

  // ─────────────────────────────────────────────────────────
  // Monitoreo automático de clientes completados
  // ─────────────────────────────────────────────────────────
  const iniciarMonitoreoClientes = (viajeId) => {
    cargarClientesCompletados(viajeId);
    clearInterval(intervalClientesRef.current);
    intervalClientesRef.current = setInterval(
      () => cargarClientesCompletados(viajeId),
      8000
    );
  };

  const detenerMonitoreoClientes = () => {
    clearInterval(intervalClientesRef.current);
    intervalClientesRef.current = null;
  };

  // ─────────────────────────────────────────────────────────
  // Operaciones sobre viajes
  // ─────────────────────────────────────────────────────────
  const seleccionarViaje = (viaje) => {
    setViajeSeleccionado(viaje);
    setUbicacionChofer(null);
    setUbicacionActiva(false);
    if (viaje._id) {
      iniciarMonitoreoClientes(viaje._id);
      if (viaje.estado === 'aceptado') iniciarMonitoreoUbicacion(viaje._id);
    }
  };

  // ✅ FIX 1: eliminado console.log
  const cargarClientesCompletados = async (viajeId) => {
    try {
      const res = await fetch(`${API_BACKEND}/clientes/clientes-completados/${viajeId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClientesCompletados(data.clientes || []);
        }
      }
    } catch { }
  };

  const confirmarCompletarViaje = async () => {
    try {
      const res = await authFetch(`${API_BASE}/viajes/completar/${viajeSeleccionado.codigo}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'completado' })
      });
      if (res.ok) {
        alert('✅ Viaje completado');
        cargarViajes();
        setViajeSeleccionado({ ...viajeSeleccionado, estado: 'completado' });
        detenerMonitoreoUbicacion();
        detenerMonitoreoClientes();
      } else {
        const d = await res.json();
        alert(`❌ ${d.error || 'Error al completar'}`);
      }
    } catch { alert('Error al completar viaje'); }
    finally { setMostrarConfirmacionCompletar(false); }
  };

  const confirmarCancelacion = async () => {
    try {
      const res = await authFetch(`${API_BASE}/viajes/${viajeSeleccionado.codigo}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ Viaje cancelado');
        cargarViajes();
        setViajeSeleccionado(null);
        detenerMonitoreoClientes();
      }
      else alert('❌ Error al cancelar viaje');
    } catch { alert('Error al cancelar viaje'); }
    finally { setMostrarConfirmacion(false); }
  };

  // ─────────────────────────────────────────────────────────
  // 🆕 Notificar chofer sin señal
  // ─────────────────────────────────────────────────────────
  const notificarSinSenal = async () => {
    const choferId = viajeSeleccionado?.choferInfo?._id;
    if (!choferId) {
      setNotifMsg({ tipo: 'error', texto: 'Este viaje no tiene un conductor asignado.' });
      return;
    }

    setEnviandoNotif(true);
    setNotifMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://api.cooespatrans.com/api/notificaciones/sin-senal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          choferId,
          viajeId: viajeSeleccionado._id,
          codigoViaje: viajeSeleccionado.codigo,
          choferNombre: viajeSeleccionado.choferInfo?.nombre,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotifMsg({ tipo: 'ok', texto: 'Notificación enviada al conductor.' });
      } else {
        // Mensajes claros según el motivo devuelto por el backend
        setNotifMsg({ tipo: 'error', texto: data.message || 'No se pudo enviar la notificación.' });
      }
    } catch (e) {
      setNotifMsg({ tipo: 'error', texto: 'Error de red al enviar la notificación.' });
    } finally {
      setEnviandoNotif(false);
      // Ocultar el mensaje a los 5 s
      setTimeout(() => setNotifMsg(null), 5000);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Formato
  // ─────────────────────────────────────────────────────────
  const formatearPesos = (v) => {
    if (!v) return '';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v));
  };

  const formatearPesosConDecimales = (v) => {
    if (!v) return '';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
  };

  const calcularTotalesFacturas = (clientes) => {
    let totalContado = 0, totalCredito = 0;
    (clientes || []).forEach(c => {
      const tipo = c.tipoFactura?.toLowerCase() || 'contado';
      const valor = Number(c.valorARecibir) || 0;
      if (tipo === 'contado') totalContado += valor;
      else totalCredito += valor;
    });
    return { totalContado, totalCredito };
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#f59e0b';
      case 'aceptado': return '#3b82f6';
      case 'completado': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getEstadoBorder = (estado) => {
    switch (estado) {
      case 'pendiente': return '#fcd34d';
      case 'aceptado': return '#93c5fd';
      case 'completado': return '#6ee7b7';
      default: return '#d1d5db';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'pendiente': return <Clock size={14} />;
      case 'aceptado': return <AlertCircle size={14} />;
      case 'completado': return <CheckCircle size={14} />;
      default: return <XCircle size={14} />;
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'pendiente': return 'PENDIENTE';
      case 'aceptado': return 'EN CURSO';
      case 'completado': return 'COMPLETADO';
      default: return (estado || '').toUpperCase();
    }
  };

  const viajesFiltrados = viajes.filter(v => {
    const t = busqueda.toLowerCase();
    const matchBusqueda =
      v.codigo?.toLowerCase().includes(t) ||
      v.bodega?.nombre?.toLowerCase().includes(t) ||
      v.choferInfo?.nombre?.toLowerCase().includes(t) ||
      v.choferInfo?.placa?.toLowerCase().includes(t);
    const matchEstado = filtroEstado === 'todos' || v.estado === filtroEstado;
    const matchBodega = bodegaId                                   // 👈 nuevo
      ? idBodegaViaje(v) === bodegaId
      : (filtroBodega === 'todas' || v.bodega?.nombre === filtroBodega);
    const matchHoy = !soloHoy || esMismoDia(v.fecha);
    return matchBusqueda && matchEstado && matchBodega && matchHoy;
  });

  const stats = {
    total: viajes.length,
    pendiente: viajes.filter(v => v.estado === 'pendiente').length,
    aceptado: viajes.filter(v => v.estado === 'aceptado').length,
    completado: viajes.filter(v => v.estado === 'completado').length,
  };

  // ─────────────────────────────────────────────────────────
  // Selector de conductor
  // ─────────────────────────────────────────────────────────
  const SelectorConductor = () => (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <div
        onClick={() => setMostrarDropdown(!mostrarDropdown)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          cursor: 'pointer',
          border: `1.5px solid ${conductorNuevo ? '#10b981' : '#e5e7eb'}`,
          borderRadius: 9, background: '#f9fafb'
        }}
      >
        {cargandoChoferes ? (
          <>
            <Loader2 size={16} style={{ color: '#9ca3af' }} />
            <span style={{ color: '#9ca3af', fontSize: 14 }}>Cargando conductores...</span>
          </>
        ) : conductorNuevo ? (
          <>
            <UserCheck size={16} style={{ color: '#10b981' }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {conductorNuevo.nombre}
              {conductorNuevo.placa && <span style={{ fontWeight: 400, color: '#6b7280' }}> · {conductorNuevo.placa}</span>}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: conductorNuevo.disponible ? '#ecfdf5' : '#eff6ff', color: conductorNuevo.disponible ? '#059669' : '#1d4ed8' }}>
              {conductorNuevo.disponible ? 'Disponible' : 'En viaje'}
            </span>
            <ChevronDown size={14} />
          </>
        ) : (
          <>
            <User size={16} style={{ color: '#9ca3af' }} />
            <span style={{ flex: 1, fontSize: 14, color: '#9ca3af' }}>Seleccionar conductor...</span>
            <ChevronDown size={14} style={{ color: '#9ca3af' }} />
          </>
        )}
      </div>

      {mostrarDropdown && !cargandoChoferes && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
          background: 'white', border: '1.5px solid #e5e7eb',
          borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,.12)',
          maxHeight: 280, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', borderRadius: 7, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
              <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar por nombre o placa..."
                value={busquedaConductor}
                onChange={e => setBusquedaConductor(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#111827', width: '100%' }}
              />
              {busquedaConductor && (
                <button onClick={() => setBusquedaConductor('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {choferesFiltrados.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                {busquedaConductor ? 'Sin resultados' : 'No hay conductores'}
              </div>
            ) : choferesFiltrados.map(c => {
              const sel = conductorNuevo?._id === c._id;
              const esMismo = c._id?.toString() === viajeSeleccionado?.choferInfo?._id?.toString();
              return (
                <div
                  key={c._id}
                  onClick={() => { if (!esMismo) { setConductorNuevo(c); setBusquedaConductor(''); setMostrarDropdown(false); } }}
                  style={{
                    padding: '10px 14px', cursor: esMismo ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: esMismo ? 0.5 : 1,
                    background: sel ? '#f0fdf4' : 'transparent',
                    borderLeft: `3px solid ${sel ? '#10b981' : 'transparent'}`,
                    transition: 'background .15s'
                  }}
                  onMouseEnter={e => { if (!sel && !esMismo) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? '#f0fdf4' : 'transparent'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.disponible ? '#ecfdf5' : '#eff6ff', border: `1.5px solid ${c.disponible ? '#6ee7b7' : '#93c5fd'}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.disponible ? '#059669' : '#1d4ed8' }}>
                      {(c.nombre?.split(' ')[0]?.[0] || '?').toUpperCase()}
                      {(c.nombre?.split(' ')[1]?.[0] || '').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.nombre} {esMismo && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(actual)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.placa && <span style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 5, fontWeight: 600 }}>{c.placa}</span>}
                      <span style={{ color: c.disponible ? '#059669' : '#2563eb', fontWeight: 700 }}>
                        {c.disponible ? '● Disponible' : `● En viaje ${c.viajeActual?.codigoViaje || ''}`}
                      </span>
                    </div>
                  </div>
                  {!c.disponible && !esMismo && <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Cargando viajes...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Vista detalle
  // ─────────────────────────────────────────────────────────
  if (viajeSeleccionado) {
    const { totalContado, totalCredito } = calcularTotalesFacturas(viajeSeleccionado.clientes);
    const esPendiente = viajeSeleccionado.estado === 'pendiente';
    const esAceptado = viajeSeleccionado.estado === 'aceptado';
    const esCompletado = viajeSeleccionado.estado === 'completado';

    return (
      <div className={styles.container}>
        <div className={styles.detailNavigation}>
          <button
            onClick={() => {
              setViajeSeleccionado(null);
              detenerMonitoreoUbicacion();
              detenerMonitoreoClientes();
            }}
            className={styles.backButton}
          >
            ← Volver a viajes
          </button>
        </div>

        <div className={styles.detailHeader}>
          <div className={styles.detailTitle}>

            <div className={styles.titleContent}>
              <div className={styles.titleLeft}>
                <div className={styles.viajeCodeBadge}>
                  <Truck size={20} />
                  <span>Planilla {viajeSeleccionado.codigo}</span>
                </div>
                <div className={styles.estadoContainer}>
                  <div
                    className={styles.estadoBadge}
                    style={{
                      backgroundColor: `${getEstadoColor(viajeSeleccionado.estado)}15`,
                      color: getEstadoColor(viajeSeleccionado.estado),
                      borderColor: getEstadoBorder(viajeSeleccionado.estado)
                    }}
                  >
                    {getEstadoIcon(viajeSeleccionado.estado)}
                    <span>{getEstadoLabel(viajeSeleccionado.estado)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.titleRight}>
                {esPendiente && (
                  <button
                    onClick={abrirModalCambiarConductor}
                    className={styles.headerChecklistButton}
                    style={{ borderColor: '#f59e0b', color: '#d97706', background: 'white' }}
                    title="Solo disponible mientras el conductor no haya aceptado el viaje"
                  >
                    <UserCog size={16} />
                    <span>Cambiar conductor</span>
                  </button>
                )}
                <button onClick={() => setMostrarModalPDFs(true)} className={styles.headerChecklistButton}>
                  <FileText size={16} /><span>Documentos PDF</span>
                </button>
                {!esCompletado && (
                  <button onClick={() => setMostrarConfirmacion(true)} className={styles.headerCancelButton}>
                    <Trash2 size={16} /><span>Cancelar Viaje</span>
                  </button>
                )}
              </div>
            </div>

            <div className={styles.headerInfo}>
              <div className={styles.headerInfoCard}>
                <Building2 size={20} />
                <div>
                  <h4>{viajeSeleccionado.bodega?.nombre || '—'}</h4>
                  <p>{viajeSeleccionado.bodega?.direccion}</p>
                </div>
              </div>

              {viajeSeleccionado.choferInfo && (
                <div
                  className={styles.headerInfoCard}
                  style={esPendiente ? { border: '1.5px solid #fcd34d' } : {}}
                >
                  <UserCheck size={20} style={{ color: esPendiente ? '#d97706' : '#3b82f6' }} />
                  <div>
                    <h4>{viajeSeleccionado.choferInfo.nombre}</h4>
                    {viajeSeleccionado.choferInfo.telefono && <p>{viajeSeleccionado.choferInfo.telefono}</p>}
                    {esPendiente && (
                      <p style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>
                        Esperando aceptación
                      </p>
                    )}
                  </div>
                </div>
              )}

              {viajeSeleccionado.valorFlete && (
                <div className={styles.headerInfoCard}>
                  <CreditCard size={20} />
                  <div>
                    <h4>Valor del Flete</h4>
                    <p>{formatearPesos(viajeSeleccionado.valorFlete)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.headerInfo} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.875rem' }}>
              <div className={styles.headerInfoCard} style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7' }}>
                <DollarSign size={20} style={{ color: '#10b981' }} />
                <div>
                  <h4 style={{ color: '#059669' }}>Total Facturas de Contado</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#047857' }}>
                    {formatearPesosConDecimales(totalContado)}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>El chofer debe recibir este valor</p>
                </div>
              </div>
              <div className={styles.headerInfoCard} style={{ background: '#fef3c7', border: '1.5px solid #fcd34d' }}>
                <Wallet size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <h4 style={{ color: '#d97706' }}>Total Facturas de Crédito</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309' }}>
                    {formatearPesosConDecimales(totalCredito)}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>Solo referencia, no se recibe pago</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className={styles.detailContent}>
          <div className={styles.mainSection}>
            <div className={styles.section}>
              {esCompletado ? (
                <MapaRecorridoHistorico
                  viajeId={viajeSeleccionado._id}
                  choferNombre={viajeSeleccionado.choferInfo?.nombre}
                  codigoViaje={viajeSeleccionado.codigo}
                  fechaCompletado={viajeSeleccionado.fechaCompletado || viajeSeleccionado.updatedAt}
                  clientes={viajeSeleccionado.clientes}
                />
              ) : esAceptado && ubicacionChofer && estadoConexion !== 'sin_conexion' ? (
                <>
                  {/* Banner informativo cuando está detenido pero conectado */}
                  {estadoConexion === 'detenido' && (
                    <div className={styles.mapaStatusBanner} style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>
                      <div className={styles.statusIcon}><Clock size={16} /></div>
                      <div className={styles.statusText}>
                        <strong>Vehículo detenido</strong>
                        <p>El conductor está conectado pero sin movimiento</p>
                      </div>
                    </div>
                  )}
                  <MapaRecorrido
                    viajeId={viajeSeleccionado._id}
                    ubicacionActual={ubicacionChofer}
                    choferNombre={ubicacionChofer.choferNombre || viajeSeleccionado.choferInfo?.nombre}
                    codigoViaje={viajeSeleccionado.codigo}
                    onRefresh={() => cargarUbicacionChofer(viajeSeleccionado._id)}
                    cargando={cargandoUbicacion}
                  />
                </>
              ) : esAceptado ? (
                <>
                  {/* Sin conexión real: el chofer no reporta hace rato */}
                  <div className={styles.mapaStatusBanner}>
                    <div className={styles.statusIcon}><AlertCircle size={16} /></div>
                    <div className={styles.statusText}>
                      <strong>
                        Sin conexión
                        {ubicacionChofer?.minutosDesdeActualizacion != null
                          ? ` (hace ${ubicacionChofer.minutosDesdeActualizacion} min)`
                          : ''}
                      </strong>
                      <p>Mostrando último recorrido registrado</p>
                    </div>

                    {/* Botón "Notificar al conductor" — solo tiene sentido si de verdad perdió señal */}
                    <button
                      className={styles.btnNotificar}
                      onClick={notificarSinSenal}
                      disabled={enviandoNotif}
                      title="Enviar una notificación al conductor para que reabra la app"
                    >
                      <BellRing size={16} />
                      {enviandoNotif ? 'Enviando…' : 'Notificar al conductor'}
                    </button>
                  </div>

                  {notifMsg && (
                    <div
                      className={styles.notifResultado}
                      style={{
                        color: notifMsg.tipo === 'ok' ? '#15803d' : '#b91c1c',
                        background: notifMsg.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${notifMsg.tipo === 'ok' ? '#86efac' : '#fca5a5'}`,
                      }}
                    >
                      {notifMsg.texto}
                    </div>
                  )}

                  <MapaRecorridoHistorico
                    viajeId={viajeSeleccionado._id}
                    choferNombre={viajeSeleccionado.choferInfo?.nombre}
                    codigoViaje={viajeSeleccionado.codigo}
                    fechaCompletado={null}
                    clientes={viajeSeleccionado.clientes}
                    enProgreso={true}
                  />
                </>
              ) : (
                <MapaInactivo
                  viajeId={viajeSeleccionado._id}
                  estado={viajeSeleccionado.estado}
                  cantidadClientes={viajeSeleccionado.clientes?.length}
                  bodegaNombre={viajeSeleccionado.bodega?.nombre}
                />
              )}
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.section}>
              <div className={styles.clientesHeader}>
                <div className={styles.clientesTitleArea}>
                  <User size={18} />
                  <h3>Clientes del Viaje</h3>
                  <span className={styles.clientesBadge}>{viajeSeleccionado.clientes?.length || 0}</span>
                </div>
                <span className={styles.clientesSubtitle}>Toca un cliente para ver detalles</span>
              </div>
              <div className={styles.clientesListContainer}>
                <div className={styles.clientesList}>
                  {viajeSeleccionado.clientes?.map((cliente, index) => {

                    // ✅ FIX 2: matching SOLO por nunFactura — nunca por nombre
                    // Si el cliente no tiene nunFactura nunca se marca como completado
                    const facturaCliente = String(cliente.nunFactura || '').trim();
                    const cc = facturaCliente
                      ? clientesCompletados.find(x => {
                        const facturaCC = String(x.nunFactura || '').trim();
                        return facturaCC !== '' && facturaCC === facturaCliente;
                      })
                      : undefined;

                    const esContado = (cliente.tipoFactura?.toLowerCase() || 'contado') === 'contado';
                    return (
                      <div
                        key={cliente._id}
                        className={`${styles.clienteCard} ${cc ? styles.completado : ''}`}
                        onClick={() => { setClienteSeleccionado({ ...cliente, completado: cc }); setMostrarModalCliente(true); }}
                      >
                        <div className={styles.clienteCardLeft}>
                          <div className={styles.clienteNumero}><span>{index + 1}</span></div>
                          <div className={styles.clienteCardInfo}>
                            <h4>{cliente.nombre} {cliente.apellido || ''}</h4>
                            <div className={styles.clienteCardDetails}>
                              <span className={styles.clienteCardDetail}>
                                <CreditCard size={11} />Factura: {cliente.nunFactura || 'N/A'}
                              </span>
                              <span
                                className={styles.clienteCardDetail}
                                style={{
                                  background: esContado ? '#ecfdf5' : '#fef3c7',
                                  color: esContado ? '#059669' : '#d97706',
                                  border: `1px solid ${esContado ? '#6ee7b7' : '#fcd34d'}`,
                                  padding: '1px 7px', borderRadius: 6, fontWeight: 700, fontSize: '0.68rem'
                                }}
                              >
                                {esContado ? '💵 CONTADO' : `⏱️ CRÉDITO ${cliente.plazoDias || 0}d`}
                              </span>
                              {esContado && cliente.valorARecibir > 0 && (
                                <span
                                  className={styles.clienteCardDetail}
                                  style={{
                                    background: '#eff6ff', color: '#1d4ed8',
                                    border: '1px solid #93c5fd',
                                    padding: '1px 7px', borderRadius: 6, fontWeight: 700, fontSize: '0.68rem'
                                  }}
                                >
                                  {formatearPesos(cliente.valorARecibir)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={styles.clienteCardRight}>
                          {cc
                            ? <div className={styles.clienteCompletadoTag}><CheckCircle size={12} /><span>{cc.estadoEntrega}</span></div>
                            : <div className={styles.clientePendienteTag}><Clock size={12} /><span>Pendiente</span></div>
                          }
                          <Eye size={14} className={styles.clienteViewIcon} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.actionCards}>
              {esAceptado && (
                <button
                  onClick={() => setMostrarConfirmacionCompletar(true)}
                  className={`${styles.actionCard} ${styles.completeAction}`}
                >
                  <div className={styles.actionIcon}><Flag size={20} /></div>
                  <div className={styles.actionContent}>
                    <h4>Completar Viaje</h4>
                    <p>Finalizar y marcar como entregado</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ════ MODAL: Cambiar conductor ════ */}
        {mostrarModalCambiarConductor && (
          <div className={styles.modalOverlay} onClick={cerrarModalCambiarConductor}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleWithIcon}>
                  <UserCog size={22} />
                  <h3>Cambiar Conductor</h3>
                </div>
                <button onClick={cerrarModalCambiarConductor} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: '1.25rem', padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1.5px solid #e5e7eb' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: 8 }}>Conductor actual</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fef3c7', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>
                        {(viajeSeleccionado.choferInfo?.nombre?.split(' ')[0]?.[0] || '?').toUpperCase()}
                        {(viajeSeleccionado.choferInfo?.nombre?.split(' ')[1]?.[0] || '').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                        {viajeSeleccionado.choferInfo?.nombre || <em style={{ fontWeight: 400, color: '#9ca3af' }}>Sin asignar</em>}
                      </p>
                      {viajeSeleccionado.choferInfo?.placa && (
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Placa: {viajeSeleccionado.choferInfo.placa}</p>
                      )}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Nuevo conductor</p>
                <SelectorConductor />
                {conductorNuevo && !conductorNuevo.disponible && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Este conductor ya tiene asignado el viaje <strong>{conductorNuevo.viajeActual?.codigoViaje}</strong>. Puedes asignarlo de todas formas, pero tendrá dos viajes activos.
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button onClick={cerrarModalCambiarConductor} className={styles.cancelButtonModal}>Cancelar</button>
                <button
                  onClick={confirmarCambioConductor}
                  className={styles.confirmButton}
                  disabled={!conductorNuevo || cambiandoConductor || conductorNuevo?._id?.toString() === viajeSeleccionado.choferInfo?._id?.toString()}
                  style={{ background: '#111827' }}
                >
                  {cambiandoConductor ? 'Cambiando...' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ MODAL: PDFs ════ */}
        {mostrarModalPDFs && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContentLarge}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleWithIcon}>
                  <FileText size={22} />
                  <h3>Documentos PDF — {viajeSeleccionado.codigo}</h3>
                </div>
                <button onClick={() => setMostrarModalPDFs(false)} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                <GestionPDFs viajeId={viajeSeleccionado._id} codigoViaje={viajeSeleccionado.codigo} />
              </div>
            </div>
          </div>
        )}

        {/* ════ MODAL: Detalle cliente ════ */}
        {mostrarModalCliente && clienteSeleccionado && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleWithIcon}>
                  <User size={22} />
                  <h3>Detalles del Cliente</h3>
                </div>
                <button onClick={() => { setMostrarModalCliente(false); setClienteSeleccionado(null); setFotoAmpliada(null); }} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.clienteDetalleGrid}>
                  {[
                    ['Nombre', `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`],
                    ['Factura', clienteSeleccionado.nunFactura || 'N/A'],
                    ['Teléfono', clienteSeleccionado.telefono || 'N/A'],
                    ['Dirección', clienteSeleccionado.direccion || 'N/A'],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.clienteDetalleItem}>
                      <strong>{k}:</strong>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div className={styles.clienteDetalleItem}>
                    <strong>Valor:</strong>
                    <span className={styles.valorDestacado}>{formatearPesosConDecimales(clienteSeleccionado.valorARecibir || 0)}</span>
                  </div>
                  {clienteSeleccionado.completado ? (
                    <>
                      <div className={styles.seccionDivisor}><h4>Información de Entrega</h4></div>
                      <div className={styles.clienteDetalleItem}><strong>Estado:</strong><span>{clienteSeleccionado.completado.estadoEntrega}</span></div>
                      <div className={styles.clienteDetalleItem}>
                        <strong>Valor recibido:</strong>
                        <span className={styles.valorDestacado}>{formatearPesosConDecimales(clienteSeleccionado.completado.valorRecibido)}</span>
                      </div>
                      {clienteSeleccionado.completado.fotos?.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
                          <strong style={{ fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: 10 }}>
                            📷 Evidencia fotográfica ({clienteSeleccionado.completado.fotos.length} foto{clienteSeleccionado.completado.fotos.length > 1 ? 's' : ''})
                          </strong>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {clienteSeleccionado.completado.fotos.map((foto, i) => (
                              <div
                                key={foto._id || i}
                                onClick={() => setFotoAmpliada(foto.url)}
                                style={{
                                  position: 'relative', borderRadius: 10, overflow: 'hidden',
                                  width: 110, height: 110, flexShrink: 0, border: '2px solid #e5e7eb',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer'
                                }}
                              >
                                <img
                                  src={foto.url}
                                  alt={`Evidencia ${i + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0,
                                  background: 'rgba(0,0,0,0.45)', color: 'white', fontSize: 10,
                                  textAlign: 'center', padding: '3px 0', fontWeight: 600
                                }}>
                                  Foto {i + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.noCompletado}>
                      <AlertCircle size={32} />
                      <p>Este cliente aún no ha sido marcado como entregado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ════ LIGHTBOX: Ver foto ampliada ════ */}
        {fotoAmpliada && (
          <div
            onClick={() => setFotoAmpliada(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setFotoAmpliada(null)}
              style={{
                position: 'absolute', top: 20, right: 24,
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '50%', width: 40, height: 40,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 20, fontWeight: 700
              }}
            >
              ✕
            </button>
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90vw', maxHeight: '90vh',
                borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
          </div>
        )}
        {/* ════ MODAL: Confirmar cancelación ════ */}
        {mostrarConfirmacion && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleWithIcon}>
                  <Trash2 size={22} style={{ color: '#ef4444' }} />
                  <h3>Confirmar cancelación</h3>
                </div>
                <button onClick={() => setMostrarConfirmacion(false)} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ color: '#374151', fontSize: '0.925rem' }}>
                  ¿Cancelar el viaje <strong>{viajeSeleccionado.codigo}</strong>? Los clientes quedarán disponibles.
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={() => setMostrarConfirmacion(false)} className={styles.cancelButtonModal}>No</button>
                <button onClick={confirmarCancelacion} className={styles.confirmButton}>Sí, cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* ════ MODAL: Confirmar completar ════ */}
        {mostrarConfirmacionCompletar && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleWithIcon}>
                  <Flag size={22} style={{ color: '#3b82f6' }} />
                  <h3>Completar viaje</h3>
                </div>
                <button onClick={() => setMostrarConfirmacionCompletar(false)} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ color: '#374151', fontSize: '0.925rem' }}>
                  ¿Marcar el viaje <strong>{viajeSeleccionado.codigo}</strong> como completado?
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={() => setMostrarConfirmacionCompletar(false)} className={styles.cancelButtonModal}>Cancelar</button>
                <button onClick={confirmarCompletarViaje} className={styles.confirmButton} style={{ background: '#111827' }}>
                  Sí, completar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Vista lista de viajes
  // ─────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>

      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconWrap}><Truck size={26} /></div>
          <div>
            <h1 className={styles.pageTitle}>Gestión de Viajes</h1>
            <p className={styles.pageSubtitle}>Los viajes se crean desde la sección Bodegas</p>
          </div>
        </div>
        <button onClick={cargarViajes} className={styles.btnRefresh}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.statPill}>
          <Truck size={14} />
          <span className={styles.statPillNum}>{stats.total}</span>
          <span className={styles.statPillLabel}>Total</span>
        </div>
        <div className={styles.statPill} style={{ color: '#d97706' }}>
          <Clock size={14} />
          <span className={styles.statPillNum} style={{ color: '#d97706' }}>{stats.pendiente}</span>
          <span className={styles.statPillLabel}>Pendientes</span>
        </div>
        <div className={styles.statPill} style={{ color: '#2563eb' }}>
          <AlertCircle size={14} />
          <span className={styles.statPillNum} style={{ color: '#2563eb' }}>{stats.aceptado}</span>
          <span className={styles.statPillLabel}>En curso</span>
        </div>
        <div className={styles.statPill} style={{ color: '#059669' }}>
          <CheckCircle size={14} />
          <span className={styles.statPillNum} style={{ color: '#059669' }}>{stats.completado}</span>
          <span className={styles.statPillLabel}>Completados</span>
        </div>
      </div>

      <div className={styles.controlsSection}>
        <div className={styles.searchAndFilters}>
          <div className={styles.searchBox}>
            <Search size={17} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por código, bodega, conductor o placa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className={styles.searchInput}
            />
            {busqueda && (
              <button className={styles.clearSearch} onClick={() => setBusqueda('')}>
                <X size={13} />
              </button>
            )}
          </div>
          {!bodegaId && (                                    // 👈 envuelto en condición
            <div className={styles.filterGroup}>
              <Building2 size={15} style={{ color: '#9ca3af' }} />
              <select
                value={filtroBodega}
                onChange={e => setFiltroBodega(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="todas">Todas las bodegas</option>
                {bodegasDisponibles.map(b => (
                  <option key={b.nombre} value={b.nombre}>{b.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* 🆕 Toggle "Solo hoy" */}
          <button
            onClick={() => setSoloHoy(!soloHoy)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${soloHoy ? '#10b981' : '#e5e7eb'}`,
              background: soloHoy ? '#ecfdf5' : 'white',
              color: soloHoy ? '#059669' : '#6b7280',
              fontSize: 13, fontWeight: 700
            }}
          >
            <Calendar size={14} />
            Solo hoy
          </button>
        </div>
        <div className={styles.viewControls}>
          <div className={styles.viewToggle}>
            <button onClick={() => setVistaGrid(true)} className={`${styles.viewButton} ${vistaGrid ? styles.active : ''}`}><Grid3X3 size={15} /></button>
            <button onClick={() => setVistaGrid(false)} className={`${styles.viewButton} ${!vistaGrid ? styles.active : ''}`}><List size={15} /></button>
          </div>
          <div className={styles.resultsCount}>{viajesFiltrados.length} de {viajes.length} viajes</div>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertTriangle size={18} /><span>{error}</span>
        </div>
      )}

      {vistaGrid ? (
        <div className={styles.viajesGrid}>
          {viajesFiltrados.map(viaje => (
            <div key={viaje._id} className={styles.viajeCard} onClick={() => seleccionarViaje(viaje)}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <div
                    className={styles.viajeIcon}
                    style={{
                      background: `${getEstadoColor(viaje.estado)}15`,
                      borderColor: getEstadoBorder(viaje.estado),
                      color: getEstadoColor(viaje.estado)
                    }}
                  >
                    <Truck size={20} />
                  </div>
                  <span className={styles.codigoViaje}>{viaje.codigo}</span>
                </div>
                <div className={styles.cardActions}>
                  <div
                    className={styles.estadoPill}
                    style={{
                      backgroundColor: `${getEstadoColor(viaje.estado)}15`,
                      color: getEstadoColor(viaje.estado),
                      borderColor: getEstadoBorder(viaje.estado)
                    }}
                  >
                    {getEstadoIcon(viaje.estado)}<span>{getEstadoLabel(viaje.estado)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.bodegaSection}>
                  <Building2 size={14} className={styles.sectionIcon} />
                  <div className={styles.sectionContent}>
                    <h4>{viaje.bodega?.nombre}</h4>
                    <p>{viaje.bodega?.direccion}</p>
                  </div>
                </div>
                {viaje.choferInfo && (
                  <div className={styles.choferSection}>
                    <UserCheck size={13} />
                    <span className={styles.choferLabel}>Conductor:</span>
                    <span className={styles.choferNombre}>{viaje.choferInfo.nombre}</span>
                    {viaje.choferInfo.placa && (
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 4 }}>· {viaje.choferInfo.placa}</span>
                    )}
                  </div>
                )}
                <div className={styles.viajeMetrics}>
                  <div className={styles.metric}><User size={12} /><span>{viaje.clientes?.length || 0} clientes</span></div>
                  <div className={styles.metric}><Calendar size={12} /><span>{new Date(viaje.fecha).toLocaleDateString()}</span></div>
                  {viaje.valorFlete && (
                    <div className={styles.metric}><CreditCard size={12} /><span>{formatearPesos(viaje.valorFlete)}</span></div>
                  )}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button
                  onClick={e => { e.stopPropagation(); seleccionarViaje(viaje); }}
                  className={styles.viewDetailsButton}
                >
                  <Eye size={13} />Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.viajesList}>
          <div className={styles.listHeader}>
            {['Código', 'Bodega', 'Conductor', 'Clientes', 'Flete', 'Estado', 'Fecha', 'Acciones'].map(h => (
              <div key={h} className={styles.listColumn}>{h}</div>
            ))}
          </div>
          {viajesFiltrados.map(viaje => (
            <div key={viaje._id} className={styles.listRow}>
              <div className={styles.listCell}>
                <div className={styles.codeCell}><Truck size={14} /><span>{viaje.codigo}</span></div>
              </div>
              <div className={styles.listCell}>
                <span className={styles.bodegaNombre}>{viaje.bodega?.nombre}</span>
              </div>
              <div className={styles.listCell}>
                {viaje.choferInfo
                  ? `${viaje.choferInfo.nombre}${viaje.choferInfo.placa ? ` · ${viaje.choferInfo.placa}` : ''}`
                  : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.875rem' }}>Sin asignar</span>
                }
              </div>
              <div className={styles.listCell}>
                <span className={styles.clienteCount}>{viaje.clientes?.length || 0}</span>
              </div>
              <div className={styles.listCell}>
                {viaje.valorFlete ? formatearPesos(viaje.valorFlete) : <span style={{ color: '#9ca3af' }}>N/A</span>}
              </div>
              <div className={styles.listCell}>
                <div
                  className={styles.estadoPill}
                  style={{
                    backgroundColor: `${getEstadoColor(viaje.estado)}15`,
                    color: getEstadoColor(viaje.estado),
                    borderColor: getEstadoBorder(viaje.estado)
                  }}
                >
                  {getEstadoIcon(viaje.estado)}<span>{getEstadoLabel(viaje.estado)}</span>
                </div>
              </div>
              <div className={styles.listCell}>
                {new Date(viaje.fecha).toLocaleDateString()}
              </div>
              <div className={styles.listCell}>
                <button onClick={() => seleccionarViaje(viaje)} className={styles.actionButton}>
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viajesFiltrados.length === 0 && !error && (
        <div className={styles.emptyState}>
          <Truck size={50} className={styles.emptyIcon} />
          <div className={styles.emptyContent}>
            <h3>No hay viajes disponibles</h3>
            <p>Los viajes se crean desde la sección Bodegas.</p>
          </div>
        </div>
      )}
    </div>
  );
}