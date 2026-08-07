// frontend/src/pages/AdminSedeDashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle, RefreshCw,
  MapPin, LayoutDashboard, LogOut,
  Search, X, FileSpreadsheet, Menu,
  Save, Plus, Edit2, ChevronLeft, ChevronRight,
  CheckCircle, MessageSquare, FileText, Building2,
} from 'lucide-react';
import ChatMessenger from './ChatMessenger';
import styles from './AdminSedeDashboard.module.css';
import GestionManifiestos from '../admin/GestionManifiestos';

// ── Toast ─────────────────────────────────────────────────────────────────────
const toastStyles = {
  container: {
    position: 'fixed', top: 20, right: 20, zIndex: 9999,
    display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none',
  },
  base: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 16px', borderRadius: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    fontSize: 13, fontWeight: 500, maxWidth: 360,
    lineHeight: 1.4, pointerEvents: 'auto',
    animation: 'slideInToast 0.25s ease',
  },
  success: { background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534' },
  error: { background: '#fff1f2', border: '1.5px solid #fca5a5', color: '#991b1b' },
  info: { background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1e40af' },
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
          <div key={t.id} style={{ ...toastStyles.base, ...toastStyles[t.type] }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {t.type === 'success' && <CheckCircle size={16} />}
              {t.type === 'error' && <AlertCircle size={16} />}
              {t.type === 'info' && <RefreshCw size={16} />}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: '0 0 0 6px', flexShrink: 0 }}
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

// ── Constantes ────────────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';
const token = () => localStorage.getItem('token');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const fmtDate = (d) => {
  if (!d) return '—';
  const str = typeof d === 'string' ? d : d.toISOString?.() ?? String(d);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, day] = match.map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—';
const parseMoney = (val) => Number((val || '').toString().replace(/\./g, '').replace(',', '.')) || 0;
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

const EMPRESAS = [
  'CORBETA',
  'DISTRIBUIDORA DULCES Y DULCES',
  'NUTRISUR',
  'DSIERRA SAS',
  'DISTRIBUIDORA CARLOS VEINTIMILLA',
  'SURTIVENTAS',
  'ALPINA',
];


const SEDES = ['Todas', 'Pitalito', 'Neiva', 'Pasto'];
const SEDES_CREAR = ['Pitalito', 'Neiva', 'Pasto'];
const ESTADOS_LEG = ['Todos', 'Pendiente', 'Legalizado', 'Vencida'];
const PAGE_SIZE = 20;

const LOCKABLE = [
  'empresa', 'planilla', 'placaMula', 'nombreConductorMula', 'nroFacturaMula',
  'novedadesAverias', 'valorAverias', 'conductorRuta', 'placaTrasbordo',
  'planillaTrasbordo', 'tipoViaje', 'nroManifiesto', 'fechaSalidaRuta',
  'ruta', 'plazoMaximo', 'limiteEntrega', 'flete', 'anticipo', 'ajusteAutorizado',
  'retencion', 'alertaLegalizacion', 'fechaLegalizacion', 'fechaLegalizacionReal',
  'estadoLegalizacion', 'nroFacturaCorbeta', 'valorFacturaCorbeta', 'observaciones',
  'nroFacturaPago', 'fechaPago', 'valorPagado', 'observacionesCruze',
  'credito', 'contado',
];

const EMPTY_FORM = {
  sede: '',
  empresa: '', planilla: '', placaMula: '', nroFacturaMula: '',
  novedadesAverias: '', valorAverias: '',
  nombreConductorMula: '',
  conductorRuta: '', placaTrasbordo: '', planillaTrasbordo: '',
  tipoViaje: '', nroManifiesto: '',
  fechaSalidaRuta: '', ruta: '', plazoMaximo: '',
  limiteEntrega: '', flete: '', anticipo: '',
  ajusteAutorizado: '',
  retencion: '0', saldoPagar: '0',
  alertaLegalizacion: '', fechaLegalizacion: '',
  fechaLegalizacionReal: '', estadoLegalizacion: '',
  nroFacturaCorbeta: '', valorFacturaCorbeta: '', observaciones: '',
  novedades: [], novedadesLegalizacion: [],
  nroFacturaPago: '', fechaPago: '', valorPagado: '',
  utilidad: '0', observacionesCruze: '',
  credito: '', contado: '',
};

const UPPERCASE_EXCLUDE = ['tipoViaje', 'sede'];

const SECTION_COLORS = {
  'Datos de la Mula': { border: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
  'Datos del Vehículo y Ruta': { border: '#0891b2', bg: '#ecfeff', text: '#0e7490' },
  'Legalización': { border: '#dc2626', bg: '#fff1f2', text: '#b91c1c' },
  'Pago Corbeta': { border: '#16a34a', bg: '#f0fdf4', text: '#15803d' },
};

const Section = ({ title, children }) => {
  const c = SECTION_COLORS[title] || { border: '#9ca3af', bg: '#f9fafb', text: '#374151' };
  return (
    <div style={{ marginBottom: 24, border: `1.5px solid ${c.border}22`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: c.bg, borderBottom: `2px solid ${c.border}33`, padding: '10px 18px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{title}</p>
      </div>
      <div style={{ padding: '16px 18px 4px' }}>{children}</div>
    </div>
  );
};

const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>{children}</div>
);

const Field = ({ label, name, type = 'text', form, onChange, locked, wide, textarea }) => {
  const inputStyle = {
    padding: '10px 13px', borderRadius: 8,
    border: `1.5px solid ${locked ? '#e8eaed' : '#d0d5dd'}`,
    fontSize: 14, background: locked ? '#f8fafc' : '#fff',
    color: locked ? '#a0aab8' : '#1a2236',
    width: '100%', boxSizing: 'border-box',
    cursor: locked ? 'not-allowed' : 'text', outline: 'none',
    textTransform: (type === 'date' || type === 'number') ? 'none' : 'uppercase',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: wide ? '1 1 100%' : '1 1 200px', minWidth: 0 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: locked ? '#b0b8c8' : '#374151', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {locked && <span style={{ color: '#c5cad4' }}>🔒</span>}
        {label}
      </label>
      {textarea ? (
        <textarea name={name} value={form[name] || ''} onChange={onChange} disabled={locked} rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} placeholder={locked ? 'Campo bloqueado' : ''} />
      ) : (
        <input name={name} type={type} value={form[name] || ''} onChange={onChange} disabled={locked}
          style={inputStyle} placeholder={locked ? 'Campo bloqueado' : ''} />
      )}
    </div>
  );
};

const MoneyField = ({ label, name, form, onChange, locked }) => (
  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: locked ? '#b0b8c8' : '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4 }}>
      {locked && <span style={{ color: '#c5cad4' }}>🔒</span>}
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

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#b0b8c8' : '#374151', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
        <ChevronLeft size={14} /> Anterior
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onPageChange(n)}
          style={{ width: 34, height: 34, borderRadius: 7, border: n === page ? '1.5px solid #1a2236' : '1.5px solid #e2e8f0', background: n === page ? '#1a2236' : '#fff', color: n === page ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {n}
        </button>
      ))}
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#b0b8c8' : '#374151', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
        Siguiente <ChevronRight size={14} />
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN: Seguimiento de Planillas
══════════════════════════════════════════════════════════════════════════ */
export function SeguimientoPlanillas({ user }) {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [empresaFiltro, setEmpresaFiltro] = useState('Todas');
  const [error, setError] = useState('');
  const { toasts, addToast, removeToast } = useToast();

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/planillas`, { headers: hdrs() });
      if (res.status === 401) throw new Error('Sesión expirada.');
      if (res.status === 403) throw new Error('Sin permisos para ver estas planillas.');
      if (!res.ok) throw new Error(`Error del servidor (${res.status}).`);
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : data.data || []);
    } catch (e) { setError(e.message); setPlanillas([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [busqueda, sedeFiltro, estadoFiltro, empresaFiltro]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditTarget(null);
    setFormError('');
    setFileToUpload(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    const f = { ...EMPTY_FORM };
    f.sede = p.sede || '';
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
    f.valorFacturaCorbeta = p.valorFacturaCorbeta != null ? p.valorFacturaCorbeta : '';
    f.empresa = p.empresa || '';
    f.novedades = Array.isArray(p.novedades) ? p.novedades : [];
    f.novedadesLegalizacion = Array.isArray(p.novedadesLegalizacion) ? p.novedadesLegalizacion : [];
    f.saldoPagar = p.saldoPagar != null ? p.saldoPagar : '0';
    f.retencion = p.retencion != null ? p.retencion : '0';
    f.utilidad = p.utilidad != null ? p.utilidad : '0';
    f.nroFacturaPago = p.nroFacturaPago || '';
    f.valorPagado = p.valorPagado != null ? p.valorPagado : '';
    f.observacionesCruze = p.observacionesCruze || '';
    f.credito = p.credito != null ? p.credito : '';
    f.contado = p.contado != null ? p.contado : '';
    f.limiteEntrega = p.limiteEntrega
      ? (typeof p.limiteEntrega === 'string' ? p.limiteEntrega.slice(0, 10) : new Date(p.limiteEntrega).toISOString().slice(0, 10))
      : '';
    f.alertaLegalizacion = calcAlerta(f.limiteEntrega, f.fechaLegalizacionReal);
    setForm(f);
    setEditTarget(p);
    setFormError('');
    setFileToUpload(null);
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, type } = e.target;
    const rawValue = e.target.value;
    const value = (type === 'date' || type === 'number' || UPPERCASE_EXCLUDE.includes(name))
      ? rawValue : rawValue.toUpperCase();

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
        updated.alertaLegalizacion = diffDias > 0 ? `VENCIDA HACE ${diffDias} DÍA${diffDias !== 1 ? 'S' : ''}` : '';
      } else if (name === 'fechaSalidaRuta' || name === 'tipoViaje') {
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
      return { ...updated, retencion: retencion.toFixed(2), saldoPagar: saldoPagar.toFixed(2), utilidad: utilidad.toFixed(2) };
    });
  };

  const handleSave = async () => {
    if (!form.empresa) {
      setFormError('Debes seleccionar una empresa para la planilla.');
      return;
    }
    // Al crear una planilla nueva, la sede es obligatoria
    if (!editTarget && !form.sede) {
      setFormError('Debes seleccionar una sede para la nueva planilla.');
      return;
    }
    setSaving(true); setFormError('');
    try {
      const MONEY_FIELDS = ['flete', 'anticipo', 'ajusteAutorizado', 'valorPagado', 'valorAverias', 'valorFacturaCorbeta', 'credito', 'contado'];
      const cleanedForm = { ...form };
      MONEY_FIELDS.forEach(field => { cleanedForm[field] = parseMoney(cleanedForm[field]); });
      ['retencion', 'saldoPagar', 'utilidad'].forEach(field => {
        cleanedForm[field] = parseFloat(cleanedForm[field]) || 0;
      });
      cleanedForm.novedades = (form.novedades || []).map(n => ({ ...n, valor: parseFloat(n.valor) || 0 }));
      cleanedForm.novedadesLegalizacion = (form.novedadesLegalizacion || []).map(n => ({ ...n, valor: parseFloat(n.valor) || 0 }));

      const url = editTarget ? `${API_URL}/planillas/${editTarget._id}` : `${API_URL}/planillas`;
      const method = editTarget ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: hdrs(), body: JSON.stringify({ ...cleanedForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}: no se pudo guardar.`);

      const docId = data._id || editTarget?._id;

      if (fileToUpload && docId) {
        setModalOpen(false);
        setFileToUpload(null);
        const toastId = addToast('Planilla guardada. Subiendo archivo adjunto…', 'info', 0);
        const fd = new FormData();
        fd.append('archivoPlanilla', fileToUpload);
        try {
          const fRes = await fetch(`${API_URL}/planillas/${docId}/archivo`, {
            method: 'PATCH', headers: { Authorization: `Bearer ${token()}` }, body: fd,
          });
          const fData = await fRes.json();
          removeToast(toastId);
          if (!fRes.ok) {
            addToast(`Planilla guardada, pero el archivo no se pudo adjuntar: ${fData.message || 'error desconocido'}.`, 'error', 7000);
          } else {
            addToast(`Planilla ${editTarget ? 'actualizada' : 'creada'} y archivo adjuntado correctamente.`, 'success');
          }
        } catch (uploadErr) {
          removeToast(toastId);
          addToast(`Planilla guardada, pero no se pudo subir el archivo: ${uploadErr.message}.`, 'error', 7000);
        }
        fetchAll();
        return;
      }

      setModalOpen(false);
      setFileToUpload(null);
      addToast(`Planilla ${editTarget ? 'actualizada' : 'creada'} correctamente.`, 'success');
      fetchAll();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/planillas/${deleteTarget._id}`, { method: 'DELETE', headers: hdrs() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al eliminar');
      await fetchAll();
      setDeleteTarget(null);
      setModalOpen(false);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtradas = planillas.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchTexto =
      (p.planilla || '').toLowerCase().includes(q) ||
      (p.placaMula || '').toLowerCase().includes(q) ||
      (p.conductorRuta || '').toLowerCase().includes(q) ||
      (p.ruta || '').toLowerCase().includes(q) ||
      (p.userEmail || '').toLowerCase().includes(q);
    const matchSede = sedeFiltro === 'Todas' || p.sede === sedeFiltro;
    const matchEmpresa = empresaFiltro === 'Todas' || p.empresa === empresaFiltro;
    const alerta = calcAlerta(p.limiteEntrega, p.fechaLegalizacionReal);
    const esLegalizado = !!(p.fechaLegalizacionReal || (p.estadoLegalizacion || '').toLowerCase().includes('legaliz'));
    const esVencida = alerta.includes('VENCIDA');
    const matchEstado =
      estadoFiltro === 'Todos' ||
      (estadoFiltro === 'Legalizado' && esLegalizado) ||
      (estadoFiltro === 'Vencida' && esVencida && !esLegalizado) ||
      (estadoFiltro === 'Pendiente' && !esLegalizado && !esVencida);
    return matchTexto && matchSede && matchEmpresa && matchEstado;
  });

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const filtiradasPagina = filtradas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const estadoLabel = (p) => p.estadoLegalizacion || (p.fechaLegalizacionReal ? 'Legalizado ✓' : 'Pendiente');

  const handleExport = async () => {
    if (!exportDesde || !exportHasta) { alert('Selecciona el rango de fechas completo.'); return; }
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ desde: exportDesde, hasta: exportHasta });
      if (sedeFiltro !== 'Todas') params.append('sede', sedeFiltro);
      const res = await fetch(`${API_URL}/planillas/export/excel?${params}`, { headers: hdrs() });
      if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Error' })); throw new Error(err.message); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `planillas_${exportDesde}_al_${exportHasta}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert(`No se pudo exportar: ${e.message}`); }
    finally { setExportLoading(false); }
  };

  return (
    <div className={styles.seg_wrap}>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className={styles.seg_header}>
        <div>
          <h1 className={styles.seg_title}>Seguimiento de Planillas</h1>
          <p className={styles.seg_sub}>Vista consolidada · edición completa</p>
        </div>
        <button className={styles.seg_refreshBtn} onClick={fetchAll} disabled={loading} title="Actualizar">
          <RefreshCw size={15} className={loading ? styles.seg_spin : ''} />
        </button>
      </div>

      <div className={styles.seg_toolbar}>
        <div className={styles.seg_searchBox}>
          <Search size={14} />
          <input placeholder="Buscar por planilla, placa, conductor, ruta, email…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className={styles.seg_searchInput} />
        </div>

        {/* Fila de filtros agrupados */}
        <div className={styles.seg_filterRow}>
          {/* Sede */}
          <div className={styles.seg_filterGroup}>
            <span className={styles.seg_filterGroupLabel}><MapPin size={10} /> Sede</span>
            <div className={styles.seg_sedeFilter}>
              {SEDES.map(s => (
                <button key={s}
                  className={`${styles.seg_sedeBtn} ${sedeFiltro === s ? styles.seg_sedeBtnActive : ''}`}
                  onClick={() => setSedeFiltro(s)}>{s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.seg_filterSep} />

          {/* Empresa — ahora como select desplegable */}
          <div className={styles.seg_filterGroup}>
            <span className={styles.seg_filterGroupLabel} style={{ color: '#7c3aed' }}><Building2 size={10} /> Empresa</span>
            <select
              value={empresaFiltro}
              onChange={e => setEmpresaFiltro(e.target.value)}
              className={styles.seg_empresaSelect}>
              <option value="Todas">Todas</option>
              {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className={styles.seg_filterSep} />

          {/* Estado */}
          <div className={styles.seg_filterGroup}>
            <span className={styles.seg_filterGroupLabel} style={{ color: '#b91c1c' }}>Estado</span>
            <div className={styles.seg_sedeFilter}>
              {ESTADOS_LEG.map(e => {
                const color = e === 'Legalizado' ? '#15803d' : e === 'Vencida' ? '#b91c1c' : e === 'Pendiente' ? '#92400e' : undefined;
                return (
                  <button key={e}
                    className={`${styles.seg_sedeBtn} ${estadoFiltro === e ? styles.seg_sedeBtnActive : ''}`}
                    onClick={() => setEstadoFiltro(e)}
                    style={estadoFiltro === e && color ? { background: color, borderColor: color, color: '#fff' } : {}}>
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <span className={styles.seg_countTag}>{filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}</span>
        <button
          onClick={openNew}
          title="Nueva planilla"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#1a2236', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            marginLeft: 8,
          }}
        >
          <Plus size={15} /> Nueva planilla
        </button>
      </div>

      <div className={styles.seg_exportBar}>
        <FileSpreadsheet size={15} color="#16a34a" />
        <span className={styles.seg_exportLabel}>Exportar Excel</span>
        <div className={styles.seg_exportDivider} />
        <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)} className={styles.seg_dateInput} />
        <span className={styles.seg_arrow}>→</span>
        <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)} className={styles.seg_dateInput} />
        <button onClick={handleExport} disabled={exportLoading || !exportDesde || !exportHasta}
          className={`${styles.seg_exportBtn} ${(exportLoading || !exportDesde || !exportHasta) ? styles.seg_exportBtnDisabled : ''}`}>
          {exportLoading
            ? <><RefreshCw size={13} className={styles.seg_spin} /> Generando…</>
            : <><FileSpreadsheet size={13} /> Descargar</>}
        </button>
      </div>

      {error && <div className={styles.seg_errorBanner}><AlertCircle size={15} /> {error}</div>}

      <div className={styles.seg_card}>
        {loading ? (
          <div className={styles.seg_loader}>
            <RefreshCw size={24} className={styles.seg_spin} />
            <span>Cargando planillas…</span>
          </div>
        ) : (
          <>
            <div className={styles.seg_tableWrap}>
              <table className={styles.seg_table}>
                <thead>
                  <tr>
                    <th>#</th><th>Planilla</th><th>Placa Vehículo</th><th>Conductor</th>
                    <th>Ruta</th><th>Sede</th><th>Empresa</th><th>F. Salida</th><th>Saldo a Pagar</th>
                    <th>Alerta</th><th>Estado Leg.</th><th>Contado</th><th>Crédito</th><th>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtiradasPagina.map((p, i) => {
                    const numGlobal = (safePage - 1) * PAGE_SIZE + i + 1;
                    return (
                      <tr key={p._id || i}>
                        <td className={styles.seg_tdNum}>{numGlobal}</td>
                        <td><strong>{p.planilla || '—'}</strong></td>
                        <td>{p.placaTrasbordo || '—'}</td>
                        <td>{p.conductorRuta || '—'}</td>
                        <td className={styles.seg_tdRuta}>{p.ruta || '—'}</td>
                        <td>
                          <span className={`${styles.seg_badge} ${p.sede === 'Pitalito' ? styles.seg_badgeTeal : p.sede === 'Neiva' ? styles.seg_badgePurple : styles.seg_badgeBlue}`}>
                            {p.sede}
                          </span>
                        </td>
                        <td>
                          {p.empresa ? (
                            <span className={styles.seg_empresaTag}>{p.empresa}</span>
                          ) : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td>{fmtDate(p.fechaSalidaRuta)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: (p.saldoPagar || 0) > 0 ? '#065f46' : '#b91c1c' }}>
                            {fmtMoney(p.saldoPagar)}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const alertaDinamica = calcAlerta(p.limiteEntrega, p.fechaLegalizacionReal);
                            return (
                              <span className={`${styles.seg_badge} ${!alertaDinamica ? styles.seg_badgeGreen : alertaDinamica.includes('VENCIDA') ? styles.seg_badgeRed : styles.seg_badgeAmber}`}>
                                {alertaDinamica || 'En plazo ✓'}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          {(() => {
                            const alertaDinamica = calcAlerta(p.limiteEntrega, p.fechaLegalizacionReal);
                            const est = estadoLabel(p);
                            const esLeg = est.toLowerCase().includes('legaliz');
                            const esVenc = alertaDinamica.includes('VENCIDA');
                            return (
                              <span className={`${styles.seg_badge} ${esLeg ? styles.seg_badgeGreen : esVenc ? styles.seg_badgeRed : styles.seg_badgeAmber}`}>
                                {est}
                              </span>
                            );
                          })()}
                        </td>
                        <td>{fmtMoney(p.contado)}</td>
                        <td>{fmtMoney(p.credito)}</td>
                        <td>
                          <button className={styles.seg_expandBtn} onClick={() => openEdit(p)} title="Editar planilla">
                            <Edit2 size={13} /> Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtiradasPagina.length === 0 && !loading && (
                    <tr>
                      <td colSpan={14} className={styles.seg_emptyCell}>
                        {planillas.length === 0 ? 'No hay planillas registradas.' : 'Sin resultados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── Modal de edición ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className={styles.seg_modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.seg_modal} onClick={e => e.stopPropagation()}>

            <div className={styles.seg_modalHead}>
              <div>
                <h2 className={styles.seg_modalTitle}>
                  {editTarget ? `Editar planilla ${editTarget.planilla || ''}` : 'Nueva planilla'}
                </h2>
                <p className={styles.seg_modalSub}>
                  {editTarget
                    ? <>Sede: <strong>{editTarget.sede}</strong> · Todos los campos son editables</>
                    : 'Selecciona la sede y la empresa para registrar la planilla'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {editTarget && (
                  <button onClick={() => setDeleteTarget(editTarget)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#b91c1c', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    🗑 Eliminar
                  </button>
                )}
                <button className={styles.seg_closeBtn} onClick={() => setModalOpen(false)}><X size={18} /></button>
              </div>
            </div>

            <div className={styles.seg_modalBody}>

              {/* ── Empresa asociada ─────────────────────────────────────────────── */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16,
                marginBottom: 26, padding: '16px 18px',
                background: '#f4f8ff', border: '1.5px solid #d6e4ff', borderRadius: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 280px', minWidth: 0 }}>
                  <label style={{
                    fontSize: 12, fontWeight: 800, color: '#4f5d95',
                    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Building2 size={14} />
                    Empresa asociada
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    name="empresa"
                    value={form.empresa || ''}
                    onChange={handleFieldChange}
                    style={{
                      padding: '11px 13px', borderRadius: 8,
                      border: '1.5px solid #c7d8ff',
                      fontSize: 14, fontWeight: 600,
                      background: '#fff', color: '#1a2236',
                      cursor: 'pointer', outline: 'none',
                      width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Seleccionar empresa…</option>
                    {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                {!editTarget && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 220px', minWidth: 0 }}>
                    <label style={{
                      fontSize: 12, fontWeight: 800, color: '#4f5d95',
                      marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <MapPin size={14} />
                      Sede
                      <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      name="sede"
                      value={form.sede || ''}
                      onChange={handleFieldChange}
                      style={{
                        padding: '11px 13px', borderRadius: 8,
                        border: '1.5px solid #c7d8ff',
                        fontSize: 14, fontWeight: 600,
                        background: '#fff', color: '#1a2236',
                        cursor: 'pointer', outline: 'none',
                        width: '100%', boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Seleccionar sede…</option>
                      {SEDES_CREAR.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

              </div>

              <Section title="Datos del Vehículo y Ruta">
                <Row>
                  <Field label="Placa" name="placaTrasbordo" form={form} onChange={handleFieldChange} />
                  <Field label="Conductor" name="conductorRuta" form={form} onChange={handleFieldChange} />
                  <Field label="Número de Manifiesto" name="nroManifiesto" form={form} onChange={handleFieldChange} />
                </Row>
                <Row>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tipo de Viaje</label>
                    <select name="tipoViaje" value={form.tipoViaje || ''} onChange={handleFieldChange}
                      style={{ padding: '10px 13px', borderRadius: 8, border: '1.5px solid #d0d5dd', fontSize: 14, background: '#fff', color: '#1a2236', cursor: 'pointer', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Seleccionar…</option>
                      <option value="Urbano">Urbano</option>
                      <option value="Correría">Correría</option>
                    </select>
                  </div>
                  <Field label="Ruta de Viaje" name="ruta" form={form} onChange={handleFieldChange} />
                  <MoneyField label="Flete ($)" name="flete" form={form} onChange={handleFieldChange} />
                </Row>
                <Row>
                  <MoneyField label="Ajuste ($)" name="ajusteAutorizado" form={form} onChange={handleFieldChange} />
                  <MoneyField label="Anticipo ($)" name="anticipo" form={form} onChange={handleFieldChange} />
                  <CalcField label="Retención 1% (calc.)" value={fmtMoney(form.retencion || 0)} color={{ border: '#fde68a', bg: '#fffbeb', text: '#92400e' }} />
                </Row>
                <Row>
                  <CalcField label="Saldo a Pagar (calc.)" value={fmtMoney(form.saldoPagar || 0)} />
                </Row>
              </Section>

              <Section title="Legalización">
                <Row>
                  <Field label="Fecha de Salida" name="fechaSalidaRuta" type="date" form={form} onChange={handleFieldChange} />
                  <CalcField label="Días de Ruta (calc.)" value={form.plazoMaximo ? `${form.plazoMaximo} día${form.plazoMaximo !== '1' ? 's' : ''}` : '—'} color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }} />
                  <CalcField label="Fecha Límite (calc.)" value={form.limiteEntrega ? fmtDate(form.limiteEntrega) : '—'} color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }} />
                  <CalcField label="Alerta" value={form.alertaLegalizacion || 'En plazo ✓'}
                    color={{
                      border: form.alertaLegalizacion?.includes('VENCIDA') ? '#fca5a5' : '#bbf7d0',
                      bg: form.alertaLegalizacion?.includes('VENCIDA') ? '#fee2e2' : '#f0fdf4',
                      text: form.alertaLegalizacion?.includes('VENCIDA') ? '#b91c1c' : '#15803d',
                    }} bold />
                </Row>
                <Row>
                  <Field label="Fecha de Legalización" name="fechaLegalizacionReal" type="date" form={form} onChange={handleFieldChange} />
                  <Field label="Estado Legalización" name="estadoLegalizacion" form={form} onChange={handleFieldChange} />
                </Row>
              </Section>

            </div>

            {formError && (
              <div className={styles.seg_errorBanner} style={{ margin: '0 24px 12px' }}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <div className={styles.seg_modalFoot}>
              <button className={styles.seg_cancelBtn} onClick={() => setModalOpen(false)}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 9, border: 'none', background: saving ? '#9ca3af' : '#1a2236', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving
                  ? <><RefreshCw size={14} className={styles.seg_spin} /> Guardando…</>
                  : <><Save size={14} /> {editTarget ? 'Guardar cambios' : 'Crear planilla'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ───────────────────────────────────── */}
      {deleteTarget && (
        <div className={styles.seg_modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗑</div>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#1a2236' }}>Eliminar planilla</p>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1.5px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Planilla:</strong> {deleteTarget.planilla || '—'}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}><strong>Conductor:</strong> {deleteTarget.conductorRuta || '—'}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}><strong>Sede:</strong> {deleteTarget.sede || '—'}</p>
            </div>
            {formError && <div className={styles.seg_errorBanner}><AlertCircle size={14} /> {formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteTarget(null); setFormError(''); }}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: deleting ? '#9ca3af' : '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting
                  ? <><RefreshCw size={13} className={styles.seg_spin} /> Eliminando…</>
                  : '🗑 Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — AdminSedeDashboard
══════════════════════════════════════════════════════════════════════════ */
export default function AdminSedeDashboard({ user: propUser, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeSection, setActiveSection] = useState('seguimiento'); // 'seguimiento' | 'mensajes'

  return (
    <div className={styles.dashboard}>
      <button className={styles.mobileMenuBtn} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Abrir menú">
        <Menu size={24} />
      </button>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${sidebarHovered ? styles.sidebarExpanded : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            <span className={styles.titleIcon}>A</span>
            <span className={styles.titleText}>COOESPATRANS</span>
          </h2>
          <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          {/* Botón Seguimiento */}
          <button
            className={`${styles.navButton} ${activeSection === 'seguimiento' ? styles.navActive : ''}`}
            title="Seguimiento"
            onClick={() => { setActiveSection('seguimiento'); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={20} className={styles.navIcon} />
            <span className={styles.navLabel}>Seguimiento</span>
          </button>

          {/* Botón Manifiestos */}
          <button
            className={`${styles.navButton} ${activeSection === 'manifiestos' ? styles.navActive : ''}`}
            title="Manifiestos"
            onClick={() => { setActiveSection('manifiestos'); setSidebarOpen(false); }}
          >
            <FileText size={20} className={styles.navIcon} />
            <span className={styles.navLabel}>Manifiestos</span>
          </button>

          {/* Botón Mensajes */}
          <button
            className={`${styles.navButton} ${activeSection === 'mensajes' ? styles.navActive : ''}`}
            title="Mensajes"
            onClick={() => { setActiveSection('mensajes'); setSidebarOpen(false); }}
          >
            <MessageSquare size={20} className={styles.navIcon} />
            <span className={styles.navLabel}>Mensajes</span>
          </button>
        </nav>

        {onLogout && (
          <button onClick={onLogout} className={styles.logoutBtn2} title="Cerrar sesión">
            <LogOut size={20} className={styles.logoutIcon} />
            <span className={styles.logoutLabel}>Cerrar sesión</span>
          </button>
        )}
      </aside>

      <main className={styles.content}>
        <div className={styles.contentWrapper}
          style={activeSection === 'mensajes' ? { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } : {}}>
          {activeSection === 'seguimiento' && (
            <SeguimientoPlanillas user={propUser} />
          )}
          {activeSection === 'manifiestos' && (
            <GestionManifiestos user={propUser} />
          )}
          {activeSection === 'mensajes' && (
            <ChatMessenger user={propUser} />
          )}
        </div>
      </main>
    </div>
  );
}