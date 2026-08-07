// components/Seguimiento.js
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, MapPin, AlertCircle, Eye, X, Paperclip, FileSpreadsheet } from 'lucide-react';
import styles from './Seguimiento.module.css';

const API = 'https://api.cooespatrans.com/api';
const token = () => localStorage.getItem('token');
const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});

const fmtDate = (d) => {
  if (!d) return '—';
  const str = typeof d === 'string' ? d : d.toISOString?.() ?? String(d);
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

const SEDES = ['Todas', 'Pitalito', 'Huila', 'Neiva'];

const LOCKABLE = [
  'planilla', 'placaMula', 'nombreConductorMula', 'nroFacturaMula',
  'novedadesAverias', 'valorAverias',
  'conductorRuta', 'placaTrasbordo', 'planillaTrasbordo',
  'tipoViaje', 'nroManifiesto',
  'fechaSalidaRuta', 'ruta', 'plazoMaximo',
  'limiteEntrega', 'flete', 'anticipo', 'ajusteAutorizado',
  'retencion',
  'alertaLegalizacion', 'fechaLegalizacion',
  'fechaLegalizacionReal',
  'estadoLegalizacion',
  'nroFacturaCorbeta', 'observaciones',
  'nroFacturaPago', 'valorPagado', 'observacionesCruze',
];

export default function Seguimiento() {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/planillas`, { headers: hdrs() });
      if (res.status === 401) throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      if (res.status === 403) throw new Error('No tienes permisos para ver estas planillas.');
      if (!res.ok) throw new Error(`Error del servidor (${res.status}). Intenta de nuevo.`);
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      setError(e.message);
      setPlanillas([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtradas = planillas.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchTexto =
      (p.planilla || '').toLowerCase().includes(q) ||
      (p.placaMula || '').toLowerCase().includes(q) ||
      (p.conductorRuta || '').toLowerCase().includes(q) ||
      (p.ruta || '').toLowerCase().includes(q) ||
      (p.userEmail || '').toLowerCase().includes(q);
    const matchSede = sedeFiltro === 'Todas' || p.sede === sedeFiltro;
    return matchTexto && matchSede;
  });

  const completitudLabel = (p) => {
    const total = LOCKABLE.length;
    const llenos = LOCKABLE.filter(f => p.lockedFields?.includes(f)).length;
    return `${llenos}/${total}`;
  };

  const alertaStyle = (alerta) => {
    if (!alerta) return styles.badgeGreen;
    if (alerta === 'Legalizado ✓') return styles.badgeGreen;
    if (alerta.toLowerCase().includes('vencida')) return styles.badgeRed;
    return styles.badgeAmber;
  };

  const tienePagoCorbeta = (p) =>
    p.nroFacturaPago || p.valorPagado || p.utilidad || p.observacionesCruze;

  const handleExport = async () => {
    if (!exportDesde || !exportHasta) {
      alert('Por favor selecciona el rango de fechas completo (Desde y Hasta).');
      return;
    }
    if (exportDesde > exportHasta) {
      alert('La fecha "Desde" no puede ser mayor que "Hasta".');
      return;
    }

    setExportLoading(true);
    try {
      // Construir URL con parámetros
      const params = new URLSearchParams({ desde: exportDesde, hasta: exportHasta });
      if (sedeFiltro !== 'Todas') params.append('sede', sedeFiltro);

      const res = await fetch(
        `https://api.cooespatrans.com/api/planillas/export/excel?${params}`,
        { headers: hdrs() }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(err.message || `Error ${res.status}`);
      }

      // Convertir respuesta a Blob y disparar descarga
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planillas_${exportDesde}_al_${exportHasta}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(`No se pudo exportar: ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seguimiento de Planillas</h1>
          <p className={styles.sub}>Vista consolidada de todas las sedes</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchAll} disabled={loading} title="Actualizar">
          <RefreshCw size={15} className={loading ? styles.spin : ''} />
        </button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            placeholder="Buscar por planilla, placa, conductor, ruta, email…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.sedeFilter}>
          {SEDES.map(s => (
            <button
              key={s}
              className={`${styles.sedeBtn} ${sedeFiltro === s ? styles.sedeBtnActive : ''}`}
              onClick={() => setSedeFiltro(s)}
            >
              {s !== 'Todas' && <MapPin size={12} />}
              {s}
            </button>
          ))}
        </div>
        <span className={styles.countTag}>
          {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
        </span>
      </div>
      {/* ── Exportar a Excel ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: 10, padding: '10px 14px',
        background: '#f9fafb', border: '1.5px solid #e5e7eb',
        borderRadius: 10, marginBottom: 16,
      }}>
        <FileSpreadsheet size={15} color="#16a34a" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Exportar Excel</span>
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

        <input
          type="date"
          value={exportDesde}
          onChange={e => setExportDesde(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            border: '1.5px solid #d1d5db', background: '#fff',
            color: '#1a2236', outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: '#9ca3af' }}>→</span>
        <input
          type="date"
          value={exportHasta}
          onChange={e => setExportHasta(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            border: '1.5px solid #d1d5db', background: '#fff',
            color: '#1a2236', outline: 'none',
          }}
        />

        <button
          onClick={handleExport}
          disabled={exportLoading || !exportDesde || !exportHasta}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 7,
            background: exportLoading || !exportDesde || !exportHasta ? '#f3f4f6' : '#16a34a',
            color: exportLoading || !exportDesde || !exportHasta ? '#9ca3af' : '#fff',
            border: 'none', fontWeight: 700, fontSize: 12,
            cursor: exportLoading || !exportDesde || !exportHasta ? 'not-allowed' : 'pointer',
          }}
        >
          {exportLoading
            ? <><RefreshCw size={13} className={styles.spin} /> Generando…</>
            : <><FileSpreadsheet size={13} /> Descargar</>
          }
        </button>
      </div>
      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── Tabla — sin cambios respecto al original ─────────────────────── */}
      <div className={styles.card}>
        {loading ? (
          <div className={styles.loader}>
            <RefreshCw size={24} className={styles.spin} />
            <span>Cargando planillas…</span>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Planilla</th>
                  <th>Placa Mula</th>
                  <th>Conductor</th>
                  <th>Ruta</th>
                  <th>Sede</th>
                  <th>F. Salida</th>
                  <th>Saldo a Pagar</th>
                  <th>Alerta</th>
                  <th>Estado Leg.</th>
                  <th>Adjunto</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={p._id || i}>
                    <td className={styles.tdNum}>{i + 1}</td>
                    <td><strong>{p.planilla || '—'}</strong></td>
                    <td>{p.placaMula || '—'}</td>
                    <td>{p.conductorRuta || '—'}</td>
                    <td className={styles.tdRuta}>{p.ruta || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${p.sede === 'Pitalito' ? styles.badgeTeal
                        : p.sede === 'Neiva' ? styles.badgePurple
                          : styles.badgeBlue
                        }`}>
                        {p.sede}
                      </span>
                    </td>
                    <td>{fmtDate(p.fechaSalidaRuta)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: (p.saldoPagar || 0) > 0 ? '#065f46' : '#b91c1c' }}>
                        {fmtMoney(p.saldoPagar)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${alertaStyle(p.alertaLegalizacion)}`}>
                        {p.alertaLegalizacion || 'En plazo ✓'}
                      </span>
                    </td>
                    <td>
                      {p.alertaLegalizacion === 'Legalizado ✓' ? (
                        <span className={`${styles.badge} ${styles.badgeGreen}`}>Legalizado</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeAmber}`}>Pendiente</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.archivoPlanilla ? (
                        <a
                          href={`https://api.cooespatrans.com${p.archivoPlanilla}`}
                          target="_blank" rel="noreferrer"
                          title="Ver planilla adjunta"
                          style={{ display: 'inline-flex', alignItems: 'center', color: '#4338ca' }}
                        >
                          <Paperclip size={14} />
                        </a>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button className={styles.expandBtn} onClick={() => setSelected(p)} title="Ver detalle">
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className={styles.emptyCell}>
                      {planillas.length === 0 ? 'No hay planillas registradas.' : 'Sin resultados para la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal detalle ───────────────────────────────────────────────────── */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Planilla {selected.planilla || '—'}</h2>
                <p className={styles.modalSub}>
                  Sede: <strong>{selected.sede}</strong>
                  &nbsp;·&nbsp;Creado por: <strong>{selected.userEmail || '—'}</strong>
                  &nbsp;·&nbsp;{fmtDate(selected.createdAt)}
                  &nbsp;·&nbsp;Completitud: <strong>{completitudLabel(selected)}</strong>
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>

              {/* ── 1. Datos de la Mula ──────────────────────────────────── */}
              <Section title="Datos de la Mula">
                <Row>
                  <DField label="Planilla" value={selected.planilla} />
                  <DField label="Placa Mula" value={selected.placaMula} />
                  <DField label="Nombre del Conductor" value={selected.nombreConductorMula} />
                </Row>
                <Row>
                  <DField label="Número de Factura" value={selected.nroFacturaMula} />
                  <DField label="Valor Averías" value={fmtMoney(selected.valorAverias)} />
                </Row>
                <Row>
                  <DField label="Descripción / Observación del Producto" value={selected.novedadesAverias} wide />
                </Row>
                {Array.isArray(selected.novedades) && selected.novedades.length > 0 && (
                  <NovedadTable title="Novedades adicionales" items={selected.novedades} />
                )}
              </Section>

              {/* ── 2. Datos del Vehículo y Ruta ─────────────────────────── */}
              <Section title="Datos del Vehículo y Ruta">
                <Row>
                  <DField label="Planilla" value={selected.planillaTrasbordo} />
                  <DField label="Placa" value={selected.placaTrasbordo} />
                  <DField label="Conductor" value={selected.conductorRuta} />
                </Row>
                <Row>
                  <DField label="Tipo de Viaje" value={selected.tipoViaje} />
                  <DField label="Ruta de Viaje" value={selected.ruta} />
                  <DField label="Número de Manifiesto" value={selected.nroManifiesto} />
                </Row>
                <Row>
                  <DField label="Flete ($)" value={fmtMoney(selected.flete)} highlight />
                  <DField label="Anticipo ($)" value={fmtMoney(selected.anticipo)} />
                  <DField label="Ajuste ($)" value={fmtMoney(selected.ajusteAutorizado)} />
                </Row>
                <Row>
                  <DField
                    label="Retención 1% (calc.)"
                    value={fmtMoney(selected.retencion)}
                    color={{ border: '#fde68a', bg: '#fffbeb', text: '#92400e' }}
                  />
                  <DField
                    label="Saldo a Pagar (calc.)"
                    value={fmtMoney(selected.saldoPagar)}
                    highlight
                  />
                </Row>
              </Section>

              {/* ── 3. Legalización ──────────────────────────────────────── */}
              <Section title="Legalización">
                <Row>
                  <DField label="Fecha de Salida" value={fmtDate(selected.fechaSalidaRuta)} />
                  <DField
                    label="Días de Ruta (calc.)"
                    value={selected.plazoMaximo ? `${selected.plazoMaximo} día${selected.plazoMaximo !== 1 ? 's' : ''}` : '—'}
                    color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }}
                  />
                  <DField
                    label="Fecha Límite (calc.)"
                    value={fmtDate(selected.limiteEntrega)}
                    color={{ border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 180px', minWidth: 0 }}>
                    <span style={labelStyle}>Alerta</span>
                    <div style={{
                      padding: '9px 13px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                      border: `1.5px solid ${selected.alertaLegalizacion === 'Legalizado ✓' ? '#86efac'
                        : (selected.alertaLegalizacion || '').includes('Vencida') ? '#fca5a5'
                          : '#bbf7d0'
                        }`,
                      background:
                        selected.alertaLegalizacion === 'Legalizado ✓' ? '#dcfce7'
                          : (selected.alertaLegalizacion || '').includes('Vencida') ? '#fee2e2'
                            : '#f0fdf4',
                      color:
                        selected.alertaLegalizacion === 'Legalizado ✓' ? '#15803d'
                          : (selected.alertaLegalizacion || '').includes('Vencida') ? '#b91c1c'
                            : '#15803d',
                    }}>
                      {selected.alertaLegalizacion || 'En plazo ✓'}
                    </div>
                  </div>
                </Row>
                <Row>
                  <DField
                    label="Fecha de Legalización"
                    value={fmtDate(selected.fechaLegalizacionReal)}
                    highlight={!!selected.fechaLegalizacionReal}
                  />
                </Row>
                <Row>
                  <DField label="Número de Factura" value={selected.nroFacturaCorbeta} />
                  <DField
                    label="Estado"
                    value={selected.estadoLegalizacion || 'Pendiente'}
                    highlight={!!selected.estadoLegalizacion}
                  />
                </Row>
                <Row>
                  <DField label="Observaciones" value={selected.observaciones} wide />
                </Row>

                {Array.isArray(selected.novedadesLegalizacion) && selected.novedadesLegalizacion.length > 0 && (
                  <NovedadTable title="Novedades de Legalización" items={selected.novedadesLegalizacion} />
                )}

                <Row>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 100%' }}>
                    <span style={labelStyle}>Planilla Adjunta</span>
                    {selected.archivoPlanilla ? (
                      <a
                        href={`https://api.cooespatrans.com${selected.archivoPlanilla}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '9px 14px', borderRadius: 8,
                          border: '1.5px solid #bae6fd', background: '#f0f9ff',
                          color: '#0284c7', fontWeight: 600, fontSize: 13,
                          textDecoration: 'none', width: 'fit-content',
                        }}
                      >
                        <Paperclip size={14} /> Ver planilla adjunta
                      </a>
                    ) : (
                      <div style={{
                        padding: '9px 13px', borderRadius: 8,
                        border: '1.5px solid #e5e7eb', background: '#f9fafb',
                        fontSize: 13, color: '#9ca3af',
                      }}>
                        Sin archivo adjunto
                      </div>
                    )}
                  </div>
                </Row>
              </Section>

              {/* ── 4. Pago Corbeta ───────────────────────────────────────── */}
              <Section title="Pago Corbeta">
                {tienePagoCorbeta(selected) ? (
                  <>
                    <Row>
                      <DField
                        label="N° de Factura de Pago"
                        value={selected.nroFacturaPago}
                      />
                      <DField
                        label="Valor Pagado"
                        value={fmtMoney(selected.valorPagado)}
                        highlight
                      />
                      <DField
                        label="Utilidad"
                        value={fmtMoney(selected.utilidad)}
                        color={{ border: '#86efac', bg: '#f0fdf4', text: '#15803d' }}
                      />
                    </Row>
                    <Row>
                      <DField
                        label="Observaciones Cruze"
                        value={selected.observacionesCruze}
                        wide
                      />
                    </Row>
                  </>
                ) : (
                  <div style={{
                    padding: '18px 16px', borderRadius: 8,
                    border: '1.5px dashed #bbf7d0', background: '#f0fdf4',
                    color: '#6b7280', fontSize: 13, textAlign: 'center',
                  }}>
                    Aún no se ha registrado información de pago para esta planilla.
                  </div>
                )}
              </Section>

            </div>

            <div className={styles.modalFoot}>
              <button className={styles.cancelBtn} onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Colores de sección ────────────────────────────────────────────────────────
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
        <p style={{ fontSize: 12, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '16px 18px 4px' }}>{children}</div>
    </div>
  );
};

