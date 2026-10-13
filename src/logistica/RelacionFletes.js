// src/logistica/RelacionFletes.js
// Relación de fletes (hoja RELACION): registro de cargues por empresa y
// periodo, cálculo de tarifa, auxiliar, total cobrado, flete y auxiliar
// pagados y utilidad; relación para facturación, pago a conductores e
// informe comparativo de utilidad (pantalla, Excel y PDF).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet, FileText, Plus, Edit2, Trash2, Save, Loader, Receipt, Wallet, TrendingUp, BarChart3,
  CheckSquare, Eraser, Truck, DollarSign, Percent, CalendarDays, Building2, Search,
} from 'lucide-react';
import { api, descargar } from './api';
import {
  estilos as s, cx, useToast, Toasts, Modal, useConfirm, Field, Combo, Loading, Empty, Kpi, Chip, Alerta,
  fmtPesos, fmtPct, fmtFecha, isoFecha, hoyIso, fmtMiles,
} from './ui';

const AUX_BODEGA = 'Auxiliar de Bodega';
const esTat = (d) => d === 'Pasto TAT 1.0' || d === 'Ipiales TAT 1.0';
const N = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const val = (v) => (typeof v === 'number' ? fmtPesos(v) : (v || ''));

// Mismas fórmulas de la hoja RELACION (vista previa en el formulario)
function calcular(f, t) {
  const H = Number(f.cantidad) || 0;
  if (!t || !H) return null;
  const tat = esTat(f.destino);
  const K = f.auxiliar === 'No' ? AUX_BODEGA : N(t.tarifaAuxiliar);
  const total = (tat ? H * t.tarifaCliente : t.tarifaCliente) + H * N(K);
  const P = tat ? N(t.fleteConductor) * H : t.fleteConductor;
  const R = f.auxiliar === 'No' ? AUX_BODEGA : H * N(t.auxiliarPagado);
  return { total, P, R, util: total - (N(R) + N(P)) };
}

