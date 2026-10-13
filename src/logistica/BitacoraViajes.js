// src/logistica/BitacoraViajes.js
// Bitácora de viajes (hoja BITACORA + hojas por empresa de la plantilla):
// registro, búsqueda, edición y eliminación de viajes con autollenado desde
// tarifas y conductores, totales de saldo y utilidad, reporte de WhatsApp,
// correo de salida, envío de manifiestos por correo, exportes PDF/Excel,
// planilla en blanco y cierre de periodo.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Plus, Search, Edit2, Trash2, Save, FileText, FileSpreadsheet, Printer, Building2,
  MessageCircle, Mail, Send, Copy, CheckCheck, ExternalLink, Archive, History, Loader, Truck,
  DollarSign, TrendingUp, Wallet, Hash, Paperclip, RefreshCw, X,
} from 'lucide-react';
import { api, descargar, abrirPdf } from './api';
import {
  estilos as s, cx, useToast, Toasts, Modal, useConfirm, Field, MoneyInput, Combo, Loading, Empty, Kpi,
  Chip, Alerta, Tabs, fmtPesos, fmtMiles, fmtFecha, hoyIso, fmtFechaHora,
} from './ui';

const pesoPorDestino = (d) => {
  const t = String(d || '').toUpperCase();
  if (t.includes('1.0')) return 800;
  if (t.includes('5.0')) return 2500;
  if (t.includes('3.0')) return 1500;
  if (t.includes('6.0')) return 5000;
  return 0;
};
const saldo = (v) => ((Number(v.flete) || 0) > 0 ? (Number(v.flete) || 0) - (Number(v.anticipo) || 0) : null);
const utilidad = (v) => { const t = Number(v.tarifa) || 0; return t - t * 0.01 - (Number(v.flete) || 0); };

// ══════════════════════════════════════════════════════════════════════════
// FORMULARIO DE VIAJE (frmRegistro)
// ══════════════════════════════════════════════════════════════════════════
const VIAJE_VACIO = { empresa: '', manifiesto: '', conductor: '', placa: '', destino: '', pesoKg: '', tarifa: '', flete: '', anticipo: '', auxiliar: '', observaciones: '', enviarManifiesto: false };

