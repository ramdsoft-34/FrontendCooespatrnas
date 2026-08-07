import React, { useState, useEffect, useCallback } from 'react';
import {
  LogOut, RefreshCw, CheckCircle, AlertCircle,
  ClipboardList, X, Edit2, Save, Menu, Copy, MapPin,
  Truck, User, CreditCard, DollarSign,
} from 'lucide-react';
import styles from './ManifiestoPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';
const token = () => localStorage.getItem('token');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '$0';
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) : '—';

/* ── Toast ──────────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

function Toasts({ toasts, remove }) {
  return (
    <div className={styles.toastStack}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[`toast_${t.type}`]}`}>
          {t.type === 'success' && <CheckCircle size={14} />}
          {t.type === 'error' && <AlertCircle size={14} />}
          {t.type === 'info' && <Copy size={14} />}
          <span>{t.message}</span>
          <button onClick={() => remove(t.id)} className={styles.toastClose}><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

/* ── CopyChip: valor que se copia al hacer click ────────────────────────── */
function CopyChip({ value, label, mono = false, highlight = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}`}
      className={`${styles.copyChip} ${mono ? styles.copyChipMono : ''} ${highlight ? styles.copyChipHighlight : ''} ${copied ? styles.copyChipDone : ''}`}
    >
      <span>{copied ? '¡Copiado!' : value}</span>
      <span className={styles.copyChipIcon}>
        {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      </span>
    </button>
  );
}

/* ── Estado badge ───────────────────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const cfg = {
    pendiente:  { cls: styles.badgePendiente,  label: 'Pendiente'  },
    en_proceso: { cls: styles.badgeEnProceso,  label: 'En proceso' },
    completado: { cls: styles.badgeCompletado, label: 'Completado' },
  };
  const c = cfg[estado] || cfg.pendiente;
  return <span className={`${styles.badge} ${c.cls}`}>{c.label}</span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function ManifiestoPage({ user, onLogout }) {
  const toast = useToast();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBodega, setFiltroBodega] = useState('todas');
  const [bodegas, setBodegas] = useState([]);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ numeroRemesa: '', numeroManifiesto: '' });
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchReportes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
      if (filtroBodega !== 'todas') params.append('bodega', filtroBodega);
      const res = await fetch(`${API_URL}/manifiestos/reportes?${params}`, { headers: hdrs() });
      const data = await res.json();
      setReportes(data.reportes || []);
    } catch { toast.add('Error al cargar reportes', 'error'); }
    finally { setLoading(false); }
  }, [filtroEstado, filtroBodega]);

  const fetchBodegas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/manifiestos/bodegas`, { headers: hdrs() });
      const data = await res.json();
      setBodegas(data.bodegas || []);
    } catch { }
  }, []);

  useEffect(() => { fetchBodegas(); }, [fetchBodegas]);
  useEffect(() => { fetchReportes(); }, [fetchReportes]);

  const handleTomar = async (reporte) => {
    try {
      const res = await fetch(`${API_URL}/manifiestos/reportes/${reporte._id}/tomar`, { method: 'POST', headers: hdrs() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo tomar el reporte');
      toast.add(`Reporte ${reporte.numeroRemesa} tomado`);
      fetchReportes();
    } catch (e) { toast.add(e.message, 'error'); }
  };

  const handleCompletar = async (reporte) => {
    if (!window.confirm(`¿Marcar el reporte ${reporte.numeroRemesa} como completado?`)) return;
    try {
      const res = await fetch(`${API_URL}/manifiestos/reportes/${reporte._id}/completar`, { method: 'POST', headers: hdrs() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo completar');
      toast.add(`Reporte ${reporte.numeroRemesa} completado ✓`);
      fetchReportes();
    } catch (e) { toast.add(e.message, 'error'); }
  };

  const openEdit = (reporte) => {
    setEditForm({ numeroRemesa: reporte.numeroRemesa, numeroManifiesto: reporte.numeroManifiesto });
    setEditModal(reporte);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/manifiestos/reportes/${editModal._id}`, {
        method: 'PUT', headers: hdrs(),
        body: JSON.stringify({ numeroRemesa: editForm.numeroRemesa, numeroManifiesto: editForm.numeroManifiesto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      toast.add('Números actualizados');
      setEditModal(null);
      fetchReportes();
    } catch (e) { toast.add(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const pendientes = reportes.filter(r => r.estado === 'pendiente').length;
  const enProceso  = reportes.filter(r => r.estado === 'en_proceso' && r.tomadoPor === user?.id).length;
  const completados = reportes.filter(r => r.estado === 'completado').length;

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #d0d5dd', fontSize: 13,
    color: '#1a2236', outline: 'none',
    width: '100%', boxSizing: 'border-box',
    background: '#fff',
  };

  const FILTROS = [
    { key: 'todos',      label: 'Todos'      },
    { key: 'pendiente',  label: 'Pendientes' },
    { key: 'en_proceso', label: 'En proceso' },
    { key: 'completado', label: 'Completados'},
  ];

  return (
    <div className={styles.dashboard}>
      <Toasts toasts={toast.toasts} remove={toast.remove} />

      {/* ── Botón mobile ── */}
      <button className={styles.mobileMenuBtn} onClick={() => setSidebarOpen(v => !v)}>
        <Menu size={20} />
      </button>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>

        {/* Logo */}
        <div className={styles.sidebarLogo}>
          <div className={styles.logoIcon}>
            <Truck size={16} />
          </div>
          <div>
            <div className={styles.logoTitle}>COOESPATRANS</div>
            <div className={styles.logoSub}>Manifiestos</div>
          </div>
        </div>

        {/* Usuario */}
        <div className={styles.sidebarUser}>
          <div className={styles.userAvatar}>
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className={styles.userName}>{user?.username}</div>
            <div className={styles.userRole}>Operador</div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className={styles.sidebarStats}>
          <div className={styles.statCard}>
            <span className={styles.statNum} style={{ color: '#d97706' }}>{pendientes}</span>
            <span className={styles.statLabel}>Pendientes</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum} style={{ color: '#2563eb' }}>{enProceso}</span>
            <span className={styles.statLabel}>Mis reportes</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum} style={{ color: '#16a34a' }}>{completados}</span>
            <span className={styles.statLabel}>Completados</span>
          </div>
        </div>

        <div className={styles.sidebarSpacer} />

        {onLogout && (
          <button onClick={onLogout} className={styles.logoutBtn}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        )}
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════════════════ */}
      <main className={styles.main}>
        <div className={styles.mainInner}>

          {/* Header */}
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.pageTitle}>Reportes de Manifiestos</h1>
              <p className={styles.pageSub}>Toma un reporte pendiente y márcalo como completado cuando termines</p>
            </div>
            <button onClick={fetchReportes} className={styles.btnRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? styles.spin : ''} />
              Actualizar
            </button>
          </div>

          {/* Toolbar filtros */}
          <div className={styles.toolbar}>
            <div className={styles.filtroGroup}>
              {FILTROS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(key)}
                  className={`${styles.filtroPill} ${filtroEstado === key ? styles.filtroPillActive : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={filtroBodega}
              onChange={e => setFiltroBodega(e.target.value)}
              className={styles.selectBodega}
            >
              <option value="todas">Todas las bodegas</option>
              {bodegas.map(b => (
                <option key={b._id} value={b.nombre}>{b.nombre}</option>
              ))}
            </select>
          </div>

          {/* Conteo */}
          {!loading && (
            <div className={styles.conteo}>
              {reportes.length} reporte{reportes.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className={styles.loadingBox}>
              <RefreshCw size={22} className={styles.spin} />
              <span>Cargando reportes…</span>
            </div>
          ) : (
            <div className={styles.reportesGrid}>
              {reportes.map(r => {
                const esMio          = r.tomadoPor === user?.id;
                const puedeTomar     = r.estado === 'pendiente';
                const puedeCompletar = r.estado === 'en_proceso' && esMio;
                const puedeEditar    = r.estado === 'en_proceso' && esMio;
                const saldo = (r.valorFlete || 0) - (r.valorAnticipo || 0) + (r.ajuste || 0);

                return (
                  <div
                    key={r._id}
                    className={`${styles.card}
                      ${esMio && r.estado === 'en_proceso' ? styles.cardMio : ''}
                      ${r.estado === 'completado' ? styles.cardDone : ''}
                    `}
                  >
                    {/* ── Cabecera de la card ── */}
                    <div className={styles.cardHead}>
                      <div className={styles.cardHeadLeft}>
                        <EstadoBadge estado={r.estado} />
                        <span className={styles.bodegaTag}>{r.bodegaNombre}</span>
                        {esMio && r.estado === 'en_proceso' && (
                          <span className={styles.mioTag}>MI REPORTE</span>
                        )}
                      </div>
                      {/* Números copiables */}
                      <div className={styles.cardNums}>
                        <CopyChip value={r.numeroRemesa}    label="remesa"     mono />
                        <CopyChip value={r.numeroManifiesto} label="manifiesto" mono />
                      </div>
                    </div>

                    {/* ── Placa destacada ── */}
                    <div className={styles.placaRow}>
                      <Truck size={14} className={styles.placaIcon} />
                      <CopyChip value={r.placa} label="placa" highlight mono />
                      <span className={styles.destinoInline}>
                        <MapPin size={12} />
                        {r.destino}
                      </span>
                    </div>

                    {/* ── Personas ── */}
                    <div className={styles.personasGrid}>
                      <div className={styles.personaBlock}>
                        <div className={styles.personaHeader}>
                          <User size={11} /> Conductor
                        </div>
                        <div className={styles.personaNombre}>{r.nombreConductor}</div>
                        <CopyChip value={r.cedulaConductor} label="cédula conductor" mono />
                      </div>
                      <div className={styles.personaBlock}>
                        <div className={styles.personaHeader}>
                          <User size={11} /> Propietario
                        </div>
                        <div className={styles.personaNombre}>{r.nombreTitular}</div>
                        <CopyChip value={r.cedulaTitular} label="cédula titular" mono />
                      </div>
                    </div>

                    {/* ── Valores financieros ── */}
                    <div className={styles.valoresRow}>
                      <div className={styles.valorItem}>
                        <span className={styles.valorLabel}>
                          <DollarSign size={10} /> Flete
                        </span>
                        <span className={styles.valorNum}>{fmtMoney(r.valorFlete)}</span>
                      </div>
                      <div className={styles.valorSep} />
                      <div className={styles.valorItem}>
                        <span className={styles.valorLabel}>Anticipo</span>
                        <span className={styles.valorNum}>{fmtMoney(r.valorAnticipo)}</span>
                      </div>
                      {r.ajuste !== 0 && (
                        <>
                          <div className={styles.valorSep} />
                          <div className={styles.valorItem}>
                            <span className={styles.valorLabel}>Ajuste</span>
                            <span className={styles.valorNum}>{fmtMoney(r.ajuste)}</span>
                          </div>
                        </>
                      )}
                      <div className={styles.valorSep} />
                      <div className={styles.valorItem}>
                        <span className={styles.valorLabel}>Saldo</span>
                        <span className={`${styles.valorNum} ${styles.valorSaldo}`}>{fmtMoney(saldo)}</span>
                      </div>
                    </div>

                    {/* ── Pie: quién tomó / cuándo ── */}
                    {r.tomadoPorNombre && r.estado !== 'pendiente' && (
                      <div className={styles.cardFooterInfo}>
                        {r.estado === 'completado' ? <CheckCircle size={11} /> : <RefreshCw size={11} />}
                        {r.tomadoPorNombre} · {fmtDate(r.fechaTomado)}
                      </div>
                    )}

                    {/* ── Acciones ── */}
                    <div className={styles.cardActions}>
                      {puedeEditar && (
                        <button onClick={() => openEdit(r)} className={styles.btnSecondary}>
                          <Edit2 size={13} /> Editar números
                        </button>
                      )}
                      {puedeTomar && (
                        <button onClick={() => handleTomar(r)} className={styles.btnTomar}>
                          <ClipboardList size={13} /> Tomar reporte
                        </button>
                      )}
                      {puedeCompletar && (
                        <button onClick={() => handleCompletar(r)} className={styles.btnCompletar}>
                          <CheckCircle size={13} /> Marcar completado
                        </button>
                      )}
                      {r.estado === 'completado' && (
                        <div className={styles.completadoLabel}>
                          <CheckCircle size={13} /> Finalizado
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {reportes.length === 0 && (
                <div className={styles.emptyBox}>
                  <ClipboardList size={40} />
                  <p>No hay reportes que coincidan con el filtro</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ══ MODAL EDITAR NÚMEROS ══════════════════════════════════════════ */}
      {editModal && (
        <div className={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3 className={styles.modalTitle}>Editar numeración</h3>
              <button onClick={() => setEditModal(null)} className={styles.modalClose}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Número de Remesa</label>
                <input
                  value={editForm.numeroRemesa}
                  onChange={e => setEditForm(p => ({ ...p, numeroRemesa: e.target.value.toUpperCase() }))}
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }}
                />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Número de Manifiesto</label>
                <input
                  value={editForm.numeroManifiesto}
                  onChange={e => setEditForm(p => ({ ...p, numeroManifiesto: e.target.value.toUpperCase() }))}
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }}
                />
              </div>
            </div>
            <div className={styles.modalFoot}>
              <button onClick={() => setEditModal(null)} className={styles.btnSecondary}>Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving} className={styles.btnTomar}
                style={{ opacity: saving ? 0.7 : 1 }}>
                {saving
                  ? <><RefreshCw size={13} className={styles.spin} /> Guardando…</>
                  : <><Save size={13} /> Guardar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}