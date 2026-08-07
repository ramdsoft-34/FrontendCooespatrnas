import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, LogOut, Menu, X, Save, Edit2, Lock,
  Plus, AlertCircle, RefreshCw, MapPin, Search,
  ChevronLeft, ChevronRight, CheckCircle, Building2,
} from 'lucide-react';
import styles from './SedeDashboard.module.css';

const API = 'https://api.cooespatrans.com/api';

const token = () => localStorage.getItem('token');
const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});

const fmtDate = (d) => {
  if (!d) return '—';
  const str = typeof d === 'string' ? d : new Date(d).toISOString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, day] = match.map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const fmtMoney = (n) =>
  n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—';

const calcAlerta = (limiteEntrega, fechaLegalizacionReal) => {
  if (fechaLegalizacionReal) return '';
  if (!limiteEntrega) return '';
  const [y, m, d] = limiteEntrega.slice(0, 10).split('-').map(Number);
  const limite = new Date(y, m - 1, d);
  const hoy = new Date();
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diffDias = Math.ceil((hoyLocal - limite) / (1000 * 60 * 60 * 24));
  return diffDias > 0 ? `VENCIDA HACE ${diffDias} DÍA${diffDias !== 1 ? 'S' : ''}` : '';
};

const LOCKABLE = [
  'planilla', 'empresa', 'placaMula', 'nombreConductorMula',
  'nroFacturaMula', 'novedadesAverias', 'valorAverias',
  'conductorRuta', 'placaTrasbordo', 'planillaTrasbordo',
  'tipoViaje', 'nroManifiesto',
  'fechaSalidaRuta', 'ruta', 'plazoMaximo',
  'limiteEntrega', 'flete', 'anticipo', 'ajusteAutorizado',
  'retencion',
  'alertaLegalizacion', 'fechaLegalizacion',
  'fechaLegalizacionReal',
  'estadoLegalizacion',
  'nroFacturaCorbeta', 'valorFacturaCorbeta', 'observaciones',
  'nroFacturaPago', 'fechaPago', 'valorPagado', 'observacionesCruze',
  'credito', 'contado',
];

const EMPRESAS = [
  'CORBETA',
  'DISTRIBUIDORA DULCES Y DULCES',
  'NUTRISUR',
  'DSIERRA SAS',
  'DISTRIBUIDORA CARLOS VEINTIMILLA',
  'SURTIVENTAS',
  'ALPINA',
];

const EMPTY_FORM = {
  empresa: '', planilla: '', placaMula: '', nroFacturaMula: '',
  novedadesAverias: '', valorAverias: '',
  nombreConductorMula: '',
  conductorRuta: '', placaTrasbordo: '', planillaTrasbordo: '',
  tipoViaje: '', nroManifiesto: '',
  fechaSalidaRuta: '', ruta: '', plazoMaximo: '',
  limiteEntrega: '', flete: '', anticipo: '',
  ajusteAutorizado: '',
  retencion: '0',
  saldoPagar: '0',
  alertaLegalizacion: '',
  fechaLegalizacion: '',
  fechaLegalizacionReal: '',
  estadoLegalizacion: '',
  nroFacturaCorbeta: '', valorFacturaCorbeta: '', observaciones: '',
  novedades: [],
  novedadesLegalizacion: [],
  nroFacturaPago: '',
  fechaPago: '',
  valorPagado: '',
  utilidad: '0',
  observacionesCruze: '',
  credito: '',
  contado: '',
};

const UPPERCASE_EXCLUDE = ['tipoViaje'];
const parseMoney = (val) =>
  Number((val || '').toString().replace(/\./g, '').replace(',', '.')) || 0;
const PAGE_SIZE = 20;

const novedadTieneContenido = (n) =>
  !!(n.planilla?.trim() || n.descripcion?.trim() || String(n.valor ?? '').trim());