const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>{children}</div>
);

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  marginBottom: 5, display: 'block',
};

const DField = ({ label, value, wide, highlight, color }) => {
  const c = color || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: wide ? '1 1 100%' : '1 1 180px', minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      <div style={{
        padding: '9px 13px', borderRadius: 8, wordBreak: 'break-word',
        border: `1.5px solid ${c.border || (highlight ? '#bbf7d0' : '#e5e7eb')}`,
        background: c.bg || (highlight ? '#f0fdf4' : '#f9fafb'),
        color: c.text || (highlight ? '#065f46' : '#1a2236'),
        fontSize: 14,
        fontWeight: (highlight || c.text) ? 700 : 500,
      }}>
        {value || '—'}
      </div>
    </div>
  );
};

const NovedadTable = ({ title, items }) => (
  <div style={{ marginTop: 4, marginBottom: 10 }}>
    <span style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>
      {title} ({items.length})
    </span>
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={thStyle}>Planilla</th>
            <th style={thStyle}>Descripción</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map((n, idx) => (
            <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={tdStyle}>{n.planilla || '—'}</td>
              <td style={tdStyle}>{n.descripcion || '—'}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(n.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const thStyle = {
  padding: '8px 12px', textAlign: 'left',
  fontWeight: 700, color: '#6b7280',
  fontSize: 11, textTransform: 'uppercase',
};
const tdStyle = { padding: '8px 12px', color: '#374151' };