function FormViaje({ viaje, empresas, conductores, onClose, onGuardado, onEliminar, toast }) {
  const [f, setF] = useState(() => (viaje ? { ...VIAJE_VACIO, ...viaje } : VIAJE_VACIO));
  const [numero, setNumero] = useState(viaje?.numero || null);
  const [tarifas, setTarifas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [errCampo, setErrCampo] = useState('');
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v?.target ? v.target.value : v }));

  useEffect(() => { if (!viaje) api.get('/logistica/viajes/siguiente-numero').then(r => setNumero(r.numero)).catch(() => {}); }, [viaje]);
  useEffect(() => {
    if (!f.empresa) { setTarifas([]); return; }
    api.get('/logistica/tarifas', { empresa: f.empresa }).then(r => setTarifas(r.tarifas)).catch(() => setTarifas([]));
  }, [f.empresa]);

  // Placa automática al elegir el conductor (BuscarPlacaPorConductor / NombreCompletoConductor)
  const resolverConductor = async (nombre) => {
    if (!nombre) return;
    try {
      const r = await api.get('/logistica/conductores/resolver', { nombre });
      if (r.nombre) setF(p => ({ ...p, conductor: r.nombre, placa: r.placa || p.placa }));
    } catch { /* sin coincidencia */ }
  };
  // Tarifa, flete, anticipo y peso al elegir el destino (txtDestino_Exit)
  const ultimoDestino = React.useRef(viaje?.destino || '');
  const aplicarDestino = useCallback(async (destino) => {
    if (!f.empresa || !destino || destino === ultimoDestino.current) return;
    ultimoDestino.current = destino;
    try {
      const r = await api.get('/logistica/tarifas/buscar', { empresa: f.empresa, destino });
      setF(p => ({
        ...p,
        pesoKg: r.pesoKg > 0 ? r.pesoKg : p.pesoKg,
        ...(r.tarifa ? { tarifa: r.tarifa.tarifaCliente, flete: r.tarifa.fleteConductor, ...(r.tarifa.anticipoHabitual ? { anticipo: r.tarifa.anticipoHabitual } : {}) } : {}),
      }));
      setAviso(r.tarifa ? 'Tarifa, flete y anticipo tomados de la tabla de tarifas.' : 'Destino sin tarifa registrada: escriba los valores.');
    } catch { /* sin tarifa */ }
  }, [f.empresa]);

  const guardar = async () => {
    setErrCampo('');
    if (!f.empresa || !String(f.conductor).trim() || !String(f.destino).trim()) { toast.error('Por favor completa al menos Empresa, Conductor y Destino.'); return; }
    setGuardando(true);
    try {
      const r = viaje?._id ? await api.put(`/logistica/viajes/${viaje._id}`, f) : await api.post('/logistica/viajes', f);
      toast.ok(r.message);
      onGuardado(r.viaje, !viaje?._id);
    } catch (e) {
      if (e.data?.campo) setErrCampo(e.data.campo);
      toast.error(e.message);
    } finally { setGuardando(false); }
  };

  const sal = saldo(f); const uti = utilidad(f);
  return (
    <Modal open onClose={onClose} size="lg" icon={viaje ? Edit2 : Plus}
      title={viaje ? `Editar viaje N° ${viaje.numero}` : 'Nuevo registro de viaje'}
      subtitle={viaje ? `Registrado el ${fmtFecha(viaje.fecha)}. El número y la fecha se conservan.` : `N° de registro: ${numero ?? '…'}  ·  Fecha: ${fmtFecha(`${hoyIso()}T00:00:00Z`)}`}
      footerLeft={viaje && <button className={s.btnDanger} onClick={() => onEliminar(viaje)}><Trash2 size={15} />Eliminar viaje</button>}
      footer={<><button className={s.btnGhost} onClick={onClose}>Cancelar</button><button className={s.btnPrimary} disabled={guardando} onClick={guardar}>{guardando ? <Loader size={15} className={s.spin} /> : <Save size={15} />}{viaje ? 'Actualizar' : 'Guardar'}</button></>}>
      <div className={s.stack} style={{ gap: 14 }}>
        <div className={s.formGrid3}>
          <Field label="Empresa" required>
            <select className={s.select} value={f.empresa} onChange={e => setF(p => ({ ...p, empresa: e.target.value }))} autoFocus>
              <option value="">Selecciona…</option>
              {empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </Field>
          <Field label="Manifiesto"><input className={s.input} value={f.manifiesto} onChange={set('manifiesto')} placeholder="Opcional" /></Field>
          <Field label="Destino" required hint={aviso}>
            <Combo value={f.destino} onChange={set('destino')} opciones={tarifas.map(t => t.destino)} disabled={!f.empresa}
              placeholder={f.empresa ? 'Ej. Pasto alkosto 5.0' : 'Primero la empresa'} onPick={aplicarDestino} onBlur={() => aplicarDestino(f.destino)} />
          </Field>
          <Field label="Conductor" required className={s.span2}>
            <Combo value={f.conductor} onChange={set('conductor')} opciones={conductores} getLabel={c => c.nombre} getMeta={c => c.placa}
              placeholder="Escriba el nombre o la placa" onPick={(c) => setF(p => ({ ...p, conductor: c.nombre, placa: c.placa }))}
              onBlur={() => { if (!conductores.some(c => c.nombre === f.conductor)) resolverConductor(f.conductor); }} />
          </Field>
          <Field label="Placa" required error={errCampo === 'placa' ? 'Ingrésela manualmente.' : ''}>
            <input className={cx(s.input, errCampo === 'placa' && s.inputError)} value={f.placa} onChange={e => setF(p => ({ ...p, placa: e.target.value.toUpperCase() }))}
              onFocus={() => { if (!f.placa) resolverConductor(f.conductor); }} placeholder="Automática según el conductor" />
          </Field>
        </div>
        <div className={s.formSection}>
          <p className={s.formSectionTitle}><DollarSign size={14} />Valores del viaje</p>
          <div className={s.formGrid3}>
            <Field label="Peso (kg)" hint="Automático: 1.0=800, 3.0=1.500, 5.0=2.500, 6.0=5.000"><input className={s.input} value={f.pesoKg} inputMode="numeric" onChange={set('pesoKg')} onBlur={() => { if (!f.pesoKg) { const p = pesoPorDestino(f.destino); if (p) setF(x => ({ ...x, pesoKg: p })); } }} /></Field>
            <Field label="Tarifa (cobro a la empresa)"><MoneyInput value={f.tarifa} onChange={set('tarifa')} /></Field>
            <Field label="Flete (pago al conductor)"><MoneyInput value={f.flete} onChange={set('flete')} /></Field>
            <Field label="Anticipo"><MoneyInput value={f.anticipo} onChange={set('anticipo')} /></Field>
            <Field label="Auxiliar"><MoneyInput value={f.auxiliar} onChange={set('auxiliar')} /></Field>
            <Field label="Saldo · Utilidad" hint="Saldo = flete − anticipo · Utilidad = tarifa − 1% − flete">
              <div className={s.readonlyBox}>{sal === null ? '—' : fmtPesos(sal)} · <span style={{ color: uti < 0 ? '#b91c1c' : '#15803d' }}>{fmtPesos(uti)}</span></div>
            </Field>
          </div>
        </div>
        <Field label="Observaciones" hint="Se incluyen en el reporte de WhatsApp y como recomendaciones del manifiesto RNDC.">
          <textarea className={s.textarea} rows={2} value={f.observaciones} onChange={set('observaciones')} />
        </Field>
        <label className={s.checkRow}><input type="checkbox" checked={!!f.enviarManifiesto} onChange={e => setF(p => ({ ...p, enviarManifiesto: e.target.checked }))} />Marcar para enviar el manifiesto por correo a la empresa</label>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REGISTRO DE VIAJES
// ══════════════════════════════════════════════════════════════════════════
function Registro({ toast, empresas, conductores, filtroEmpresa, setFiltroEmpresa }) {
  const [filtros, setFiltros] = useState({ q: '', desde: '', hasta: '', reportado: '' });
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [exportando, setExportando] = useState('');
  const { confirmar, dialogo } = useConfirm();

  const params = useMemo(() => ({ ...filtros, empresa: filtroEmpresa }), [filtros, filtroEmpresa]);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { setDatos(await api.get('/logistica/viajes', params)); } catch (e) { toast.error(e.message); } finally { setCargando(false); }
  }, [params, toast]);
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [cargar]);

  const eliminar = async (v) => {
    const ok = await confirmar({
      titulo: 'Confirmar eliminación', peligro: true, aceptar: 'Eliminar definitivamente',
      mensaje: `¿Eliminar definitivamente el viaje N° ${v.numero}?\nEmpresa: ${v.empresa}\nConductor: ${v.conductor}\nFecha: ${fmtFecha(v.fecha)}\n\nEsta acción no se puede deshacer. No afecta la numeración de los demás viajes.`,
    });
    if (!ok) return;
    try { const r = await api.del(`/logistica/viajes/${v._id}`); toast.ok(r.message); setForm(null); cargar(); } catch (e) { toast.error(e.message); }
  };
  const marcarEnviar = async (v, valor) => {
    try { await api.patch('/logistica/viajes/enviar-manifiesto', { ids: [v._id], valor }); setDatos(d => ({ ...d, viajes: d.viajes.map(x => (x._id === v._id ? { ...x, enviarManifiesto: valor } : x)) })); } catch (e) { toast.error(e.message); }
  };
  const exportar = async (formato) => {
    setExportando(formato);
    try { const n = await descargar('/logistica/viajes/exportar', { ...params, formato }); toast.ok(`Archivo generado: ${n}`); } catch (e) { toast.error(e.message); } finally { setExportando(''); }
  };

  const viajes = datos?.viajes || [];
  const t = datos?.totales;
  return (
    <>
      {t && (
        <div className={s.kpis}>
          <Kpi label="Viajes" value={fmtMiles(t.viajes)} icon={Truck} hint={filtroEmpresa || 'Todas las empresas'} />
          <Kpi label="Total tarifa" value={fmtPesos(t.tarifa)} icon={DollarSign} />
          <Kpi label="Total flete" value={fmtPesos(t.flete)} icon={Truck} />
          <Kpi label="Anticipos" value={fmtPesos(t.anticipo)} icon={Wallet} />
          <Kpi label="Saldo por pagar" value={fmtPesos(t.saldo)} icon={Wallet} />
          <Kpi label="Utilidad" value={fmtPesos(t.utilidad)} icon={TrendingUp} tono={t.utilidad >= 0 ? 'bueno' : 'malo'} hint="Tarifa − 1% − flete" />
        </div>
      )}
      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={cx(s.searchBox, s.toolbarGrow)}><Search size={14} /><input className={s.input} value={filtros.q} onChange={e => setFiltros({ ...filtros, q: e.target.value })} placeholder="Buscar conductor, placa, destino, manifiesto…" /></div>
          <select className={s.select} style={{ width: 190 }} value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
          </select>
          <input type="date" className={s.input} style={{ width: 150 }} value={filtros.desde} onChange={e => setFiltros({ ...filtros, desde: e.target.value })} title="Desde" />
          <input type="date" className={s.input} style={{ width: 150 }} value={filtros.hasta} onChange={e => setFiltros({ ...filtros, hasta: e.target.value })} title="Hasta" />
          <select className={s.select} style={{ width: 160 }} value={filtros.reportado} onChange={e => setFiltros({ ...filtros, reportado: e.target.value })}>
            <option value="">Reporte WhatsApp: todos</option><option value="no">Sin reportar</option><option value="si">Reportados</option>
          </select>
        </div>
        <div className={s.cardHead} style={{ marginBottom: 10 }}>
          <span className={s.mutedText}>{viajes.length} viaje(s) · siguiente N° de registro: <b>{datos?.siguienteNumero ?? '…'}</b></span>
          <div className={s.headerActions}>
            <button className={s.btnGhost} onClick={() => exportar('pdf')} disabled={!!exportando}>{exportando === 'pdf' ? <Loader size={15} className={s.spin} /> : <FileText size={15} />}PDF</button>
            <button className={s.btnGhost} onClick={() => exportar('xlsx')} disabled={!!exportando}>{exportando === 'xlsx' ? <Loader size={15} className={s.spin} /> : <FileSpreadsheet size={15} />}Excel</button>
            <button className={s.btnPrimary} onClick={() => setForm({})}><Plus size={15} />Nuevo viaje</button>
          </div>
        </div>
        {cargando && !datos ? <Loading /> : !viajes.length ? <Empty texto="No hay viajes con esos filtros." icon={ClipboardList} /> : (
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead>
                <tr><th>N°</th><th>Fecha</th><th>Empresa</th><th>Conductor</th><th>Placa</th><th>Destino</th><th className={s.num}>Peso</th>
                  <th className={s.num}>Tarifa</th><th className={s.num}>Flete</th><th className={s.num}>Anticipo</th><th className={s.num}>Auxiliar</th>
                  <th className={s.num}>Saldo</th><th className={s.num}>Utilidad</th><th>Manifiesto</th><th>Seguimiento</th><th title="Enviar manifiesto por correo">Enviar</th><th /></tr>
              </thead>
              <tbody>
                {viajes.map(v => (
                  <tr key={v._id}>
                    <td className={s.strong}>{v.numero}</td>
                    <td className={s.nowrap}>{fmtFecha(v.fecha)}</td>
                    <td>{v.empresa}</td>
                    <td>{v.conductor}</td>
                    <td className={s.mono}>{v.placa}</td>
                    <td>{v.destino}{v.observaciones && <div className={s.mutedText} title={v.observaciones} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.observaciones}</div>}</td>
                    <td className={s.num}>{fmtMiles(v.pesoKg)}</td>
                    <td className={s.num}>{fmtPesos(v.tarifa)}</td>
                    <td className={s.num}>{fmtPesos(v.flete)}</td>
                    <td className={s.num}>{fmtPesos(v.anticipo)}</td>
                    <td className={s.num}>{fmtPesos(v.auxiliar)}</td>
                    <td className={s.num}>{v.saldo === null ? '' : fmtPesos(v.saldo)}</td>
                    <td className={s.num} style={{ color: v.utilidad < 0 ? '#b91c1c' : undefined }}>{fmtPesos(v.utilidad)}</td>
                    <td className={s.mono}>{v.manifiesto}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Chip tono={v.reportado ? 'verde' : 'gris'} title={v.reportado || 'Sin reportar por WhatsApp'}><MessageCircle size={11} />{v.reportado ? 'WA' : '—'}</Chip>
                        {v.correoEnviado && <Chip tono="azul" title={v.correoEnviado}><Mail size={11} />Salida</Chip>}
                        {v.manifiestoEnviado && <Chip tono="navy" title={v.manifiestoEnviado}><Send size={11} />Manif.</Chip>}
                      </div>
                    </td>
                    <td className={s.center}><input type="checkbox" checked={!!v.enviarManifiesto} disabled={!!v.manifiestoEnviado} onChange={e => marcarEnviar(v, e.target.checked)} aria-label="Enviar manifiesto" /></td>
                    <td className={s.nowrap}>
                      <button className={s.iconBtn} title="Editar" onClick={() => setForm(v)}><Edit2 size={14} /></button>{' '}
                      <button className={cx(s.iconBtn, s.iconBtnDanger)} title="Eliminar" onClick={() => eliminar(v)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {t && (
                <tfoot><tr><td colSpan={7}>TOTALES ({t.viajes} viajes)</td><td className={s.num}>{fmtPesos(t.tarifa)}</td><td className={s.num}>{fmtPesos(t.flete)}</td>
                  <td className={s.num}>{fmtPesos(t.anticipo)}</td><td className={s.num}>{fmtPesos(t.auxiliar)}</td><td className={s.num}>{fmtPesos(t.saldo)}</td><td className={s.num}>{fmtPesos(t.utilidad)}</td><td colSpan={4} /></tr></tfoot>
              )}
            </table>
          </div>
        )}
      </div>
      {form && (
        <FormViaje key={form._id || form._k || 'nuevo'} viaje={form._id ? form : null} empresas={empresas} conductores={conductores} toast={toast} onClose={() => setForm(null)} onEliminar={eliminar}
          onGuardado={(v, nuevo) => { cargar(); setForm(nuevo ? { _k: Date.now() } : null); if (nuevo) toast.info(`Formulario listo para el siguiente viaje (N° ${v.numero + 1}).`); }} />
      )}
      {dialogo}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// POR EMPRESA (hojas de cada empresa)
// ══════════════════════════════════════════════════════════════════════════
function PorEmpresa({ toast, onVer }) {
  const [datos, setDatos] = useState(null);
  const [ocupado, setOcupado] = useState('');
  useEffect(() => { api.get('/logistica/viajes/resumen-empresas').then(setDatos).catch(e => toast.error(e.message)); }, [toast]);
  const exportar = async (empresa, formato) => {
    setOcupado(`${empresa}-${formato}`);
    try { const n = await descargar('/logistica/viajes/exportar', { empresa, formato }); toast.ok(`Archivo generado: ${n}`); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const todas = async (formato) => {
    setOcupado(`todas-${formato}`);
    try { const n = await descargar('/logistica/viajes/exportar-empresas', { formato }); toast.ok(`Archivo generado: ${n}`); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  if (!datos) return <Loading />;
  if (!datos.empresas.length) return <Empty texto="Aún no hay viajes registrados en este periodo." />;
  return (
    <>
    <div className={s.cardHead}>
      <span className={s.mutedText}>{datos.empresas.length} empresa(s) con viajes en el periodo actual</span>
      <div className={s.headerActions}>
        <button className={s.btnGhost} disabled={!!ocupado} onClick={() => todas('xlsx')}>{ocupado === 'todas-xlsx' ? <Loader size={15} className={s.spin} /> : <FileSpreadsheet size={15} />}Excel de todas (ZIP)</button>
        <button className={s.btnGhost} disabled={!!ocupado} onClick={() => todas('pdf')}>{ocupado === 'todas-pdf' ? <Loader size={15} className={s.spin} /> : <FileText size={15} />}PDF de todas (ZIP)</button>
      </div>
    </div>
    <div className={s.grid2} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {datos.empresas.map(e => (
        <div key={e.empresa} className={s.card}>
          <div className={s.cardHead} style={{ marginBottom: 8 }}>
            <h3 className={s.cardTitle}><Building2 size={16} />{e.empresa}</h3>
            <Chip tono="navy">{e.viajes} viajes</Chip>
          </div>
          <table className={s.table} style={{ fontSize: 12.5 }}>
            <tbody>
              <tr><td>Tarifa cobrada</td><td className={s.num}>{fmtPesos(e.tarifa)}</td></tr>
              <tr><td>Flete conductores</td><td className={s.num}>{fmtPesos(e.flete)}</td></tr>
              <tr><td>Anticipos</td><td className={s.num}>{fmtPesos(e.anticipo)}</td></tr>
              <tr><td>Saldo por pagar</td><td className={s.num}>{fmtPesos(e.saldo)}</td></tr>
              <tr><td className={s.strong}>Utilidad</td><td className={cx(s.num, s.strong)} style={{ color: e.utilidad < 0 ? '#b91c1c' : '#15803d' }}>{fmtPesos(e.utilidad)}</td></tr>
            </tbody>
          </table>
          <div className={s.headerActions} style={{ marginTop: 12 }}>
            <button className={cx(s.btnGhost, s.btnSm)} onClick={() => onVer(e.empresa)}><ClipboardList size={13} />Ver viajes</button>
            <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar(e.empresa, 'pdf')}>{ocupado === `${e.empresa}-pdf` ? <Loader size={13} className={s.spin} /> : <FileText size={13} />}PDF</button>
            <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar(e.empresa, 'xlsx')}>{ocupado === `${e.empresa}-xlsx` ? <Loader size={13} className={s.spin} /> : <FileSpreadsheet size={13} />}Excel</button>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REPORTES Y ENVÍOS
// ══════════════════════════════════════════════════════════════════════════
function ReporteWhatsapp({ toast }) {
  const [fecha, setFecha] = useState(hoyIso());
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [hechos, setHechos] = useState({});
  const generar = async () => {
    setCargando(true); setHechos({});
    try { setRes(await api.get('/logistica/viajes/whatsapp', { fecha })); } catch (e) { toast.error(e.message); } finally { setCargando(false); }
  };
  const copiar = async (m) => { try { await navigator.clipboard.writeText(m.texto); toast.ok(`Mensaje de ${m.empresa} copiado.`); } catch { toast.error('No se pudo copiar al portapapeles.'); } };
  const abrir = (m) => { copiar(m); window.open(`https://wa.me/?text=${encodeURIComponent(m.texto)}`, '_blank', 'noopener'); };
  const marcar = async (ids, empresa) => {
    try {
      const r = await api.post('/logistica/viajes/whatsapp/marcar', { ids });
      toast.ok(`${r.marcados} viaje(s) marcados como reportados${empresa ? ` (${empresa})` : ''}.`);
      setHechos(h => ({ ...h, ...(empresa ? { [empresa]: true } : Object.fromEntries(res.mensajes.map(m => [m.empresa, true]))) }));
    } catch (e) { toast.error(e.message); }
  };
  const pendientes = (res?.mensajes || []).filter(m => !hechos[m.empresa]);
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}><MessageCircle size={17} />Reporte de vehículos por WhatsApp</h3>
          <p className={s.cardSub}>Un mensaje por empresa con los vehículos del día que aún no se han reportado. Los ya reportados no se repiten.</p>
        </div>
      </div>
      <div className={s.toolbar}>
        <Field label="Fecha del reporte"><input type="date" className={s.input} value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
        <button className={s.btnPrimary} onClick={generar} disabled={cargando}>{cargando ? <Loader size={15} className={s.spin} /> : <RefreshCw size={15} />}Generar mensajes</button>
        {pendientes.length > 0 && <button className={s.btnSuccess} onClick={() => marcar(pendientes.flatMap(m => m.ids))}><CheckCheck size={15} />Marcar todos como reportados</button>}
      </div>
      {res && !res.mensajes.length && <Alerta tipo="info">{res.message}</Alerta>}
      {res?.mensajes?.length > 0 && <Alerta tipo="info">Copie o abra cada mensaje en WhatsApp, elija el grupo o contacto y envíelo. Después márquelo como reportado.</Alerta>}
      <div className={s.grid2}>
        {res?.mensajes?.map((m, i) => (
          <div key={m.empresa} className={cx(s.msgCard, hechos[m.empresa] && s.msgDone)}>
            <div className={s.msgHead}>
              <span className={s.strong}>Mensaje {i + 1} de {res.mensajes.length} · {m.empresa} <Chip tono="gris">{m.viajes} vehículo(s)</Chip></span>
              {hechos[m.empresa] && <Chip tono="verde"><CheckCheck size={11} />Reportado</Chip>}
            </div>
            <pre className={s.msgBody}>{m.texto}</pre>
            <div className={s.msgHead} style={{ borderTop: '1px solid #e5e7eb', borderBottom: 'none' }}>
              <div className={s.headerActions}>
                <button className={cx(s.btnGhost, s.btnSm)} onClick={() => copiar(m)}><Copy size={13} />Copiar</button>
                <button className={cx(s.btnSuccess, s.btnSm)} onClick={() => abrir(m)}><ExternalLink size={13} />Abrir WhatsApp</button>
              </div>
              <button className={cx(s.btnGhost, s.btnSm)} disabled={hechos[m.empresa]} onClick={() => marcar(m.ids, m.empresa)}><CheckCheck size={13} />Marcar reportado</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorreoSalida({ toast }) {
  const [fecha, setFecha] = useState(hoyIso());
  const [prev, setPrev] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [verCorreo, setVerCorreo] = useState(null);
  const { confirmar, dialogo } = useConfirm();
  const cargar = async () => {
    setCargando(true); setResultado(null);
    try { setPrev(await api.get('/logistica/viajes/correo-salida', { fecha })); } catch (e) { toast.error(e.message); } finally { setCargando(false); }
  };
  const enviar = async () => {
    if (!(await confirmar({ titulo: 'Enviar correos de salida', mensaje: `Se enviará un correo de autorización de salida por cada vehículo de Corbeta (${prev.correos.length}).\n¿Continuar?`, aceptar: 'Enviar' }))) return;
    setEnviando(true);
    try { const r = await api.post('/logistica/viajes/correo-salida', { fecha }); setResultado(r); setPrev(null); } catch (e) { toast.error(e.message); } finally { setEnviando(false); }
  };
  return (
    <div className={s.card}>
      <h3 className={s.cardTitle}><Mail size={17} />Correo de autorización de salida (Corbeta)</h3>
      <p className={s.cardSub} style={{ marginBottom: 12 }}>Un correo por cada vehículo de Corbeta de la fecha que aún no tenga correo enviado, a los destinatarios configurados en la empresa.</p>
      <div className={s.toolbar}>
        <Field label="Fecha de salida"><input type="date" className={s.input} value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
        <button className={s.btnGhost} onClick={cargar} disabled={cargando}>{cargando ? <Loader size={15} className={s.spin} /> : <Search size={15} />}Ver vehículos pendientes</button>
        {prev?.correos?.length > 0 && <button className={s.btnPrimary} onClick={enviar} disabled={enviando}>{enviando ? <Loader size={15} className={s.spin} /> : <Send size={15} />}Enviar {prev.correos.length} correo(s)</button>}
      </div>
      {prev?.modoPrueba && <Alerta tipo="warn">El servidor está en modo de prueba de correo: los envíos se simulan y quedan registrados, pero no salen.</Alerta>}
      {prev && !prev.correos.length && <Alerta tipo="info">No hay vehículos nuevos por enviar correo de salida para la fecha {fmtFecha(`${fecha}T00:00:00Z`)}.</Alerta>}
      {prev?.correos?.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>N°</th><th>Placa</th><th>Conductor</th><th>Destino</th><th>Destinatarios</th><th /></tr></thead>
            <tbody>{prev.correos.map(c => (
              <tr key={c._id}><td>{c.numero}</td><td className={s.mono}>{c.placa}</td><td>{c.conductor}</td><td>{c.destino}</td>
                <td>{c.para ? <Chip tono="azul">{c.para.split(',').length} correo(s)</Chip> : <Chip tono="rojo">Sin destinatarios</Chip>}</td>
                <td><button className={cx(s.btnGhost, s.btnSm)} onClick={() => setVerCorreo(c)}>Ver correo</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {resultado && (
        <Alerta tipo={resultado.fallidos || resultado.sinConfig?.length ? 'warn' : 'ok'}>
          {resultado.message || <>Correos enviados: <b>{resultado.enviados}</b>{resultado.simulado ? ' (simulados)' : ''} · Fallidos: <b>{resultado.fallidos}</b></>}
          {resultado.sinConfig?.length > 0 && <div>Sin destinatarios configurados: {resultado.sinConfig.join(', ')}</div>}
          {resultado.errores?.length > 0 && <ul className={s.list}>{resultado.errores.map(er => <li key={er}>{er}</li>)}</ul>}
        </Alerta>
      )}
      <Modal open={!!verCorreo} onClose={() => setVerCorreo(null)} title={verCorreo?.asunto} subtitle={`Para: ${verCorreo?.para}`} icon={Mail} size="lg">
        <pre className={s.msgBody} style={{ maxHeight: 'none', padding: 0 }}>{verCorreo?.cuerpo}</pre>
      </Modal>
      {dialogo}
    </div>
  );
}

function EnviarManifiestos({ toast, empresas }) {
  const [empresa, setEmpresa] = useState('');
  const [pend, setPend] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const emp = empresas.find(e => e.nombre === empresa);
  useEffect(() => {
    setResultado(null);
    if (!empresa) { setPend([]); return; }
    api.get('/logistica/manifiestos/pendientes', { empresa }).then(r => setPend(r.viajes)).catch(e => toast.error(e.message));
  }, [empresa, toast]);
  const enviar = async () => {
    setEnviando(true); setResultado(null);
    try {
      const form = new FormData();
      form.append('empresa', empresa);
      form.append('documento', `MANIFIESTOS ${empresa.toUpperCase()}`);
      archivos.forEach(a => form.append('archivos', a));
      const r = await api.upload('/logistica/manifiestos/enviar', form);
      setResultado(r); toast.ok(r.message); setArchivos([]);
      api.get('/logistica/manifiestos/pendientes', { empresa }).then(x => setPend(x.viajes)).catch(() => {});
    } catch (e) { toast.error(e.message); setResultado({ error: e.message, faltantes: e.data?.faltantes }); } finally { setEnviando(false); }
  };
  const listos = pend.filter(p => !p.problema);
  return (
    <div className={s.card}>
      <h3 className={s.cardTitle}><Send size={17} />Enviar manifiestos por correo</h3>
      <p className={s.cardSub} style={{ marginBottom: 12 }}>Envía en un solo correo los manifiestos de la empresa: los marcados en la bitácora (con su PDF del RNDC) o los archivos PDF que adjunte.</p>
      <div className={s.formGrid}>
        <Field label="Empresa" required>
          <select className={s.select} value={empresa} onChange={e => setEmpresa(e.target.value)}>
            <option value="">Selecciona…</option>
            {empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
          </select>
        </Field>
        <Field label="Documento"><div className={s.readonlyBox}>{empresa ? `MANIFIESTOS ${empresa.toUpperCase()}` : '—'}</div></Field>
        <Field label="Dirigido a"><div className={s.readonlyBox}>{emp ? (emp.razonSocial || emp.nombre.toUpperCase()) : '—'}</div></Field>
        <Field label="Correos destino" className={s.spanAll}>
          <div className={s.readonlyBox} style={{ fontWeight: 500, fontSize: 12 }}>{emp ? (emp.correos?.join(', ') || 'No hay correos configurados para esta empresa (Maestros > Empresas).') : '—'}</div>
        </Field>
      </div>
      {empresa && (
        <>
          <hr className={s.divider} />
          <p className={s.formSectionTitle}><ClipboardList size={14} />Manifiestos marcados en la bitácora ({listos.length} listos)</p>
          {!pend.length ? <p className={s.mutedText}>No hay viajes de {empresa} marcados para enviar. Márquelos en la columna "Enviar" del registro de viajes.</p> : (
            <div className={s.tableWrap} style={{ marginBottom: 12 }}>
              <table className={s.table}>
                <thead><tr><th>N°</th><th>Manifiesto</th><th>Placa</th><th>Conductor</th><th>Estado</th></tr></thead>
                <tbody>{pend.map(p => (
                  <tr key={p._id}><td>{p.numero}</td><td className={s.mono}>{p.manifiesto || '—'}</td><td className={s.mono}>{p.placa}</td><td>{p.conductor}</td>
                    <td>{p.problema ? <Chip tono="ambar" title={p.problema}>Sin PDF</Chip> : <Chip tono="verde">Listo</Chip>}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className={s.formSectionTitle}><Paperclip size={14} />O adjunte archivos (reemplaza a los marcados)</p>
          <div className={s.toolbar}>
            <input type="file" multiple accept=".pdf,application/pdf" className={s.input} style={{ maxWidth: 420 }} onChange={e => setArchivos([...e.target.files])} />
            {archivos.length > 0 && <Chip tono="azul">{archivos.length} archivo(s)<button className={s.iconBtn} style={{ width: 18, height: 18, border: 'none', background: 'transparent' }} onClick={() => setArchivos([])}><X size={11} /></button></Chip>}
            <button className={s.btnPrimary} disabled={enviando || !emp?.correos?.length || (!archivos.length && !listos.length)} onClick={enviar}>{enviando ? <Loader size={15} className={s.spin} /> : <Send size={15} />}Enviar</button>
          </div>
        </>
      )}
      {resultado && !resultado.error && <Alerta tipo="ok">{resultado.message} ({resultado.enviados} archivo(s){resultado.simulado ? ', envío simulado' : ''}).{resultado.faltantes?.length > 0 && <ul className={s.list}>{resultado.faltantes.map(f => <li key={f}>{f}</li>)}</ul>}</Alerta>}
      {resultado?.error && <Alerta tipo="error">{resultado.error}{resultado.faltantes?.length > 0 && <ul className={s.list}>{resultado.faltantes.map(f => <li key={f}>{f}</li>)}</ul>}</Alerta>}
    </div>
  );
}

function RegistroEnvios({ toast }) {
  const [registros, setRegistros] = useState(null);
  useEffect(() => { api.get('/logistica/registro-envios').then(r => setRegistros(r.registros)).catch(e => toast.error(e.message)); }, [toast]);
  return (
    <div className={s.card}>
      <h3 className={s.cardTitle} style={{ marginBottom: 12 }}><History size={17} />Registro de envíos de correo</h3>
      {!registros ? <Loading /> : !registros.length ? <Empty texto="Aún no hay envíos registrados." /> : (
        <div className={cx(s.tableWrap, s.scrollY)}>
          <table className={s.table}>
            <thead><tr><th>Fecha</th><th>Empresa</th><th>Documento</th><th>Tipo</th><th>Correos destino</th><th>Adjuntos</th><th>Estado</th></tr></thead>
            <tbody>{registros.map(r => (
              <tr key={r._id}><td className={s.nowrap}>{fmtFechaHora(r.fecha)}</td><td>{r.empresa}</td><td>{r.documento}</td><td>{r.tipo}</td>
                <td><span className={s.mutedText} title={r.correos}>{r.correos.split(',').length} destinatario(s)</span></td>
                <td>{r.adjuntos?.length ? <span title={r.adjuntos.join('\n')}>{r.adjuntos.length}</span> : '—'}</td>
                <td><Chip tono={r.estado === 'enviado' ? 'verde' : r.estado === 'simulado' ? 'ambar' : 'rojo'} title={r.detalle}>{r.estado}</Chip></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PERIODOS (NUEVO PERIODO) Y PLANILLA EN BLANCO
// ══════════════════════════════════════════════════════════════════════════
function Periodos({ toast }) {
  const [periodos, setPeriodos] = useState(null);
  const [nombre, setNombre] = useState('');
  const [dias, setDias] = useState(0);
  const [ocupado, setOcupado] = useState('');
  const { confirmar, dialogo } = useConfirm();
  const cargar = useCallback(() => api.get('/logistica/periodos').then(r => setPeriodos(r.periodos)).catch(e => toast.error(e.message)), [toast]);
  useEffect(() => { cargar(); api.get('/logistica/config').then(r => setDias(r.config.folioDias || 0)).catch(() => {}); }, [cargar]);
  const cerrar = async () => {
    const ok = await confirmar({
      titulo: 'Confirmar inicio de nuevo periodo', peligro: true, aceptar: 'Iniciar nuevo periodo',
      mensaje: 'Los registros actuales de la bitácora y de las hojas por empresa pasarán al archivo del periodo (quedan como respaldo, no se borran) y la numeración vuelve a empezar en 1.\n\n¿Desea continuar?',
    });
    if (!ok) return;
    setOcupado('cerrar');
    try { const r = await api.post('/logistica/periodos/cerrar', { nombre }); toast.ok(r.message); setNombre(''); cargar(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const exportar = async (p, formato) => {
    setOcupado(`${p._id}-${formato}`);
    try { await descargar('/logistica/viajes/exportar', { periodo: p._id, formato }); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const planilla = async () => {
    setOcupado('planilla');
    try {
      await api.put('/logistica/config', { folioDias: dias });
      await abrirPdf('/logistica/planilla-blanco', { dias });
    } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  return (
    <div className={s.grid2} style={{ alignItems: 'start' }}>
      <div className={s.stack}>
        <div className={s.card}>
          <h3 className={s.cardTitle}><Printer size={17} />Planilla en blanco para imprimir</h3>
          <p className={s.cardSub} style={{ marginBottom: 12 }}>"BITÁCORA DE VIAJES COOESPATRANS" con 30 filas numeradas para diligenciar a mano. El folio es la fecha de hoy más los días indicados.</p>
          <div className={s.toolbar}>
            <Field label="Días a sumar al folio"><input type="number" className={s.input} style={{ width: 120 }} value={dias} onChange={e => setDias(Number(e.target.value) || 0)} /></Field>
            <button className={s.btnPrimary} onClick={planilla} disabled={ocupado === 'planilla'}>{ocupado === 'planilla' ? <Loader size={15} className={s.spin} /> : <Printer size={15} />}Abrir para imprimir</button>
          </div>
        </div>
        <div className={s.card}>
          <h3 className={s.cardTitle}><Archive size={17} />Nuevo periodo</h3>
          <p className={s.cardSub} style={{ marginBottom: 12 }}>Cierra el periodo actual: los viajes quedan archivados como respaldo (consultables y exportables) y la bitácora queda lista para el nuevo periodo.</p>
          <div className={s.toolbar}>
            <Field label="Nombre del periodo (opcional)" className={s.toolbarGrow}><input className={s.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Octubre 2026" /></Field>
            <button className={s.btnDanger} onClick={cerrar} disabled={ocupado === 'cerrar'}>{ocupado === 'cerrar' ? <Loader size={15} className={s.spin} /> : <Archive size={15} />}Iniciar nuevo periodo</button>
          </div>
        </div>
      </div>
      <div className={s.card}>
        <h3 className={s.cardTitle} style={{ marginBottom: 12 }}><History size={17} />Periodos archivados</h3>
        {!periodos ? <Loading /> : !periodos.length ? <Empty texto="Aún no se ha cerrado ningún periodo." /> : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Periodo</th><th>Cierre</th><th className={s.num}>Viajes</th><th className={s.num}>Utilidad</th><th>Respaldo</th></tr></thead>
              <tbody>{periodos.map(p => (
                <tr key={p._id}><td className={s.strong}>{p.nombre}</td><td className={s.nowrap}>{fmtFechaHora(p.fechaCierre)}<div className={s.mutedText}>{p.cerradoPorNombre}</div></td>
                  <td className={s.num}>{p.totalViajes}</td><td className={s.num}>{fmtPesos(p.totales?.utilidad)}</td>
                  <td className={s.nowrap}>
                    <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar(p, 'xlsx')}><FileSpreadsheet size={13} />Excel</button>{' '}
                    <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => exportar(p, 'pdf')}><FileText size={13} />PDF</button>
                  </td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function BitacoraViajes() {
  const [tab, setTab] = useState('registro');
  const [empresas, setEmpresas] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const { toasts, remove, toast } = useToast();
  useEffect(() => {
    api.get('/logistica/empresas').then(r => setEmpresas(r.empresas)).catch(e => toast.error(e.message));
    api.get('/logistica/conductores').then(r => setConductores(r.conductores)).catch(() => {});
  }, [toast]);
  const tabs = [
    { id: 'registro', label: 'Registro de viajes', icon: ClipboardList },
    { id: 'empresas', label: 'Por empresa', icon: Building2 },
    { id: 'envios', label: 'Reportes y envíos', icon: Send },
    { id: 'periodos', label: 'Periodos e impresión', icon: Hash },
  ];
  return (
    <div className={s.wrap}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Bitácora de viajes</h1>
          <p className={s.pageSub}>Registro general de cargues: cada viaje con su tarifa, flete, anticipo, saldo y utilidad, organizado por empresa.</p>
        </div>
      </div>
      <Tabs tabs={tabs} activo={tab} onChange={setTab} />
      <div className={s.tabContent}>
        {tab === 'registro' && <Registro toast={toast} empresas={empresas} conductores={conductores} filtroEmpresa={filtroEmpresa} setFiltroEmpresa={setFiltroEmpresa} />}
        {tab === 'empresas' && <PorEmpresa toast={toast} onVer={(e) => { setFiltroEmpresa(e); setTab('registro'); }} />}
        {tab === 'envios' && (
          <div className={s.stack}>
            <ReporteWhatsapp toast={toast} />
            <CorreoSalida toast={toast} />
            <EnviarManifiestos toast={toast} empresas={empresas} />
            <RegistroEnvios toast={toast} />
          </div>
        )}
        {tab === 'periodos' && <Periodos toast={toast} />}
      </div>
      <Toasts toasts={toasts} remove={remove} />
    </div>
  );
}