// ── Toast de notificaciones ───────────────────────────────────────────────────
const toastStyles = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    pointerEvents: 'none',
  },
  base: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    fontSize: 13,
    fontWeight: 500,
    maxWidth: 360,
    lineHeight: 1.4,
    pointerEvents: 'auto',
    animation: 'slideInToast 0.25s ease',
  },
  success: {
    background: '#f0fdf4',
    border: '1.5px solid #86efac',
    color: '#166534',
  },
  error: {
    background: '#fff1f2',
    border: '1.5px solid #fca5a5',
    color: '#991b1b',
  },
  info: {
    background: '#eff6ff',
    border: '1.5px solid #93c5fd',
    color: '#1e40af',
  },
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <>
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <div style={toastStyles.container}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ ...toastStyles.base, ...toastStyles[t.type] }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {t.type === 'success' && <CheckCircle size={16} />}
              {t.type === 'error' && <AlertCircle size={16} />}
              {t.type === 'info' && <RefreshCw size={16} />}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'inherit', opacity: 0.6, padding: '0 0 0 6px',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export default function SedeDashboard({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);

  const sedeUsuario = user?.sedeNombre || '';
  const esSede = user?.role === 'sede';

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [formError, setFormError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);

  const { toasts, addToast, removeToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/planillas`, { headers: hdrs() });
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error(e);
      addToast('No se pudo actualizar la lista de planillas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [busqueda]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditTarget(null);
    setFormError('');
    setFileToUpload(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    const f = { ...EMPTY_FORM };
    LOCKABLE.forEach(k => {
      if (p[k] !== undefined && p[k] !== null) {
        if (k.toLowerCase().includes('fecha') && p[k]) {
          const str = typeof p[k] === 'string' ? p[k] : new Date(p[k]).toISOString();
          const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
          f[k] = match ? match[1] : str.slice(0, 10);
        } else {
          f[k] = p[k];
        }
      }
    });

    f.novedades = Array.isArray(p.novedades)
      ? p.novedades.map(n => ({ ...n, _locked: novedadTieneContenido(n) }))
      : [];

    f.novedadesLegalizacion = Array.isArray(p.novedadesLegalizacion)
      ? p.novedadesLegalizacion.map(n => ({ ...n, _locked: novedadTieneContenido(n) }))
      : [];

    f.nroFacturaPago = p.nroFacturaPago || '';
    f.valorFacturaCorbeta = p.valorFacturaCorbeta != null ? p.valorFacturaCorbeta : '';
    f.valorPagado = p.valorPagado != null ? p.valorPagado : '';
    f.utilidad = p.utilidad != null ? p.utilidad : '0';
    f.observacionesCruze = p.observacionesCruze || '';
    f.credito = p.credito != null ? p.credito : '';
    f.contado = p.contado != null ? p.contado : '';
    f.saldoPagar = p.saldoPagar != null ? p.saldoPagar : '0';
    f.retencion = p.retencion != null ? p.retencion : '0';
    f.limiteEntrega = p.limiteEntrega
      ? (typeof p.limiteEntrega === 'string'
        ? p.limiteEntrega.slice(0, 10)
        : new Date(p.limiteEntrega).toISOString().slice(0, 10))
      : '';

    f.alertaLegalizacion = calcAlerta(f.limiteEntrega, f.fechaLegalizacionReal);

    setForm(f);
    setEditTarget(p);
    setFormError('');
    setFileToUpload(null);
    setModalOpen(true);
  };

  const isLocked = (fieldName) =>
    editTarget ? (editTarget.lockedFields || []).includes(fieldName) : false;

  const handleFieldChange = (e) => {
    const { name, type } = e.target;
    const rawValue = e.target.value;
    const value = (type === 'date' || type === 'number' || UPPERCASE_EXCLUDE.includes(name))
      ? rawValue
      : rawValue.toUpperCase();

    if (isLocked(name)) return;

    setForm(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'planilla') updated.planillaTrasbordo = value;

      if (name === 'tipoViaje') {
        updated.plazoMaximo = value === 'Urbano' ? '2' : value === 'Correría' ? '4' : '';
      }

      const fechaSalida = name === 'fechaSalidaRuta' ? value : prev.fechaSalidaRuta;
      const dias = Number(updated.plazoMaximo) || 0;

      if (fechaSalida && dias) {
        const [y, m, d] = fechaSalida.split('-').map(Number);
        const limite = new Date(y, m - 1, d);
        limite.setDate(limite.getDate() + dias);
        const pad = n => String(n).padStart(2, '0');
        updated.limiteEntrega = `${limite.getFullYear()}-${pad(limite.getMonth() + 1)}-${pad(limite.getDate())}`;
        const hoy = new Date();
        const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const diffDias = Math.ceil((hoyLocal - limite) / (1000 * 60 * 60 * 24));
        updated.alertaLegalizacion = diffDias > 0
          ? `VENCIDA HACE ${diffDias} DÍA${diffDias !== 1 ? 'S' : ''}` : '';
      } else {
        updated.limiteEntrega = '';
        updated.alertaLegalizacion = '';
      }

      const flete = parseMoney(name === 'flete' ? value : prev.flete);
      const ajuste = parseMoney(name === 'ajusteAutorizado' ? value : prev.ajusteAutorizado);
      const anticipo = parseMoney(name === 'anticipo' ? value : prev.anticipo);
      const valorPagado = parseMoney(name === 'valorPagado' ? value : prev.valorPagado);
      const base = flete + ajuste;
      const retencion = base * 0.01;
      const saldoPagar = base - anticipo - retencion;
      const utilidad = valorPagado > 0 ? valorPagado - base : 0;

      return {
        ...updated,
        retencion: retencion.toFixed(2),
        saldoPagar: saldoPagar.toFixed(2),
        utilidad: utilidad.toFixed(2),
      };
    });
  };

  const handleSave = async () => {
    if (!form.empresa) {
      setFormError('Debes seleccionar una empresa para la planilla.');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      const MONEY_FIELDS = [
        'flete', 'anticipo', 'ajusteAutorizado', 'valorPagado',
        'valorAverias', 'valorFacturaCorbeta', 'credito', 'contado',
      ];
      const cleanedForm = { ...form };

      MONEY_FIELDS.forEach(field => { cleanedForm[field] = parseMoney(cleanedForm[field]); });
      ['retencion', 'saldoPagar', 'utilidad'].forEach(field => {
        cleanedForm[field] = parseFloat(cleanedForm[field]) || 0;
      });

      cleanedForm.novedades = (form.novedades || []).map(({ _locked, ...n }) => ({
        ...n, valor: parseFloat(n.valor) || 0,
      }));
      cleanedForm.novedadesLegalizacion = (form.novedadesLegalizacion || []).map(({ _locked, ...n }) => ({
        ...n, valor: parseFloat(n.valor) || 0,
      }));

      let bodyObj = { ...cleanedForm };

      if (editTarget) {
        const locked = editTarget.lockedFields || [];
        bodyObj = Object.fromEntries(
          Object.entries(bodyObj).filter(([k]) => !locked.includes(k))
        );
        bodyObj.novedades = cleanedForm.novedades;
        bodyObj.novedadesLegalizacion = cleanedForm.novedadesLegalizacion;
        bodyObj.limiteEntrega = cleanedForm.limiteEntrega;
        bodyObj.alertaLegalizacion = cleanedForm.alertaLegalizacion;
        bodyObj.retencion = cleanedForm.retencion;
        bodyObj.saldoPagar = cleanedForm.saldoPagar;
        bodyObj.utilidad = cleanedForm.utilidad;
        if (!locked.includes('nroFacturaPago')) bodyObj.nroFacturaPago = cleanedForm.nroFacturaPago;
        if (!locked.includes('valorPagado')) bodyObj.valorPagado = cleanedForm.valorPagado;
        if (!locked.includes('observacionesCruze')) bodyObj.observacionesCruze = cleanedForm.observacionesCruze;
      }

      if (esSede) {
        delete bodyObj.nroFacturaPago;
        delete bodyObj.valorPagado;
        delete bodyObj.observacionesCruze;
      }

      const url = editTarget ? `${API}/planillas/${editTarget._id}` : `${API}/planillas`;
      const method = editTarget ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(bodyObj) });
      const data = await res.json();

      if (!res.ok) {
        // ✅ Mensaje específico del servidor, nunca genérico
        throw new Error(data.message || `Error ${res.status}: no se pudo guardar la planilla.`);
      }

      const docId = data._id || editTarget?._id;

      // ✅ Subida de archivo: desacoplada del cierre del modal
      if (fileToUpload && docId) {
        // Cerrar el modal inmediatamente — la subida continúa en segundo plano
        setModalOpen(false);
        setFileToUpload(null);

        const toastId = addToast('Planilla guardada. Subiendo archivo adjunto…', 'info', 0);

        const fd = new FormData();
        fd.append('archivoPlanilla', fileToUpload);

        try {
          const fRes = await fetch(`${API}/planillas/${docId}/archivo`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token()}` },
            body: fd,
          });
          const fData = await fRes.json();

          removeToast(toastId);

          if (!fRes.ok) {
            addToast(
              `Planilla guardada, pero el archivo no se pudo adjuntar: ${fData.message || 'error desconocido'}.`,
              'error',
              7000,
            );
          } else {
            addToast(
              `Planilla ${editTarget ? 'actualizada' : 'creada'} y archivo adjuntado correctamente.`,
              'success',
            );
          }
        } catch (uploadErr) {
          removeToast(toastId);
          addToast(
            `Planilla guardada, pero no se pudo subir el archivo: ${uploadErr.message}.`,
            'error',
            7000,
          );
        }

        // Actualizar lista en segundo plano sin bloquear la UI
        fetchAll();
        return;
      }

      // Sin archivo — cierre normal
      setModalOpen(false);
      setFileToUpload(null);
      addToast(
        `Planilla ${editTarget ? 'actualizada' : 'creada'} correctamente.`,
        'success',
      );

      // ✅ fetchAll en segundo plano — no bloquea el cierre del modal
      fetchAll();

    } catch (e) {
      // ✅ Error visible dentro del modal con mensaje específico
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addNovedad = () => {
    if (form.novedades.length >= 5) return;
    setForm(prev => ({
      ...prev,
      novedades: [
        ...prev.novedades,
        {
          planilla: prev.nroFacturaMula || '',
          descripcion: prev.novedadesAverias || '',
          valor: parseMoney(prev.valorAverias) || '',
          _locked: true,
        },
      ],
      nroFacturaMula: '',
      valorAverias: '',
      novedadesAverias: '',
    }));
  };

  const removeNovedad = (idx) =>
    setForm(prev => ({ ...prev, novedades: prev.novedades.filter((_, i) => i !== idx) }));

  const handleNovedadChange = (idx, field, value) =>
    setForm(prev => {
      const copy = [...prev.novedades];
      copy[idx] = { ...copy[idx], [field]: field === 'valor' ? value : value.toUpperCase() };
      return { ...prev, novedades: copy };
    });

  const addNovedadLeg = () => {
    if (form.novedadesLegalizacion.length >= 5) return;
    setForm(prev => ({
      ...prev,
      novedadesLegalizacion: [
        ...prev.novedadesLegalizacion,
        {
          planilla: prev.nroFacturaCorbeta || '',
          descripcion: prev.observaciones || '',
          valor: parseMoney(prev.valorFacturaCorbeta) || '',
          _locked: true,
        },
      ],
      nroFacturaCorbeta: '',
      observaciones: '',
      valorFacturaCorbeta: '',
    }));
  };

  const removeNovedadLeg = (idx) =>
    setForm(prev => ({
      ...prev,
      novedadesLegalizacion: prev.novedadesLegalizacion.filter((_, i) => i !== idx),
    }));

  const handleNovedadLegChange = (idx, field, value) =>
    setForm(prev => {
      const copy = [...prev.novedadesLegalizacion];
      copy[idx] = { ...copy[idx], [field]: field === 'valor' ? value : value.toUpperCase() };
      return { ...prev, novedadesLegalizacion: copy };
    });

  const planillasFiltradas = planillas.filter(p => {
    const q = busqueda.toLowerCase();
    return (
      (p.planilla || '').toLowerCase().includes(q) ||
      (p.placaMula || '').toLowerCase().includes(q) ||
      (p.conductorRuta || '').toLowerCase().includes(q) ||
      (p.ruta || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(planillasFiltradas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const planillasPagina = planillasFiltradas.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className={styles.dashboard}>

      {/* ── Notificaciones Toast ───────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <button
        className={styles.mobileMenuBtn}
        onClick={() => setSidebarOpen(!sidebarOpen)}
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
          <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <button className={`${styles.navButton} ${styles.active}`} title="Bitácora CORBETA">
            <FileText size={20} className={styles.navIcon} />
            <span className={styles.navLabel}>Bitácora CORBETA</span>
          </button>
        </nav>

        <button onClick={onLogout} className={styles.logout} title="Cerrar sesión">
          <LogOut size={20} className={styles.logoutIcon} />
          <span className={styles.logoutLabel}>Cerrar sesión</span>
        </button>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentWrapper}>

          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Bitácora CORBETA</h1>
              <p className={styles.pageSubtitle}>
                {user?.username || 'Sede'} · {user?.email || ''}
              </p>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.sedeSelector}>
                <MapPin size={14} className={styles.sedeIcon} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', padding: '8px 4px' }}>
                  {sedeUsuario || 'Sin sede asignada'}
                </span>
              </div>
              <button
                className={styles.refreshBtn}
                onClick={fetchAll}
                disabled={loading}
                title="Actualizar"
              >
                <RefreshCw size={15} className={loading ? styles.spin : ''} />
              </button>
            </div>
          </div>

          <div className={styles.actionBar}>
            <div className={styles.searchBox}>
              <Search size={14} />
              <input
                placeholder="Buscar por planilla, placa, conductor, ruta…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.actionRight}>
              <span className={styles.countTag}>
                {planillasFiltradas.length} registro{planillasFiltradas.length !== 1 ? 's' : ''}
                {sedeUsuario && ` · ${sedeUsuario}`}
              </span>
              <button className={styles.addBtn} onClick={openNew} title="Nueva planilla">
                <Plus size={15} /> Nueva planilla
              </button>
            </div>
          </div>

          {!sedeUsuario && (
            <div className={styles.sedeAlert}>
              <AlertCircle size={15} />
              <span>Tu cuenta no tiene una <strong>sede asignada</strong>. Contacta al administrador.</span>
            </div>
          )}

          <div className={styles.card}>
            {loading ? (
              <div className={styles.loader}>
                <RefreshCw size={24} className={styles.spin} />
                <span>Cargando planillas…</span>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Planilla</th>
                        <th>Placa Vehículo</th>
                        <th>Conductor</th>
                        <th>Ruta</th>
                        <th>Sede</th>
                        <th>Empresa</th>
                        <th>F. Salida</th>
                        <th>Flete</th>
                        <th>Saldo</th>
                        <th>Estado Leg.</th>
                        <th>Contado</th>
                        <th>Crédito</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planillasPagina.map((p, i) => {
                        const tieneVacios = LOCKABLE.some(f => !p.lockedFields?.includes(f));
                        const numGlobal = (safePage - 1) * PAGE_SIZE + i + 1;
                        return (
                          <tr key={p._id || i}>
                            <td className={styles.tdNum}>{numGlobal}</td>
                            <td><strong>{p.planilla || '—'}</strong></td>
                            <td>{p.placaTrasbordo || '—'}</td>
                            <td>{p.conductorRuta || '—'}</td>
                            <td>{p.ruta || '—'}</td>
                            <td>
                              <span className={`${styles.badge} ${p.sede === 'Pitalito' ? styles.badgeTeal : styles.badgePurple}`}>
                                {p.sede}
                              </span>
                            </td>
                            <td>
                              {p.empresa ? (
                                <span className={`${styles.badge} ${styles[EMPRESA_BADGE_CLASS[p.empresa] || 'badgePurple']}`}>
                                  {p.empresa}
                                </span>
                              ) : '—'}
                            </td>
                            <td>{fmtDate(p.fechaSalidaRuta)}</td>
                            <td>{fmtMoney(p.flete)}</td>
                            <td>{fmtMoney(p.saldoPagar)}</td>
                            <td>
                              {(() => {
                                const alertaDinamica = calcAlerta(p.limiteEntrega, p.fechaLegalizacionReal);
                                const estado = p.estadoLegalizacion ||
                                  (p.fechaLegalizacionReal ? 'Legalizado ✓' : 'Pendiente');
                                const esLegalizado = estado.toLowerCase().includes('legaliz');
                                const esVencida = alertaDinamica.includes('VENCIDA');
                                const clase = esLegalizado
                                  ? styles.badgeGreen
                                  : esVencida ? styles.badgeRed : styles.badgeAmber;
                                return (
                                  <span className={`${styles.badge} ${clase}`}>
                                    {!esLegalizado && esVencida ? alertaDinamica : estado}
                                  </span>
                                );
                              })()}
                            </td>
                            <td>{fmtMoney(p.contado)}</td>
                            <td>{fmtMoney(p.credito)}</td>
                            <td>
                              <button
                                className={`${styles.iconBtn} ${tieneVacios ? styles.iconBtnEdit : styles.iconBtnLock}`}
                                onClick={() => openEdit(p)}
                                title={tieneVacios ? 'Completar campos' : 'Ver / bloqueado'}
                              >
                                {tieneVacios ? <Edit2 size={13} /> : <Lock size={13} />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {planillasPagina.length === 0 && (
                        <tr>
                          <td colSpan={14} className={styles.emptyCell}>
                            {planillas.length === 0
                              ? 'Sin planillas registradas. Crea la primera.'
                              : 'Sin resultados para la búsqueda.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '14px 16px', borderTop: '1px solid #f1f5f9',
                  }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 14px', borderRadius: 7,
                        border: '1.5px solid #e2e8f0',
                        background: safePage === 1 ? '#f8fafc' : '#fff',
                        color: safePage === 1 ? '#b0b8c8' : '#374151',
                        fontSize: 13, fontWeight: 600,
                        cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        style={{
                          width: 34, height: 34, borderRadius: 7,
                          border: n === safePage ? '1.5px solid #1a2236' : '1.5px solid #e2e8f0',
                          background: n === safePage ? '#1a2236' : '#fff',
                          color: n === safePage ? '#fff' : '#374151',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    ))}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 14px', borderRadius: 7,
                        border: '1.5px solid #e2e8f0',
                        background: safePage === totalPages ? '#f8fafc' : '#fff',
                        color: safePage === totalPages ? '#b0b8c8' : '#374151',
                        fontSize: 13, fontWeight: 600,
                        cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>
                  {editTarget ? 'Modificar planilla' : 'Nueva planilla'}
                </h2>
                <p className={styles.modalSub}>
                  Sede: <strong>{sedeUsuario}</strong>
                  {editTarget && (
                    <span className={styles.lockNote}>
                      <Lock size={11} /> Campos en gris bloqueados
                    </span>
                  )}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>

              {/* ── Empresa asociada ──────────────────────────────────────────────── */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16,
                marginBottom: 26, padding: '16px 18px',
                background: '#f4f8ff',
                border: '1.5px solid #d6e4ff',
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 280px', minWidth: 0 }}>
                  <label style={{
                    fontSize: 12, fontWeight: 800,
                    color: isLocked('empresa') ? '#b0b8c8' : '#4f5d95',
                    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Building2 size={14} />
                    Empresa asociada
                    <span style={{ color: '#dc2626' }}>*</span>
                    {isLocked('empresa') && <span style={{ color: '#c5cad4' }}>🔒</span>}
                  </label>

                  <select
                    name="empresa"
                    value={form.empresa || ''}
                    onChange={handleFieldChange}
                    disabled={isLocked('empresa')}
                    style={{
                      padding: '11px 13px',
                      borderRadius: 8,
                      border: `1.5px solid ${isLocked('empresa') ? '#e8eaed' : '#c7d8ff'}`,
                      fontSize: 14,
                      fontWeight: 600,
                      background: isLocked('empresa') ? '#f8fafc' : '#fff',
                      color: isLocked('empresa') ? '#a0aab8' : '#1a2236',
                      cursor: isLocked('empresa') ? 'not-allowed' : 'pointer',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Seleccionar empresa…</option>
                    {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <Section title="Datos del Vehículo y Ruta">
                <Row>
                  <Field label="Placa" name="placaTrasbordo" form={form} onChange={handleFieldChange} locked={isLocked('placaTrasbordo')} />
                  <Field label="Conductor" name="conductorRuta" form={form} onChange={handleFieldChange} locked={isLocked('conductorRuta')} />
                  <Field label="Número de Manifiesto" name="nroManifiesto" form={form} onChange={handleFieldChange} locked={isLocked('nroManifiesto')} />
                </Row>
                <Row>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: isLocked('tipoViaje') ? '#b0b8c8' : '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isLocked('tipoViaje') && <span style={{ color: '#c5cad4' }}>🔒</span>}
                      Tipo de Viaje
                    </label>
                    <select
                      name="tipoViaje"
                      value={form.tipoViaje || ''}
                      onChange={handleFieldChange}
                      disabled={isLocked('tipoViaje')}
                      style={{ padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${isLocked('tipoViaje') ? '#e8eaed' : '#d0d5dd'}`, fontSize: 14, background: isLocked('tipoViaje') ? '#f8fafc' : '#fff', color: isLocked('tipoViaje') ? '#a0aab8' : '#1a2236', cursor: isLocked('tipoViaje') ? 'not-allowed' : 'pointer', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="">Seleccionar…</option>
                      <option value="Urbano">Urbano</option>
                      <option value="Correría">Correría</option>
                    </select>
                  </div>
                  <Field label="Ruta de Viaje" name="ruta" form={form} onChange={handleFieldChange} locked={isLocked('ruta')} />
                  <MoneyField label="Flete ($)" name="flete" form={form} onChange={handleFieldChange} locked={isLocked('flete')} />
                </Row>
                <Row>
                  <MoneyField label="Ajuste ($)" name="ajusteAutorizado" form={form} onChange={handleFieldChange} locked={isLocked('ajusteAutorizado')} />
                  <MoneyField label="Anticipo ($)" name="anticipo" form={form} onChange={handleFieldChange} locked={isLocked('anticipo')} />
                  <CalcField label="Retención 1% (calc.)" value={fmtMoney(form.retencion || 0)} color={{ border: '#fde68a', bg: '#fffbeb', text: '#92400e' }} />
                </Row>
                <Row>
                  <CalcField label="Saldo a Pagar (calc.)" value={fmtMoney(form.saldoPagar || 0)} />
                </Row>
              </Section>

              <Section title="Legalización">
                <Row>
                  <Field label="Fecha de Salida" name="fechaSalidaRuta" type="date" form={form} onChange={handleFieldChange} locked={isLocked('fechaSalidaRuta')} />
                  <CalcField label="Días de Ruta (calc.)" value={form.plazoMaximo ? `${form.plazoMaximo} día${form.plazoMaximo !== '1' ? 's' : ''}` : '—'} color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }} />
                  <CalcField label="Fecha Límite (calc.)" value={form.limiteEntrega ? fmtDate(form.limiteEntrega) : '—'} color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }} />
                  <CalcField
                    label="Alerta"
                    value={form.alertaLegalizacion || 'En plazo ✓'}
                    color={{
                      border: form.alertaLegalizacion === 'LEGALIZADO ✓' ? '#86efac' : form.alertaLegalizacion ? '#fca5a5' : '#bbf7d0',
                      bg: form.alertaLegalizacion === 'LEGALIZADO ✓' ? '#dcfce7' : form.alertaLegalizacion ? '#fee2e2' : '#f0fdf4',
                      text: form.alertaLegalizacion === 'LEGALIZADO ✓' ? '#15803d' : form.alertaLegalizacion ? '#b91c1c' : '#15803d',
                    }}
                    bold
                  />
                </Row>
                <Row>
                  <Field label="Fecha de Legalización" name="fechaLegalizacionReal" type="date" form={form} onChange={handleFieldChange} locked={isLocked('fechaLegalizacionReal')} />
                  <Field label="Novedades de Legalización" name="estadoLegalizacion" form={form} onChange={handleFieldChange} locked={isLocked('estadoLegalizacion')} />
                </Row>
              </Section>

            </div>

            {formError && (
              <div className={styles.formError}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving
                  ? <><RefreshCw size={14} className={styles.spin} /> Guardando…</>
                  : <><Save size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────
const btnAddStyle = (border, bg, color) => ({
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 12px', borderRadius: 7,
  border: `1.5px solid ${border}`,
  background: bg, color,
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
});
const EMPRESA_BADGE_CLASS = {
  'CORBETA': 'badgePurple',
  'DISTRIBUIDORA DULCES Y DULCES': 'badgeAmber',
  'NUTRISUR': 'badgeTeal',
  'DSIERRA SAS': 'badgeGreen',
  'DISTRIBUIDORA CARLOS VEINTIMILLA': 'badgeRed',
  'SURTIVENTAS': 'badgeTeal',
  'ALPINA': 'badgePurple',
};

// ── Sub-componentes ────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  'Datos de la Mula': { border: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
  'Datos del Vehículo y Ruta': { border: '#0891b2', bg: '#ecfeff', text: '#0e7490' },
  'Legalización': { border: '#dc2626', bg: '#fff1f2', text: '#b91c1c' },
  'Pago Corbeta': { border: '#16a34a', bg: '#f0fdf4', text: '#15803d' },
};

const Section = ({ title, children }) => {
  const c = SECTION_COLORS[title] || { border: '#9ca3af', bg: '#f9fafb', text: '#374151' };
  return (
    <div style={{ marginBottom: 28, border: `1.5px solid ${c.border}22`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: c.bg, borderBottom: `2px solid ${c.border}33`, padding: '10px 18px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{title}</p>
      </div>
      <div style={{ padding: '18px 18px 6px' }}>{children}</div>
    </div>
  );
};

const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>{children}</div>
);

const Field = ({ label, name, type = 'text', form, onChange, locked, wide, textarea }) => {
  const wrapper = { display: 'flex', flexDirection: 'column', flex: wide ? '1 1 100%' : '1 1 200px', minWidth: 0 };
  const inputStyle = {
    padding: '10px 13px', borderRadius: 8,
    border: `1.5px solid ${locked ? '#e8eaed' : '#d0d5dd'}`,
    fontSize: 14, background: locked ? '#f8fafc' : '#fff',
    color: locked ? '#a0aab8' : '#1a2236',
    width: '100%', boxSizing: 'border-box',
    cursor: locked ? 'not-allowed' : 'text', outline: 'none',
    transition: 'border-color 0.15s',
    textTransform: (type === 'date' || type === 'number') ? 'none' : 'uppercase',
  };
  return (
    <div style={wrapper}>
      <label style={{ fontSize: 12, fontWeight: 700, color: locked ? '#b0b8c8' : '#374151', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {locked && <span style={{ color: '#c5cad4' }}>🔒</span>}
        {label}
      </label>
      {textarea ? (
        <textarea name={name} value={form[name] || ''} onChange={onChange} disabled={locked} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder={locked ? 'Campo bloqueado' : ''} />
      ) : (
        <input name={name} type={type} value={form[name] || ''} onChange={onChange} disabled={locked} style={inputStyle} placeholder={locked ? 'Campo bloqueado' : ''} />
      )}
    </div>
  );
};

const MoneyField = ({ label, name, form, onChange, locked }) => (
  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </label>
    <input
      value={form[name] || ''}
      onChange={e => {
        const soloDigitos = e.target.value.replace(/\D/g, '');
        const conPuntos = soloDigitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        onChange({ target: { name, value: conPuntos } });
      }}
      disabled={locked}
      placeholder="0"
      style={{ padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${locked ? '#e8eaed' : '#d0d5dd'}`, fontSize: 14, background: locked ? '#f8fafc' : '#fff', color: locked ? '#a0aab8' : '#1a2236', width: '100%', boxSizing: 'border-box', outline: 'none' }}
    />
  </div>
);

const CalcField = ({ label, value, color = {}, bold }) => {
  const c = { border: '#e5e7eb', bg: '#f9fafb', text: '#1a2236', ...color };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      <div style={{ padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 14, fontWeight: bold ? 700 : 500 }}>{value}</div>
    </div>
  );
};

const NovedadRow = ({ idx, nov, onChange, onRemove }) => {
  const locked = nov._locked === true;
  const inputBase = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 11px', borderRadius: 8,
    border: `1.5px solid ${locked ? '#e8eaed' : '#d0d5dd'}`,
    fontSize: 13, outline: 'none',
    color: locked ? '#a0aab8' : '#1a2236',
    background: locked ? '#f8fafc' : '#fff',
    cursor: locked ? 'not-allowed' : 'text',
  };
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-end' }}>
      <div style={{ flex: '0 0 140px' }}>
        {idx === 0 && <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Planilla</label>}
        <input value={nov.planilla} onChange={e => onChange(idx, 'planilla', e.target.value)} placeholder={locked ? 'Bloqueado' : 'Planilla'} disabled={locked} style={{ ...inputBase, textTransform: locked ? 'none' : 'uppercase' }} />
      </div>
      <div style={{ flex: '1 1 0' }}>
        {idx === 0 && <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Descripción</label>}
        <input value={nov.descripcion} onChange={e => onChange(idx, 'descripcion', e.target.value)} placeholder={locked ? 'Bloqueado' : 'Descripción de la novedad'} disabled={locked} style={{ ...inputBase, textTransform: locked ? 'none' : 'uppercase' }} />
      </div>
      <div style={{ flex: '0 0 120px' }}>
        {idx === 0 && <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Valor ($)</label>}
        <input type="number" value={nov.valor} onChange={e => onChange(idx, 'valor', e.target.value)} placeholder="0" disabled={locked} style={inputBase} />
      </div>
      {locked ? (
        <div style={{ flexShrink: 0, width: 34, height: 34, marginBottom: 1 }} />
      ) : (
        <button type="button" onClick={() => onRemove(idx)} title="Eliminar" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 1 }}>
          ×
        </button>
      )}
    </div>
  );
};