// ══════════════════════════════════════════════════════════════════════════
function FormCargue({ fila, empresaPanel, empresas, conductores, onClose, onGuardado, toast }) {
  const [f, setF] = useState(() => (fila
    ? { ...fila, fecha: isoFecha(fila.fecha) }
    : { empresa: empresaPanel || '', placa: '', planilla: '', destino: '', fecha: hoyIso(), cantidad: '', auxiliar: '', facturado: '' }));
  const [tarifas, setTarifas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (!f.empresa) { setTarifas([]); return; }
    api.get('/logistica/tarifas', { empresa: f.empresa }).then(r => setTarifas(r.tarifas)).catch(() => setTarifas([]));
  }, [f.empresa]);
  const tarifa = tarifas.find(t => t.destino.toLowerCase() === String(f.destino).trim().toLowerCase());
  const transportador = conductores.find(c => c.placa === String(f.placa).trim().toUpperCase())?.nombre;
  const coincidencias = !transportador && f.placa ? conductores.filter(c => c.placa.includes(f.placa.toUpperCase()) || c.nombre.toLowerCase().includes(f.placa.toLowerCase())).length : 0;
  const prev = calcular(f, tarifa);

  const guardar = async () => {
    setGuardando(true);
    try {
      if (fila) await api.put(`/logistica/relacion/${fila._id}`, f);
      else await api.post('/logistica/relacion', f);
      toast.ok('Cargue registrado correctamente.');
      if (fila) onGuardado(null);
      else { onGuardado(f.empresa); setF(p => ({ ...p, placa: '', planilla: '', fecha: hoyIso(), cantidad: '', auxiliar: '' })); }
    } catch (e) { toast.error(e.message); } finally { setGuardando(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" icon={fila ? Edit2 : Plus} title={fila ? 'Editar cargue' : 'Registrar cargue'}
      subtitle={fila ? '' : 'Después de guardar, el formulario queda listo para el siguiente cargue de la misma empresa.'}
      footer={<><button className={s.btnGhost} onClick={onClose}>Cerrar</button><button className={s.btnPrimary} disabled={guardando} onClick={guardar}>{guardando ? <Loader size={15} className={s.spin} /> : <Save size={15} />}Guardar</button></>}>
      <div className={s.formGrid3}>
        <Field label="Empresa" required>
          <select className={s.select} value={f.empresa} onChange={e => setF({ ...f, empresa: e.target.value, destino: '' })}>
            <option value="">Selecciona…</option>{empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
          </select>
        </Field>
        <Field label="Placa" required hint={transportador ? `Transportador: ${transportador}` : f.placa ? (coincidencias ? `${coincidencias} coincidencia(s): abra la lista` : 'Sin coincidencias') : 'Busque por placa o por nombre'} hintType={transportador ? 'ok' : 'warn'}>
          <Combo value={f.placa} onChange={v => setF({ ...f, placa: v.toUpperCase() })} opciones={conductores} getLabel={c => c.placa} getMeta={c => c.nombre} placeholder="Ej. MYZ667" />
        </Field>
        <Field label="N° planilla" hint="Si aplica"><input className={s.input} value={f.planilla} onChange={e => setF({ ...f, planilla: e.target.value })} /></Field>
        <Field label="Destino" required className={s.span2} hint={tarifa ? `Tarifa ${fmtPesos(tarifa.tarifaCliente)} · Flete conductor ${fmtPesos(tarifa.fleteConductor)}` : f.destino ? 'Destino sin tarifa registrada para la empresa' : ''} hintType={tarifa ? 'ok' : 'warn'}>
          <Combo value={f.destino} onChange={v => setF({ ...f, destino: v })} opciones={tarifas.map(t => t.destino)} disabled={!f.empresa} placeholder={f.empresa ? 'Selecciona el destino' : 'Primero la empresa'} />
        </Field>
        <Field label="Fecha" required><input type="date" className={s.input} value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
        <Field label="Cantidad (viajes/días)" required><input className={s.input} inputMode="decimal" value={f.cantidad} onChange={e => setF({ ...f, cantidad: e.target.value.replace(/[^0-9.,]/g, '') })} /></Field>
        <Field label="¿Lleva auxiliar?" required hint={f.auxiliar === 'No' ? 'Se registra como "Auxiliar de Bodega"' : ''}>
          <div className={s.segment}>{['Sí', 'No'].map(o => <button key={o} type="button" className={f.auxiliar === o ? s.segmentOn : ''} onClick={() => setF({ ...f, auxiliar: o })}>{o}</button>)}</div>
        </Field>
        {fila && (
          <Field label="Facturado">
            <div className={s.segment}>{['Sí', 'No'].map(o => <button key={o} type="button" className={f.facturado === o ? s.segmentOn : ''} onClick={() => setF({ ...f, facturado: f.facturado === o ? '' : o })}>{o}</button>)}</div>
          </Field>
        )}
        {prev && (
          <div className={cx(s.formSection, s.spanAll)}>
            <p className={s.formSectionTitle}><DollarSign size={14} />Cálculo del cargue</p>
            <div className={s.formGrid}>
              <Field label="Total cobrado"><div className={s.readonlyBox}>{fmtPesos(prev.total)}</div></Field>
              <Field label="Flete conductor"><div className={s.readonlyBox}>{fmtPesos(prev.P)}</div></Field>
              <Field label="Auxiliar pagado"><div className={s.readonlyBox}>{val(prev.R)}</div></Field>
              <Field label="Utilidad"><div className={s.readonlyBox} style={{ color: prev.util < 0 ? '#b91c1c' : '#15803d' }}>{fmtPesos(prev.util)} · {fmtPct(prev.total ? prev.util / prev.total : 0)}</div></Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Informe de utilidad en pantalla ────────────────────────────────────────
function GraficaTorta({ datos }) {
  const total = datos.reduce((a, d) => a + Math.max(0, d.valor), 0) || 1;
  let ang = -Math.PI / 2;
  const r = 70; const c = 80;
  return (
    <svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label="Pagado vs utilidad">
      {datos.map(d => {
        const frac = Math.max(0, d.valor) / total;
        const a2 = ang + frac * Math.PI * 2;
        const p = frac >= 0.9999
          ? <circle key={d.etiqueta} cx={c} cy={c} r={r} fill={d.color} />
          : <path key={d.etiqueta} fill={d.color} d={`M${c},${c} L${c + r * Math.cos(ang)},${c + r * Math.sin(ang)} A${r},${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${c + r * Math.cos(a2)},${c + r * Math.sin(a2)} Z`} />;
        const am = (ang + a2) / 2;
        const etq = frac > 0.04 && <text key={`${d.etiqueta}-t`} x={c + r * 0.58 * Math.cos(am)} y={c + r * 0.58 * Math.sin(am)} fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="middle">{(frac * 100).toFixed(1)}%</text>;
        ang = a2;
        return <g key={`${d.etiqueta}-g`}>{p}{etq}</g>;
      })}
    </svg>
  );
}

function InformeUtilidad({ empresa, periodo, soloPendientes, onClose, toast }) {
  const [datos, setDatos] = useState(null);
  const [ocupado, setOcupado] = useState('');
  useEffect(() => {
    api.get('/logistica/relacion/utilidad', { empresa, periodo, soloPendientes })
      .then(setDatos).catch(e => { toast.error(e.message); onClose(); });
  }, [empresa, periodo, soloPendientes]); // eslint-disable-line react-hooks/exhaustive-deps
  const exportar = async (formato) => {
    setOcupado(formato);
    try { await descargar('/logistica/relacion/exportar', { empresa, periodo, tipo: 'utilidad', formato, soloPendientes }); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const t = datos?.totales;
  const barras = t ? [
    { etiqueta: 'Total cobrado', valor: t.total, color: '#1f4e78' },
    { etiqueta: 'Total pagado conductor', valor: t.pagado, color: '#5b9bd5' },
    { etiqueta: 'Utilidad generada', valor: t.util, color: '#70ad47' },
  ] : [];
  const max = Math.max(...barras.map(b => Math.abs(b.valor)), 1);
  return (
    <Modal open onClose={onClose} size="xl" icon={BarChart3} title={`Informe de utilidad · ${empresa}`} subtitle={`Comparativo viaje a viaje del periodo ${periodo}`}
      footer={<>
        <button className={s.btnGhost} disabled={!!ocupado} onClick={() => exportar('xlsx')}>{ocupado === 'xlsx' ? <Loader size={15} className={s.spin} /> : <FileSpreadsheet size={15} />}Excel</button>
        <button className={s.btnPrimary} disabled={!!ocupado} onClick={() => exportar('pdf')}>{ocupado === 'pdf' ? <Loader size={15} className={s.spin} /> : <FileText size={15} />}PDF con gráficas</button>
      </>}>
      {!datos ? <Loading /> : (
        <div className={s.stack}>
          <div className={s.kpis} style={{ marginBottom: 0 }}>
            <Kpi label="Viajes" value={datos.viajes.length} icon={Truck} />
            <Kpi label="Total cobrado" value={fmtPesos(t.total)} icon={Receipt} />
            <Kpi label="Pagado a conductores" value={fmtPesos(t.pagado)} icon={Wallet} />
            <Kpi label="Utilidad" value={fmtPesos(t.util)} icon={TrendingUp} tono={t.util >= 0 ? 'bueno' : 'malo'} />
            <Kpi label="Margen" value={fmtPct(t.pct)} icon={Percent} />
          </div>
          <div className={s.grid2}>
            <div className={s.card}>
              <h4 className={s.cardTitle} style={{ marginBottom: 8 }}>Comparativo de totales</h4>
              <div className={s.bars}>
                {barras.map(b => (
                  <div key={b.etiqueta} className={s.barCol}>
                    <span className={s.barValue}>{fmtPesos(b.valor)}</span>
                    <div className={s.bar} style={{ height: `${Math.max(2, (Math.abs(b.valor) / max) * 140)}px`, background: b.color }} />
                  </div>
                ))}
              </div>
              <div className={s.barLabels}>{barras.map(b => <span key={b.etiqueta}>{b.etiqueta}</span>)}</div>
            </div>
            <div className={s.card} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 className={s.cardTitle} style={{ marginBottom: 8, alignSelf: 'flex-start' }}>Pagado vs utilidad</h4>
              <GraficaTorta datos={barras.slice(1)} />
              <div className={s.legend}>{barras.slice(1).map(b => <span key={b.etiqueta}><span className={s.legendDot} style={{ background: b.color }} />{b.etiqueta}</span>)}</div>
            </div>
          </div>
          <div className={s.card}><p className={s.narrativa}>{datos.narrativa}</p></div>
          <div className={cx(s.tableWrap, s.scrollY)} style={{ maxHeight: 340 }}>
            <table className={s.table}>
              <thead><tr><th>N°</th><th>Transportador</th><th>Placa</th><th>N° planilla</th><th>Destino</th><th>Fecha</th><th className={s.num}>Cant.</th><th className={s.num}>Total cobrado</th><th className={s.num}>Pagado conductor</th><th className={s.num}>Utilidad</th><th className={s.num}>%</th></tr></thead>
              <tbody>{datos.viajes.map(v => (
                <tr key={v._id}><td>{v.nLocal}</td><td>{v.transportador}</td><td className={s.mono}>{v.placa}</td><td>{v.planilla}</td><td>{v.destino}</td><td>{fmtFecha(v.fecha)}</td>
                  <td className={s.num}>{v.cantidad}</td><td className={s.num}>{fmtPesos(v.total)}</td><td className={s.num}>{fmtPesos(v.pagado)}</td><td className={s.num}>{fmtPesos(v.utilidad)}</td><td className={s.num}>{fmtPct(v.pct)}</td></tr>
              ))}</tbody>
              <tfoot><tr><td colSpan={7}>TOTAL GENERAL</td><td className={s.num}>{fmtPesos(t.total)}</td><td className={s.num}>{fmtPesos(t.pagado)}</td><td className={s.num}>{fmtPesos(t.util)}</td><td className={s.num}>{fmtPct(t.pct)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function RelacionFletes() {
  const { toasts, remove, toast } = useToast();
  const { confirmar, dialogo } = useConfirm();
  const [empresas, setEmpresas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [panel, setPanel] = useState({ relacionEmpresa: '', relacionPeriodo: '' });
  const [verTodas, setVerTodas] = useState(false);
  const [facturado, setFacturado] = useState('');
  const [q, setQ] = useState('');
  const [datos, setDatos] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [form, setForm] = useState(null);
  const [informe, setInforme] = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [marcarAlExportar, setMarcarAlExportar] = useState(false);
  const [ocupado, setOcupado] = useState('');

  useEffect(() => {
    api.get('/logistica/empresas').then(r => setEmpresas(r.empresas)).catch(e => toast.error(e.message));
    api.get('/logistica/conductores').then(r => setConductores(r.conductores)).catch(() => {});
    api.get('/logistica/config').then(r => setPanel({ relacionEmpresa: r.config.relacionEmpresa, relacionPeriodo: r.config.relacionPeriodo })).catch(() => {});
  }, [toast]);

  const empresaFiltro = verTodas ? '' : panel.relacionEmpresa;
  const cargar = useCallback(async () => {
    try { setDatos(await api.get('/logistica/relacion', { empresa: empresaFiltro, facturado })); setSel(new Set()); } catch (e) { toast.error(e.message); }
  }, [empresaFiltro, facturado, toast]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardarPanel = async (cambios) => {
    const nuevo = { ...panel, ...cambios };
    setPanel(nuevo);
    try { await api.put('/logistica/config', nuevo); } catch (e) { toast.error(e.message); }
  };
  const filas = useMemo(() => {
    const t = q.toLowerCase();
    return (datos?.filas || []).filter(f => !t || [f.placa, f.transportador, f.destino, f.planilla].some(v => String(v || '').toLowerCase().includes(t)));
  }, [datos, q]);
  const tot = datos?.totales;

  const validarPanel = () => {
    if (!panel.relacionEmpresa) { toast.error('Selecciona primero la empresa en el panel.'); return false; }
    if (!panel.relacionPeriodo.trim()) { toast.error('Escribe el periodo (ej: 1-15 de septiembre de 2026).'); return false; }
    return true;
  };
  const exportar = async (tipo, formato) => {
    if (!validarPanel()) return;
    setOcupado(`${tipo}-${formato}`);
    try {
      const n = await descargar('/logistica/relacion/exportar', {
        empresa: panel.relacionEmpresa, periodo: panel.relacionPeriodo, tipo, formato, soloPendientes,
        marcarFacturado: tipo === 'relacion' && marcarAlExportar ? 'true' : '',
      });
      toast.ok(`Archivo generado: ${n}`);
      if (tipo === 'relacion' && marcarAlExportar) cargar();
    } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const marcar = async (valor) => {
    if (!sel.size) { toast.error('Selecciona los cargues en la tabla.'); return; }
    try { const r = await api.patch('/logistica/relacion/facturado', { ids: [...sel], valor }); toast.ok(`${r.actualizados} cargue(s) actualizados.`); cargar(); } catch (e) { toast.error(e.message); }
  };
  const eliminar = async (f) => {
    if (!(await confirmar({ titulo: 'Eliminar cargue', mensaje: `¿Eliminar el cargue de ${f.placa} (${f.destino}, ${fmtFecha(f.fecha)})?`, aceptar: 'Eliminar', peligro: true }))) return;
    try { await api.del(`/logistica/relacion/${f._id}`); toast.ok('Cargue eliminado.'); cargar(); } catch (e) { toast.error(e.message); }
  };
  const limpiar = async () => {
    const ok = await confirmar({
      titulo: 'Confirmar limpieza', peligro: true, aceptar: 'Empezar relación nueva',
      mensaje: 'Esto deja en blanco la tabla de TODOS los cargues capturados (de todas las empresas) y el panel, para empezar una relación completamente nueva.\n\nLos cargues no se pierden: quedan archivados con el periodo actual.\n\n¿Seguro que quieres continuar?',
    });
    if (!ok) return;
    try { const r = await api.post('/logistica/relacion/limpiar'); toast.ok(r.message); setPanel({ relacionEmpresa: '', relacionPeriodo: '' }); cargar(); } catch (e) { toast.error(e.message); }
  };
  const toggle = (id) => setSel(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ocupadoIcono = (k, Icono) => (ocupado === k ? <Loader size={15} className={s.spin} /> : <Icono size={15} />);

  return (
    <div className={s.wrap}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Relación de fletes</h1>
          <p className={s.pageSub}>Cargues por empresa y periodo para el proceso de facturación: lo cobrado a la empresa, lo pagado al conductor y la utilidad generada.</p>
        </div>
        <div className={s.headerActions}>
          <button className={s.btnGhost} onClick={limpiar}><Eraser size={15} />Nueva relación</button>
          <button className={s.btnPrimary} onClick={() => setForm({})}><Plus size={15} />Registrar cargue</button>
        </div>
      </div>

      <div className={s.card} style={{ marginBottom: 16 }}>
        <div className={s.formGrid} style={{ alignItems: 'end' }}>
          <Field label="Relación de cargues de la empresa" required>
            <select className={s.select} value={panel.relacionEmpresa} onChange={e => guardarPanel({ relacionEmpresa: e.target.value })}>
              <option value="">Selecciona…</option>{empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </Field>
          <Field label="Para proceso de facturación del periodo" required hint="Ej. 1-15 de septiembre de 2026 (el mes da el número del archivo)">
            <input className={s.input} value={panel.relacionPeriodo} onChange={e => setPanel({ ...panel, relacionPeriodo: e.target.value })} onBlur={() => guardarPanel({})} />
          </Field>
          <div className={s.stack} style={{ gap: 6 }}>
            <label className={s.checkRow}><input type="checkbox" checked={verTodas} onChange={e => setVerTodas(e.target.checked)} />Ver cargues de todas las empresas</label>
            <label className={s.checkRow}><input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} />Informes solo con cargues no facturados</label>
          </div>
        </div>
        <hr className={s.divider} />
        <div className={s.grid2} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div className={s.formSection}>
            <p className={s.formSectionTitle}><Receipt size={14} />Relación para facturación</p>
            <div className={s.headerActions}>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('relacion', 'xlsx')}>{ocupadoIcono('relacion-xlsx', FileSpreadsheet)}Excel</button>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('relacion', 'pdf')}>{ocupadoIcono('relacion-pdf', FileText)}PDF</button>
            </div>
            <label className={s.checkRow} style={{ marginTop: 8, fontSize: 12 }}><input type="checkbox" checked={marcarAlExportar} onChange={e => setMarcarAlExportar(e.target.checked)} />Marcar como facturados al exportar</label>
          </div>
          <div className={s.formSection}>
            <p className={s.formSectionTitle}><Wallet size={14} />Pago a conductores</p>
            <div className={s.headerActions}>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('pagos', 'xlsx')}>{ocupadoIcono('pagos-xlsx', FileSpreadsheet)}Excel</button>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('pagos', 'pdf')}>{ocupadoIcono('pagos-pdf', FileText)}PDF</button>
            </div>
          </div>
          <div className={s.formSection}>
            <p className={s.formSectionTitle}><BarChart3 size={14} />Informe de utilidad</p>
            <div className={s.headerActions}>
              <button className={cx(s.btnPrimary, s.btnSm)} onClick={() => validarPanel() && setInforme(true)}><BarChart3 size={13} />Ver informe</button>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('utilidad', 'xlsx')}>{ocupadoIcono('utilidad-xlsx', FileSpreadsheet)}Excel</button>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar('utilidad', 'pdf')}>{ocupadoIcono('utilidad-pdf', FileText)}PDF</button>
            </div>
          </div>
        </div>
      </div>

      {tot && (
        <div className={s.kpis}>
          <Kpi label="Cargues" value={tot.viajes} icon={Truck} hint={`${tot.facturados} facturado(s)`} />
          <Kpi label="Total cobrado" value={fmtPesos(tot.total)} icon={Receipt} />
          <Kpi label="Flete conductores" value={fmtPesos(tot.totalFlete)} icon={Truck} />
          <Kpi label="Auxiliar pagado" value={fmtPesos(tot.totalAuxiliarPagado)} icon={Wallet} />
          <Kpi label="Utilidad" value={fmtPesos(tot.utilidad)} icon={TrendingUp} tono={tot.utilidad >= 0 ? 'bueno' : 'malo'} hint={fmtPct(tot.utilidadPct)} />
        </div>
      )}

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={cx(s.searchBox, s.toolbarGrow)}><Search size={14} /><input className={s.input} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar placa, transportador, destino o planilla" /></div>
          <select className={s.select} style={{ width: 180 }} value={facturado} onChange={e => setFacturado(e.target.value)}>
            <option value="">Facturado: todos</option><option value="no">No facturados</option><option value="si">Facturados</option>
          </select>
          <button className={s.btnGhost} disabled={!sel.size} onClick={() => marcar('Sí')}><CheckSquare size={15} />Marcar facturado ({sel.size})</button>
          <button className={s.btnGhost} disabled={!sel.size} onClick={() => marcar('No')}>Quitar facturado</button>
        </div>
        {!datos ? <Loading /> : !filas.length ? (
          <Empty texto={empresaFiltro ? `No hay cargues de ${empresaFiltro}.` : 'No hay cargues registrados.'} icon={CalendarDays}>
            <div style={{ marginTop: 10 }}><button className={s.btnPrimary} onClick={() => setForm({})}><Plus size={15} />Registrar cargue</button></div>
          </Empty>
        ) : (
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th rowSpan={2}><input type="checkbox" checked={sel.size === filas.length} onChange={e => setSel(e.target.checked ? new Set(filas.map(f => f._id)) : new Set())} aria-label="Seleccionar todos" /></th>
                  <th rowSpan={2}>N°</th>{verTodas && <th rowSpan={2}>Empresa</th>}<th rowSpan={2}>Transportador</th><th rowSpan={2}>Placa</th><th rowSpan={2}>Planilla</th><th rowSpan={2}>Destino</th><th rowSpan={2}>Fecha</th><th rowSpan={2} className={s.num}>Cant.</th>
                  <th colSpan={5} className={s.center} style={{ background: '#eef2ff' }}>Cobro a la empresa</th>
                  <th colSpan={4} className={s.center} style={{ background: '#f0fdf4' }}>Pago al conductor</th>
                  <th rowSpan={2}>Facturado</th><th rowSpan={2} className={s.num}>Utilidad</th><th rowSpan={2} className={s.num}>%</th><th rowSpan={2} />
                </tr>
                <tr>
                  <th className={s.num}>Tarifa</th><th>Aux.</th><th className={s.num}>Total tarifa</th><th className={s.num}>Total aux.</th><th className={s.num}>Total</th>
                  <th className={s.num}>Flete</th><th className={s.num}>Total flete</th><th className={s.num}>Aux. pagado</th><th className={s.num}>Total aux.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(f => (
                  <tr key={f._id} className={sel.has(f._id) ? s.rowSelected : ''}>
                    <td><input type="checkbox" checked={sel.has(f._id)} onChange={() => toggle(f._id)} aria-label="Seleccionar" /></td>
                    <td>{f.n}</td>{verTodas && <td>{f.empresa}</td>}
                    <td>{f.transportador || <Chip tono="ambar">Placa sin conductor</Chip>}</td>
                    <td className={s.mono}>{f.placa}</td><td>{f.planilla}</td><td>{f.destino}</td><td className={s.nowrap}>{fmtFecha(f.fecha)}</td><td className={s.num}>{fmtMiles(f.cantidad)}</td>
                    <td className={s.num}>{f.tarifa === '' ? <Chip tono="rojo">Sin tarifa</Chip> : fmtPesos(f.tarifa)}</td>
                    <td><Chip tono={f.auxiliar === 'Sí' ? 'azul' : 'gris'}>{f.auxiliar}</Chip></td>
                    <td className={s.num}>{val(f.totalTarifa)}</td><td className={s.num}>{val(f.totalAuxiliar)}</td><td className={cx(s.num, s.strong)}>{val(f.total)}</td>
                    <td className={s.num}>{val(f.fleteConductor)}</td><td className={s.num}>{val(f.totalFlete)}</td><td className={s.num}>{val(f.auxiliarPagado)}</td><td className={s.num}>{val(f.totalAuxiliarPagado)}</td>
                    <td>{f.facturado ? <Chip tono={f.facturado === 'Sí' ? 'verde' : 'gris'}>{f.facturado}</Chip> : '—'}</td>
                    <td className={cx(s.num, s.strong)} style={{ color: f.utilidad < 0 ? '#b91c1c' : '#15803d' }}>{val(f.utilidad)}</td>
                    <td className={s.num}>{fmtPct(f.utilidadPct)}</td>
                    <td className={s.nowrap}>
                      <button className={s.iconBtn} title="Editar" onClick={() => setForm(f)}><Edit2 size={14} /></button>{' '}
                      <button className={cx(s.iconBtn, s.iconBtnDanger)} title="Eliminar" onClick={() => eliminar(f)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!panel.relacionEmpresa && !verTodas && <div style={{ marginTop: 12 }}><Alerta tipo="info" icon={Building2}>Elija la empresa en el panel para ver y exportar su relación, o marque "Ver cargues de todas las empresas".</Alerta></div>}
      </div>

      {form && (
        <FormCargue fila={form._id ? form : null} empresaPanel={panel.relacionEmpresa} empresas={empresas} conductores={conductores} toast={toast}
          onClose={() => setForm(null)}
          onGuardado={(emp) => { if (emp && emp !== panel.relacionEmpresa) setPanel(p => ({ ...p, relacionEmpresa: emp })); if (!emp) setForm(null); cargar(); }} />
      )}
      {informe && <InformeUtilidad empresa={panel.relacionEmpresa} periodo={panel.relacionPeriodo} soloPendientes={soloPendientes} toast={toast} onClose={() => setInforme(false)} />}
      {dialogo}
      <Toasts toasts={toasts} remove={remove} />
    </div>
  );
}
