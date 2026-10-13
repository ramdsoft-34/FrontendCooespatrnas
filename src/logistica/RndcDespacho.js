// src/logistica/RndcDespacho.js
// Despacho al RNDC (Ministerio de Transporte): viajes por enviar, corrección
// de datos, numeración de remesas y manifiestos, envío (modo PRUEBA o REAL),
// PDF de manifiestos con QR y su envío por correo, validación de conductores,
// configuración, variables, maestros e historial de envíos.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send, Download, Wand2, UserCheck, Settings, Database, ScrollText, FileText, Eye, Edit2, Trash2, Save,
  Loader, Search, CheckCheck, ShieldAlert, ShieldCheck, Lock, Plus, Upload, Archive, Mail, Package, Hash,
  RefreshCw, X, AlertTriangle, ListChecks, Truck,
} from 'lucide-react';
import { api, descargar, abrirPdf } from './api';
import {
  estilos as s, cx, useToast, Toasts, Modal, useConfirm, Field, MoneyInput, Loading, Empty, Kpi, Chip, Alerta, Tabs,
  fmtPesos, fmtMiles, fmtFecha, hoyIso, fmtFechaHora,
} from './ui';

const ESTADOS = {
  OK: ['verde', 'Aceptado'], PRUEBA: ['ambar', 'Prueba'], ERROR: ['rojo', 'Error'], 'NO ENVIADO': ['rojo', 'No enviado'],
  'FALTAN DATOS': ['rojo', 'Faltan datos'], '': ['gris', 'Pendiente'],
};
const chipEstado = (e, msg) => { const [t, l] = ESTADOS[e || ''] || ['gris', e]; return <Chip tono={t} title={msg}>{l}</Chip>; };
const TONO_VALIDACION = { OK: 'verde', ESCRITURA: 'ambar', 'SIN CEDULA - UNICA': 'ambar' };

// ══════════════════════════════════════════════════════════════════════════
// TRAER VIAJES DE LA BITÁCORA (frmSeleccionViajes)
// ══════════════════════════════════════════════════════════════════════════
function TraerViajes({ onClose, onListo, toast }) {
  const [fecha, setFecha] = useState(hoyIso());
  const [datos, setDatos] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [pasando, setPasando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const cargar = useCallback(async () => {
    setDatos(null);
    try { const r = await api.get('/rndc/bitacora-disponibles', { fecha }); setDatos(r); setSel(new Set()); } catch (e) { toast.error(e.message); }
  }, [fecha, toast]);
  useEffect(() => { cargar(); }, [cargar]);
  const viajes = datos?.viajes || [];
  const marcados = viajes.filter(v => sel.has(v.numero));
  const pasar = async () => {
    setPasando(true);
    try { const r = await api.post('/rndc/viajes/traer', { numeros: [...sel] }); setResumen(r.resumen); onListo(); } catch (e) { toast.error(e.message); } finally { setPasando(false); }
  };
  return (
    <Modal open onClose={onClose} size="lg" icon={Download} title="Traer viajes de la bitácora al RNDC" subtitle="Elija los viajes del día; se completan solos cédula, titular, PBV, códigos DANE y sede del destinatario."
      footerLeft={!resumen && <span className={s.mutedText}>{marcados.length} de {viajes.length} marcados · Flete {fmtPesos(marcados.reduce((a, v) => a + (v.flete || 0), 0))}</span>}
      footer={resumen ? <button className={s.btnPrimary} onClick={onClose}>Listo</button>
        : <><button className={s.btnGhost} onClick={onClose}>Cerrar</button><button className={s.btnPrimary} disabled={!sel.size || pasando} onClick={pasar}>{pasando ? <Loader size={15} className={s.spin} /> : <Download size={15} />}Pasar {sel.size || ''} al RNDC</button></>}>
      {resumen ? <Alerta tipo="ok"><ul className={s.list} style={{ margin: 0 }}>{resumen.map(l => <li key={l}>{l}</li>)}</ul></Alerta> : (
        <>
          <div className={s.toolbar}>
            <Field label="Fecha de los viajes"><input type="date" className={s.input} value={fecha} onChange={e => setFecha(e.target.value)} /></Field>
            <button className={s.btnGhost} onClick={() => setFecha(hoyIso())}>Hoy</button>
            <button className={s.btnGhost} onClick={() => setSel(new Set(viajes.map(v => v.numero)))} disabled={!viajes.length}>Marcar todos</button>
            <button className={s.btnGhost} onClick={() => setSel(new Set())} disabled={!sel.size}>Ninguno</button>
          </div>
          {!datos ? <Loading /> : !viajes.length ? <Empty texto={`No hay viajes nuevos en la bitácora para el ${fmtFecha(`${fecha}T00:00:00Z`)}.`} /> : (
            <div className={cx(s.tableWrap, s.scrollY)} style={{ maxHeight: 380 }}>
              <table className={s.table}>
                <thead><tr><th /><th>N°</th><th>Placa</th><th>Conductor</th><th>Empresa</th><th>Destino</th><th className={s.num}>Flete</th><th className={s.num}>Anticipo</th></tr></thead>
                <tbody>{viajes.map(v => (
                  <tr key={v._id} className={sel.has(v.numero) ? s.rowSelected : ''} style={{ cursor: 'pointer' }} onClick={() => setSel(p => { const n = new Set(p); if (n.has(v.numero)) n.delete(v.numero); else n.add(v.numero); return n; })}>
                    <td><input type="checkbox" readOnly checked={sel.has(v.numero)} /></td><td>{v.numero}</td><td className={s.mono}>{v.placa}</td><td>{v.conductor}</td><td>{v.empresa}</td><td>{v.destino}</td>
                    <td className={s.num}>{fmtPesos(v.flete)}</td><td className={s.num}>{fmtPesos(v.anticipo)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {datos?.ocultos > 0 && <p className={s.mutedText} style={{ marginTop: 8 }}>{datos.ocultos} viaje(s) de esta fecha ya están en el RNDC y no se muestran.</p>}
        </>
      )}
    </Modal>
  );
}

// ── Corregir viaje (EV_Guardar) ────────────────────────────────────────────
function CorregirViaje({ viaje, onClose, onGuardado, toast }) {
  const [f, setF] = useState({ ...viaje, pesoKg: viaje.pesoKg ?? '', pbv: viaje.pbv ?? '' });
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const guardar = async () => {
    setGuardando(true);
    try { await api.put(`/rndc/viajes/${viaje._id}`, f); toast.ok('Corrección guardada.'); onGuardado(); } catch (e) { toast.error(e.message); } finally { setGuardando(false); }
  };
  return (
    <Modal open onClose={onClose} size="lg" icon={Edit2} title={`Corregir viaje · registro ${viaje.nReg}`} subtitle={`${viaje.placa} · ${viaje.conductor} · ${viaje.destino}`}
      footer={<><button className={s.btnGhost} onClick={onClose}>Cancelar</button><button className={s.btnPrimary} disabled={guardando} onClick={guardar}><Save size={15} />Guardar cambios</button></>}>
      <div className={s.formGrid3}>
        <Field label="Conductor"><input className={s.input} value={f.conductor} onChange={set('conductor')} /></Field>
        <Field label="Cédula conductor"><input className={s.input} value={f.cedula} onChange={set('cedula')} /></Field>
        <Field label="Cédula titular" hint="Vacío = la del conductor"><input className={s.input} value={f.cedTitular} onChange={set('cedTitular')} /></Field>
        <Field label="Flete"><MoneyInput value={f.flete} onChange={set('flete')} /></Field>
        <Field label="Anticipo"><MoneyInput value={f.anticipo} onChange={set('anticipo')} /></Field>
        <Field label="Saldo"><div className={s.readonlyBox}>{fmtPesos((Number(f.flete) || 0) - (Number(f.anticipo) || 0))}</div></Field>
        <Field label="Peso (kg)"><input className={s.input} value={f.pesoKg} onChange={set('pesoKg')} /></Field>
        <Field label="PBV (kg)" hint="FOPAT 0,1% solo si supera 10.500"><input className={s.input} value={f.pbv} onChange={set('pbv')} /></Field>
        <Field label="Destino"><input className={s.input} value={f.destino} onChange={set('destino')} /></Field>
        <Field label="DANE origen"><input className={s.input} value={f.codOrigen} onChange={set('codOrigen')} /></Field>
        <Field label="DANE destino"><input className={s.input} value={f.codDestino} onChange={set('codDestino')} /></Field>
        <Field label="Destinatario tipo" hint="N = NIT · C = cédula"><select className={s.select} value={f.destTipo} onChange={set('destTipo')}><option value="">N (por defecto)</option><option value="N">N</option><option value="C">C</option></select></Field>
        <Field label="Destinatario número" hint="Vacío = NIT del cliente"><input className={s.input} value={f.destNumero} onChange={set('destNumero')} /></Field>
        <Field label="Sede destinatario" hint="Código de sede en el RNDC"><input className={s.input} value={f.destSede} onChange={set('destSede')} /></Field>
        <Field label="Recomendaciones (máx. 500)" className={s.spanAll}><textarea className={s.textarea} maxLength={500} value={f.recomendaciones} onChange={set('recomendaciones')} /></Field>
      </div>
    </Modal>
  );
}

// ── Vista previa (lo que se envía al Ministerio) ──────────────────────────
function VistaPrevia({ viaje, numeros, onClose, toast }) {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    api.get(`/rndc/viajes/${viaje._id}/vista-previa`, numeros || {}).then(setDatos).catch(e => { toast.error(e.message); onClose(); });
  }, [viaje, numeros]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabla = (titulo, campos) => (
    <div>
      <p className={s.formSectionTitle}>{titulo}</p>
      <div className={cx(s.tableWrap, s.scrollY)} style={{ maxHeight: 420 }}>
        <table className={s.table}><tbody>{campos.map(c => (
          <tr key={c.variable}><td className={s.mono}>{c.variable}</td><td>{c.falta ? <Chip tono="rojo">FALTA</Chip> : c.valor}</td></tr>
        ))}</tbody></table>
      </div>
    </div>
  );
  return (
    <Modal open onClose={onClose} size="xl" icon={Eye} title={`Datos que se enviarán al Ministerio · registro ${viaje.nReg}`} subtitle={`${viaje.placa} · ${viaje.conductor}`}>
      {!datos ? <Loading /> : (
        <>
          {datos.faltantes.length > 0 && <Alerta tipo="error">Faltan datos: {datos.faltantes.join(', ')}. En modo REAL este viaje no se enviará.</Alerta>}
          <div className={s.grid2}>{tabla('Remesa', datos.remesa)}{tabla('Manifiesto', datos.manifiesto)}</div>
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VIAJES POR ENVIAR (frmEnvioRNDC)
// ══════════════════════════════════════════════════════════════════════════
function ViajesRndc({ toast, config, recargarConfig, irA }) {
  const [filtros, setFiltros] = useState({ estado: 'pendientes', fecha: '', q: '' });
  const [viajes, setViajes] = useState(null);
  const [sel, setSel] = useState([]);
  const [traer, setTraer] = useState(false);
  const [corregir, setCorregir] = useState(null);
  const [vista, setVista] = useState(null);
  const [numeracion, setNumeracion] = useState(null);
  const [remIni, setRemIni] = useState('');
  const [manIni, setManIni] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const { confirmar, dialogo } = useConfirm();
  const esReal = config?.config?.modo === 'REAL';

  const cargar = useCallback(async () => {
    try { setViajes((await api.get('/rndc/viajes', filtros)).viajes); } catch (e) { toast.error(e.message); }
  }, [filtros, toast]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (config) { setRemIni(config.proximaRemesa); setManIni(config.proximoManifiesto); } }, [config]);
  useEffect(() => { setSel(p => p.filter(id => viajes?.some(v => v._id === id && v.estadoManifiesto !== 'OK'))); }, [viajes]);

  // EV_Numerar: numera hacia abajo solo los viajes marcados
  useEffect(() => {
    if (!sel.length) { setNumeracion(null); return undefined; }
    const t = setTimeout(() => {
      const orden = (viajes || []).filter(v => sel.includes(v._id)).map(v => v._id);
      api.post('/rndc/numerar', { ids: orden, remesaInicial: remIni, manifiestoInicial: manIni }).then(setNumeracion).catch(e => toast.error(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [sel, remIni, manIni, viajes, toast]);
  const asignado = (id) => numeracion?.asignaciones?.find(a => a._id === id);
  const marcados = (viajes || []).filter(v => sel.includes(v._id));
  const avisos = marcados.filter(v => v.avisos.length);

  const toggle = (v) => { if (v.estadoManifiesto === 'OK') return; setSel(p => (p.includes(v._id) ? p.filter(x => x !== v._id) : [...p, v._id])); };
  const quitar = async (v) => {
    if (!(await confirmar({ titulo: 'Quitar viaje del RNDC', mensaje: `¿Quitar el registro ${v.nReg} (${v.placa}) de la lista del RNDC? Podrá traerlo de nuevo desde la bitácora.`, aceptar: 'Quitar', peligro: true }))) return;
    try { await api.del(`/rndc/viajes/${v._id}`); toast.ok('Viaje quitado.'); cargar(); } catch (e) { toast.error(e.message); }
  };
  const completar = async () => {
    setOcupado('completar');
    try { const r = await api.post('/rndc/viajes/completar'); setResultado({ titulo: 'Datos completados', lineas: r.resumen }); cargar(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const enviar = async (confirmarConductores = false) => {
    if (numeracion?.duplicado) { toast.error(`${numeracion.duplicado} Cambie el consecutivo.`); return; }
    if (esReal && !clave) { toast.error('Escriba la CLAVE RNDC para enviar.'); return; }
    if (!confirmarConductores && !(await confirmar({
      titulo: esReal ? 'Enviar al RNDC (MODO REAL)' : 'Simular envío (MODO PRUEBA)', peligro: esReal, aceptar: esReal ? 'Enviar al Ministerio' : 'Simular',
      mensaje: `${marcados.length} viaje(s) · flete ${fmtPesos(numeracion?.totales?.flete)} · anticipo ${fmtPesos(numeracion?.totales?.anticipo)} · saldo ${fmtPesos(numeracion?.totales?.saldo)}\n\n${esReal ? 'Se enviarán la remesa y el manifiesto de cada viaje al RNDC del Ministerio de Transporte.' : 'No se envía nada: se arma el XML de cada viaje para revisarlo.'}`,
    }))) return;
    setEnviando(true);
    const orden = marcados.map(v => v._id);
    try {
      const r = await api.post('/rndc/enviar', { ids: orden, remesaInicial: remIni, manifiestoInicial: manIni, clave, confirmarConductores });
      setClave('');
      setResultado({ titulo: r.modo === 'REAL' ? 'Resultado del envío al RNDC' : 'Simulación (modo prueba)', mensaje: r.message, detalle: r.detalle });
      setSel([]); cargar(); recargarConfig();
    } catch (e) {
      if (e.data?.requiereConfirmacion === 'conductores') {
        const lista = e.data.dudosos.map(d => `• Registro ${d.nReg}: ${d.conductor} (${d.cedula || 'sin cédula'}) → ${d.estado}`).join('\n');
        const ok = await confirmar({ titulo: 'Conductores que no concuerdan con el RNDC', peligro: true, aceptar: 'Enviar de todos modos', cancelar: 'Revisar primero', mensaje: `${e.message}\n\n${lista}` });
        if (ok) { setEnviando(false); enviar(true); return; }
        irA('validar');
      } else toast.error(e.message);
    } finally { setEnviando(false); }
  };

  return (
    <div className={s.stack}>
      <div className={s.steps}>
        <span className={cx(s.step, s.stepOn)}><span className={s.stepNum}>1</span>Traer viajes de la bitácora</span>
        <span className={cx(s.step, sel.length === 0 && viajes?.length ? s.stepOn : '')}><span className={s.stepNum}>2</span>Revisar y corregir datos</span>
        <span className={cx(s.step, sel.length > 0 && s.stepOn)}><span className={s.stepNum}>3</span>Numerar y enviar</span>
      </div>
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.headerActions}>
            <button className={s.btnPrimary} onClick={() => setTraer(true)}><Download size={15} />Traer viajes de la bitácora</button>
            <button className={s.btnGhost} onClick={completar} disabled={ocupado === 'completar'}>{ocupado === 'completar' ? <Loader size={15} className={s.spin} /> : <Wand2 size={15} />}Completar datos</button>
            <button className={s.btnGhost} onClick={() => irA('validar')}><UserCheck size={15} />Validar conductores</button>
          </div>
          <div className={s.headerActions}>
            <select className={s.select} style={{ width: 170 }} value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="pendientes">Pendientes de enviar</option><option value="aceptados">Aceptados</option><option value="">Todos</option>
            </select>
            <input type="date" className={s.input} style={{ width: 150 }} value={filtros.fecha} onChange={e => setFiltros({ ...filtros, fecha: e.target.value })} title="Fecha (vacío = todas)" />
            <div className={s.searchBox}><Search size={14} /><input className={s.input} style={{ width: 200 }} value={filtros.q} onChange={e => setFiltros({ ...filtros, q: e.target.value })} placeholder="Placa, conductor, número…" /></div>
          </div>
        </div>
        {!viajes ? <Loading /> : !viajes.length ? <Empty texto="No hay viajes en esta lista. Use “Traer viajes de la bitácora”." icon={Truck} /> : (
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead><tr>
                <th><input type="checkbox" aria-label="Marcar todos" checked={viajes.filter(v => v.estadoManifiesto !== 'OK').length > 0 && sel.length === viajes.filter(v => v.estadoManifiesto !== 'OK').length} onChange={e => setSel(e.target.checked ? viajes.filter(v => v.estadoManifiesto !== 'OK').map(v => v._id) : [])} /></th>
                <th>Reg.</th><th>Fecha</th><th>Placa</th><th>Conductor / cédula</th><th>Empresa (NIT)</th><th>Origen › destino</th><th className={s.num}>Flete</th><th className={s.num}>Anticipo</th><th className={s.num}>Saldo</th><th className={s.num}>Peso / PBV</th><th>Sede</th><th>Remesa</th><th>Manifiesto</th><th>Estado</th><th />
              </tr></thead>
              <tbody>{viajes.map(v => {
                const a = asignado(v._id);
                return (
                  <tr key={v._id} className={cx(sel.includes(v._id) && s.rowSelected)}>
                    <td><input type="checkbox" checked={sel.includes(v._id)} disabled={v.estadoManifiesto === 'OK'} onChange={() => toggle(v)} aria-label="Marcar" /></td>
                    <td className={s.strong}>{v.nReg}</td>
                    <td className={s.nowrap}>{fmtFecha(v.fecha)}</td>
                    <td className={s.mono}>{v.placa}</td>
                    <td>{v.conductor}<div className={s.mutedText}>{v.cedula || <Chip tono="rojo">Sin cédula</Chip>}{v.titularEfectivo && v.titularEfectivo !== v.cedula ? ` / tit. ${v.titularEfectivo}` : ''}</div></td>
                    <td>{v.empresa}<div className={s.mutedText}>{v.nitCliente}</div></td>
                    <td><span className={s.mono}>{v.codOrigen || '—'}</span> › {v.destino}<div className={s.mutedText}>{v.codDestino || 'sin DANE'}</div></td>
                    <td className={s.num}>{fmtPesos(v.flete)}</td><td className={s.num}>{fmtPesos(v.anticipo)}</td><td className={s.num}>{fmtPesos(v.saldo)}</td>
                    <td className={s.num}>{fmtMiles(v.pesoKg) || '—'} / {fmtMiles(v.pbv) || '—'}</td>
                    <td>{v.destSede || <Chip tono="ambar">—</Chip>}</td>
                    <td className={s.mono}>{v.remesa || (a ? <span style={{ color: '#2563eb' }}>{a.remesa}</span> : '')}</td>
                    <td className={s.mono}>{v.manifiesto || (a ? <span style={{ color: '#2563eb' }}>{a.manifiesto}</span> : '')}</td>
                    <td>{chipEstado(v.estadoManifiesto, v.mensaje)}{v.avisos.length > 0 && v.estadoManifiesto !== 'OK' && <div style={{ marginTop: 3 }}><Chip tono="rojo" title={v.avisos.join(', ')}><AlertTriangle size={10} />{v.avisos.length} aviso(s)</Chip></div>}</td>
                    <td className={s.nowrap}>
                      <button className={s.iconBtn} title="Vista previa de lo que se envía" onClick={() => setVista({ viaje: v, numeros: a ? { remesa: a.remesa, manifiesto: a.manifiesto } : null })}><Eye size={14} /></button>{' '}
                      {v.estadoManifiesto === 'OK'
                        ? <button className={s.iconBtn} title="Ver PDF del manifiesto" onClick={() => abrirPdf(`/rndc/viajes/${v._id}/manifiesto.pdf`).catch(e => toast.error(e.message))}><FileText size={14} /></button>
                        : <><button className={s.iconBtn} title="Corregir viaje" onClick={() => setCorregir(v)}><Edit2 size={14} /></button>{' '}<button className={cx(s.iconBtn, s.iconBtnDanger)} title="Quitar del RNDC" onClick={() => quitar(v)}><Trash2 size={14} /></button></>}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className={s.card} style={{ borderColor: esReal ? '#fecaca' : '#bbf7d0' }}>
        <div className={s.cardHead}>
          <h3 className={s.cardTitle}><Send size={17} />Enviar al RNDC</h3>
          {esReal ? <Chip tono="rojo"><ShieldAlert size={12} />MODO REAL: se enviará al RNDC</Chip> : <Chip tono="verde"><ShieldCheck size={12} />MODO PRUEBA: no se envía nada</Chip>}
        </div>
        <div className={s.formGrid}>
          <Field label="Primera remesa" hint="Al cambiarla, el manifiesto toma el mismo consecutivo.">
            <input className={s.input} value={remIni} onChange={e => setRemIni(e.target.value.toUpperCase())}
              onBlur={() => { const d = remIni.replace(/[^0-9]/g, ''); const pr = config?.config?.prefijoRemesa || ''; const pm = config?.config?.prefijoManifiesto || ''; const pd = pr.replace(/[^0-9]/g, ''); const n = pd && d.length > pd.length + 3 && d.startsWith(pd) ? d.slice(pd.length) : d; if (n) { setRemIni(`${pr}${n}`); setManIni(`${pm}${n}`); } }} />
          </Field>
          <Field label="Primer manifiesto"><input className={s.input} value={manIni} onChange={e => setManIni(e.target.value.toUpperCase())} /></Field>
          {esReal && <Field label="Clave RNDC" required hint="No se guarda en ningún lado."><div className={s.searchBox}><Lock size={14} /><input type="password" className={s.input} value={clave} onChange={e => setClave(e.target.value)} autoComplete="off" /></div></Field>}
          <Field label="Viajes marcados"><div className={s.readonlyBox}>{marcados.length} · flete {fmtPesos(numeracion?.totales?.flete || 0)} · saldo {fmtPesos(numeracion?.totales?.saldo || 0)}</div></Field>
        </div>
        {numeracion?.duplicado && <div style={{ marginTop: 12 }}><Alerta tipo="error">{numeracion.duplicado} Cambie el consecutivo de arriba.</Alerta></div>}
        {avisos.length > 0 && (
          <div style={{ marginTop: 12 }}><Alerta tipo="warn">REVISAR: {avisos.map(v => <span key={v._id} style={{ marginRight: 10 }}>[{v.placa}: {v.avisos.join('; ')}]</span>)}</Alerta></div>
        )}
        <div className={s.headerActions} style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className={esReal ? s.btnDanger : s.btnPrimary} disabled={!marcados.length || enviando} onClick={() => enviar(false)}>
            {enviando ? <Loader size={15} className={s.spin} /> : <Send size={15} />}{esReal ? `Enviar ${marcados.length} al RNDC` : `Simular envío de ${marcados.length}`}
          </button>
        </div>
      </div>

      {traer && <TraerViajes toast={toast} onClose={() => setTraer(false)} onListo={cargar} />}
      {corregir && <CorregirViaje viaje={corregir} toast={toast} onClose={() => setCorregir(null)} onGuardado={() => { setCorregir(null); cargar(); }} />}
      {vista && <VistaPrevia viaje={vista.viaje} numeros={vista.numeros} toast={toast} onClose={() => setVista(null)} />}
      <Modal open={!!resultado} onClose={() => setResultado(null)} size="lg" icon={ListChecks} title={resultado?.titulo} subtitle={resultado?.mensaje}
        footer={<button className={s.btnPrimary} onClick={() => setResultado(null)}>Aceptar</button>}>
        {resultado?.lineas && <ul className={s.list}>{resultado.lineas.map(l => <li key={l}>{l}</li>)}</ul>}
        {resultado?.detalle && (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Reg.</th><th>Placa</th><th>Remesa</th><th>Manifiesto</th><th>Estado</th><th>Detalle</th></tr></thead>
              <tbody>{resultado.detalle.map(d => (
                <tr key={d.nReg}><td>{d.nReg}</td><td className={s.mono}>{d.placa}</td><td className={s.mono}>{d.remesa}</td><td className={s.mono}>{d.manifiesto}</td><td>{chipEstado(d.estado)}</td>
                  <td style={{ maxWidth: 360 }}>{d.faltantes?.length ? `Faltan: ${d.faltantes.join(', ')}` : (d.mensaje || '')}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Modal>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MANIFIESTOS PDF Y ENVÍO POR CORREO
// ══════════════════════════════════════════════════════════════════════════
function FichaManifiesto({ viaje, onClose, toast }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/rndc/viajes/${viaje._id}/manifiesto`).then(setD).catch(e => { toast.error(e.message); onClose(); }); }, [viaje]); // eslint-disable-line react-hooks/exhaustive-deps
  const x = d?.datos;
  return (
    <Modal open onClose={onClose} size="lg" icon={FileText} title={`Manifiesto ${viaje.manifiesto}`} subtitle="Revise los datos antes de imprimir. Los datos faltantes se completan en Maestros RNDC."
      footer={<><button className={s.btnGhost} onClick={() => descargar(`/rndc/viajes/${viaje._id}/manifiesto.pdf`).catch(e => toast.error(e.message))}><Download size={15} />Descargar</button>
        <button className={s.btnPrimary} onClick={() => abrirPdf(`/rndc/viajes/${viaje._id}/manifiesto.pdf`).catch(e => toast.error(e.message))}><Eye size={15} />Ver / imprimir</button></>}>
      {!d ? <Loading /> : (
        <div className={s.stack} style={{ gap: 12 }}>
          {d.faltantes.length > 0 && <Alerta tipo="warn">Faltan datos (el PDF saldrá con esos campos vacíos y el QR puede no coincidir con el oficial):<ul className={s.list}>{d.faltantes.map(f => <li key={f.etiqueta}>{f.etiqueta}</li>)}</ul></Alerta>}
          {d.avisos.map(a => <Alerta key={a} tipo="warn">{a}</Alerta>)}
          <div className={s.formGrid}>
            {[['Autorización', x.rad], ['Fecha radicación', x.fechaRad], ['Tipo', x.tipo], ['Origen', x.origen], ['Destino', x.destino], ['Titular', `${x.titular || '—'} (${x.titDoc || '—'})`],
              ['Vehículo', `${x.placa} · ${x.marca || '—'} · config. ${x.config || '—'}`], ['SOAT', `${x.soatAseg || '—'} · vence ${x.soatVence || '—'}`], ['Conductor', `${x.condNom || '—'} (${x.condDoc})`],
              ['Licencia', x.condLic || '—'], ['Remitente', `${x.remNit} ${x.remNom || '—'}`], ['Destinatario', `${x.desNit} ${x.desNom || ''} · ${x.desSede}`],
              ['Valor del viaje', fmtPesos(x.flete)], ['Retención fuente', fmtPesos(x.rete)], ['FOPAT', fmtPesos(x.fopat)], ['Neto a pagar', fmtPesos(x.neto)], ['Anticipo', fmtPesos(x.anticipo)], ['Saldo', fmtPesos(x.saldo)]]
              .map(([k, v]) => <Field key={k} label={k}><div className={s.readonlyBox} style={{ fontWeight: 600 }}>{v || '—'}</div></Field>)}
          </div>
          <Field label="Contenido del código QR"><pre className={s.msgBody} style={{ background: '#f8fafc', borderRadius: 9 }}>{d.qr}</pre></Field>
        </div>
      )}
    </Modal>
  );
}

function Manifiestos({ toast }) {
  const [q, setQ] = useState('');
  const [viajes, setViajes] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [pend, setPend] = useState(null);
  const [enviados, setEnviados] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const { confirmar, dialogo } = useConfirm();
  const cargar = useCallback(() => {
    api.get('/rndc/viajes', { estado: 'aceptados', q }).then(r => setViajes(r.viajes)).catch(e => toast.error(e.message));
  }, [q, toast]);
  const cargarPend = useCallback(() => {
    api.get('/rndc/manifiestos/pdf-pendientes').then(setPend).catch(e => toast.error(e.message));
    api.get('/rndc/manifiestos/pdf-enviados').then(r => setEnviados(r.registros)).catch(() => {});
  }, [toast]);
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [cargar]);
  useEffect(() => { cargarPend(); }, [cargarPend]);
  const zip = async () => {
    setOcupado('zip');
    try { const n = await descargar('/rndc/manifiestos/zip'); toast.ok(`Descargado: ${n}`); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const enviarPdfs = async (accion, empresa) => {
    const total = empresa ? pend.empresas.find(e => e.empresa === empresa)?.manifiestos.length : pend.total;
    const ok = await confirmar(accion === 'marcar'
      ? { titulo: 'Marcar como enviados', mensaje: `¿Marcar ${total} PDF como YA ENVIADOS sin mandar correo?`, aceptar: 'Marcar' }
      : { titulo: 'Enviar PDF de manifiestos', mensaje: `Se enviará un correo por empresa (máx. 12 PDF por correo) con ${total} manifiesto(s).\n¿Continuar?`, aceptar: 'Enviar' });
    if (!ok) return;
    setOcupado(`${accion}-${empresa || 'todas'}`);
    try { const r = await api.post('/rndc/manifiestos/pdf-enviar', { accion, empresas: empresa ? [empresa] : [] }); toast.ok(r.message); if (r.empresasError?.length) toast.error(r.empresasError.join('\n')); cargarPend(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}><FileText size={17} />Manifiestos aceptados por el RNDC</h3>
            <p className={s.cardSub}>Copia del manifiesto electrónico de carga con el código QR de seguridad que devuelve el RNDC.</p>
          </div>
          <div className={s.headerActions}>
            <div className={s.searchBox}><Search size={14} /><input className={s.input} style={{ width: 230 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Número de manifiesto, placa…" /></div>
            <button className={s.btnPrimary} onClick={zip} disabled={ocupado === 'zip'}>{ocupado === 'zip' ? <Loader size={15} className={s.spin} /> : <Archive size={15} />}PDF de todos (ZIP)</button>
          </div>
        </div>
        {!viajes ? <Loading /> : !viajes.length ? <Empty texto="No hay manifiestos aceptados." /> : (
          <div className={cx(s.tableWrap, s.scrollY)} style={{ maxHeight: 380 }}>
            <table className={s.table}>
              <thead><tr><th>Manifiesto</th><th>Remesa</th><th>Autorización</th><th>Fecha</th><th>Empresa</th><th>Placa</th><th>Conductor</th><th>Destino</th><th className={s.num}>Flete</th><th>QR</th><th /></tr></thead>
              <tbody>{viajes.map(v => (
                <tr key={v._id}><td className={cx(s.mono, s.strong)}>{v.manifiesto}</td><td className={s.mono}>{v.remesa}</td><td className={s.mono}>{v.radicadoManifiesto}</td><td>{fmtFecha(v.fecha)}</td>
                  <td>{v.empresa}</td><td className={s.mono}>{v.placa}</td><td>{v.conductor}</td><td>{v.destino}</td><td className={s.num}>{fmtPesos(v.flete)}</td>
                  <td>{v.seguridadQR ? <Chip tono="verde">Sí</Chip> : <Chip tono="ambar">Sin código</Chip>}</td>
                  <td className={s.nowrap}><button className={s.iconBtn} title="Revisar datos" onClick={() => setFicha(v)}><Eye size={14} /></button>{' '}
                    <button className={s.iconBtn} title="Ver / imprimir PDF" onClick={() => abrirPdf(`/rndc/viajes/${v._id}/manifiesto.pdf`).catch(e => toast.error(e.message))}><FileText size={14} /></button></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}><Mail size={17} />Enviar PDF de manifiestos a cada empresa</h3>
            <p className={s.cardSub}>Manifiestos aceptados cuyo PDF aún no se ha enviado. Un correo por empresa a sus destinatarios.</p>
          </div>
          {pend?.total > 0 && (
            <div className={s.headerActions}>
              <button className={s.btnGhost} disabled={!!ocupado} onClick={() => enviarPdfs('marcar')}><CheckCheck size={15} />Marcar todos como enviados</button>
              <button className={s.btnPrimary} disabled={!!ocupado} onClick={() => enviarPdfs('enviar')}>{ocupado === 'enviar-todas' ? <Loader size={15} className={s.spin} /> : <Send size={15} />}Enviar todos ({pend.total})</button>
            </div>
          )}
        </div>
        {pend?.modoPrueba && <Alerta tipo="warn">El servidor está en modo de prueba de correo: los envíos se simulan y quedan registrados.</Alerta>}
        {!pend ? <Loading /> : !pend.total ? <Alerta tipo="ok">No hay PDF de manifiestos pendientes por enviar.</Alerta> : (
          <div className={s.grid2}>{pend.empresas.map(e => (
            <div key={e.empresa} className={s.msgCard}>
              <div className={s.msgHead}><span className={s.strong}>{e.empresa} <Chip tono="navy">{e.manifiestos.length} PDF</Chip></span>
                <div className={s.headerActions}>
                  <button className={cx(s.btnGhost, s.btnSm)} disabled={!!ocupado} onClick={() => enviarPdfs('marcar', e.empresa)}>Marcar</button>
                  <button className={cx(s.btnPrimary, s.btnSm)} disabled={!!ocupado || !e.correos} onClick={() => enviarPdfs('enviar', e.empresa)}><Send size={12} />Enviar</button>
                </div></div>
              <div style={{ padding: '10px 14px', fontSize: 12.5 }}>
                <div className={s.mono} style={{ marginBottom: 6 }}>{e.manifiestos.map(m => m.manifiesto).join(' · ')}</div>
                {e.correos ? <span className={s.mutedText}>Para: {e.correos}</span> : <Chip tono="rojo">Sin correos configurados (no se enviará)</Chip>}
              </div>
            </div>
          ))}</div>
        )}
        {enviados?.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary className={s.mutedText} style={{ cursor: 'pointer' }}>Historial de PDF enviados ({enviados.length})</summary>
            <div className={cx(s.tableWrap, s.scrollY)} style={{ marginTop: 8, maxHeight: 260 }}>
              <table className={s.table}><thead><tr><th>Fecha</th><th>Empresa</th><th>Archivo</th><th>Estado</th></tr></thead>
                <tbody>{enviados.map(r => <tr key={r._id}><td>{fmtFechaHora(r.fecha)}</td><td>{r.empresa}</td><td className={s.mono}>{r.archivo}</td><td><Chip tono={r.estado === 'Enviado' ? 'verde' : 'gris'}>{r.estado}</Chip></td></tr>)}</tbody></table>
            </div>
          </details>
        )}
      </div>
      {ficha && <FichaManifiesto viaje={ficha} toast={toast} onClose={() => setFicha(null)} />}
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VALIDAR CONDUCTORES
// ══════════════════════════════════════════════════════════════════════════
function TablaValidacion({ filas, columnas }) {
  const conteo = useMemo(() => (filas || []).reduce((a, f) => ({ ...a, [f.estado]: (a[f.estado] || 0) + 1 }), {}), [filas]);
  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.entries(conteo).map(([k, v]) => <Chip key={k} tono={TONO_VALIDACION[k] || 'rojo'}>{k}: {v}</Chip>)}
      </div>
      <div className={cx(s.tableWrap, s.scrollY)} style={{ maxHeight: 420 }}>
        <table className={s.table}>
          <thead><tr>{columnas.map(c => <th key={c[0]}>{c[0]}</th>)}<th>Nombre oficial RNDC</th><th>Estado</th><th>Qué hacer</th></tr></thead>
          <tbody>{filas.map(f => (
            <tr key={f._id}>{columnas.map(c => <td key={c[0]} className={c[2]}>{f[c[1]]}</td>)}<td>{f.oficial}</td>
              <td><Chip tono={TONO_VALIDACION[f.estado] || 'rojo'}>{f.estado}</Chip></td><td style={{ maxWidth: 380, fontSize: 12 }}>{f.sugerencia}{f.cedulaSugerida && <div><b>Cédula propuesta: {f.cedulaSugerida}</b></div>}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}

function ValidarConductores({ toast }) {
  const [viajes, setViajes] = useState(null);
  const [base, setBase] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');
  const { confirmar, dialogo } = useConfirm();
  const cargar = useCallback(() => {
    api.get('/rndc/validar-conductores').then(r => setViajes(r.filas)).catch(e => setError(e.message));
    api.get('/rndc/validar-base').then(r => setBase(r.filas)).catch(e => setError(e.message));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const corregir = async () => {
    const n = viajes.filter(f => f.estado === 'ESCRITURA' && f.estadoManifiesto !== 'OK').length;
    if (!(await confirmar({ titulo: 'Corregir nombres', mensaje: `Hay ${n} viaje(s) pendiente(s) con el nombre del conductor escrito distinto al del RNDC.\n¿Reemplazarlo por el nombre oficial del RNDC?`, aceptar: 'Corregir' }))) return;
    setOcupado('corregir');
    try { const r = await api.post('/rndc/validar-conductores/corregir'); toast.ok(r.message); cargar(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const completar = async () => {
    const n = base.filter(f => f.estado === 'SIN CEDULA - UNICA').length;
    if (!(await confirmar({ titulo: 'Completar cédulas', mensaje: `¿Completar en la base de conductores las ${n} cédulas que faltan y que dan una sola persona en el RNDC?\nRevise antes la cédula propuesta: si dos conductores comparten nombre, mejor complete a mano.`, aceptar: 'Completar' }))) return;
    setOcupado('completar');
    try { const r = await api.post('/rndc/validar-base/completar'); toast.ok(r.message); cargar(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  if (error) return <Alerta tipo="error">{error}</Alerta>;
  return (
    <div className={s.stack}>
      <Alerta tipo="info">Verde = OK · amarillo = se puede corregir · rojo = revisar antes de enviar. La cédula es la llave; la base oficial es el maestro de conductores del RNDC.</Alerta>
      <div className={s.card}>
        <div className={s.cardHead}>
          <h3 className={s.cardTitle}><UserCheck size={17} />Conductores de los viajes RNDC</h3>
          <button className={s.btnPrimary} disabled={!viajes?.some(f => f.estado === 'ESCRITURA' && f.estadoManifiesto !== 'OK') || !!ocupado} onClick={corregir}>{ocupado === 'corregir' ? <Loader size={15} className={s.spin} /> : <Wand2 size={15} />}Corregir nombres mal escritos</button>
        </div>
        {!viajes ? <Loading /> : <TablaValidacion filas={viajes} columnas={[['Reg.', 'nReg', s.strong], ['Empresa', 'empresa'], ['Placa', 'placa', s.mono], ['Conductor digitado', 'conductor'], ['Cédula', 'cedula', s.mono], ['Manifiesto', 'estadoManifiesto']]} />}
      </div>
      <div className={s.card}>
        <div className={s.cardHead}>
          <h3 className={s.cardTitle}><Database size={17} />Base de conductores</h3>
          <button className={s.btnPrimary} disabled={!base?.some(f => f.estado === 'SIN CEDULA - UNICA') || !!ocupado} onClick={completar}>{ocupado === 'completar' ? <Loader size={15} className={s.spin} /> : <Wand2 size={15} />}Completar cédulas únicas</button>
        </div>
        {!base ? <Loading /> : <TablaValidacion filas={base} columnas={[['Conductor', 'conductor', s.strong], ['Placa', 'placa', s.mono], ['Cédula actual', 'cedula', s.mono]]} />}
      </div>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y VARIABLES
// ══════════════════════════════════════════════════════════════════════════
const TOKENS = '{NIT} {PLACA} {CED} {TITULAR} {PESO} {FLETE} {ANTICIPO} {RETEFUENTE} {FECHA} {FECHA_PAGO} {FOPAT} {NIT_CLIENTE} {DEST_TIPO} {DEST_ID} {DEST_SEDE} {COD_ORIGEN} {COD_DESTINO} {CONDUCTOR} {REMESA} {MANIFIESTO} {OBSERVACIONES}';

function Configuracion({ toast, config, recargarConfig }) {
  const [c, setC] = useState(null);
  const [vars, setVars] = useState(null);
  const [ocupado, setOcupado] = useState('');
  const { confirmar, dialogo } = useConfirm();
  useEffect(() => { if (config) setC(config.config); }, [config]);
  const cargarVars = useCallback(() => api.get('/rndc/variables').then(r => setVars(r.variables)).catch(e => toast.error(e.message)), [toast]);
  useEffect(() => { cargarVars(); }, [cargarVars]);
  const set = (k) => (e) => setC(p => ({ ...p, [k]: e.target.value }));
  const guardar = async () => {
    if (c.modo === 'REAL' && config.config.modo !== 'REAL' && !(await confirmar({ titulo: 'Activar modo REAL', peligro: true, aceptar: 'Activar', mensaje: 'En modo REAL los envíos llegan al RNDC del Ministerio de Transporte. ¿Activarlo?' }))) return;
    setOcupado('cfg');
    try { await api.put('/rndc/config', c); toast.ok('Configuración guardada.'); recargarConfig(); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const guardarVars = async () => {
    setOcupado('vars');
    try { const r = await api.put('/rndc/variables', { variables: vars }); setVars(r.variables); toast.ok('Variables guardadas.'); } catch (e) { toast.error(e.message); } finally { setOcupado(''); }
  };
  const modelo = async () => {
    if (!(await confirmar({ titulo: 'Cargar modelo', peligro: true, aceptar: 'Reemplazar variables', mensaje: 'Reemplaza todas las variables por las del manifiesto modelo M10062798. ¿Continuar?' }))) return;
    try { await api.post('/rndc/variables/modelo'); toast.ok('Modelo cargado.'); cargarVars(); } catch (e) { toast.error(e.message); }
  };
  if (!c) return <Loading />;
  const campo = (k, label, hint, extra = {}) => <Field label={label} hint={hint} {...extra}><input className={s.input} value={c[k] ?? ''} onChange={set(k)} /></Field>;
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <div className={s.cardHead}>
          <h3 className={s.cardTitle}><Settings size={17} />Configuración del RNDC</h3>
          <button className={s.btnPrimary} onClick={guardar} disabled={ocupado === 'cfg'}><Save size={15} />Guardar</button>
        </div>
        <Alerta tipo="info">La clave del RNDC no se guarda: se pide al enviar. Solo se envía de verdad en modo REAL.</Alerta>
        <div className={s.formGrid3}>
          {campo('url', 'URL del servicio web', 'Según el manual del RNDC', { className: s.span2 })}
          <Field label="Modo"><div className={s.segment}>{['PRUEBA', 'REAL'].map(m => <button key={m} type="button" className={c.modo === m ? s.segmentOn : ''} onClick={() => setC({ ...c, modo: m })}>{m}</button>)}</div></Field>
          {campo('usuario', 'Usuario del web service')}
          {campo('nit', 'NIT empresa de transporte', 'Con dígito de verificación')}
          {campo('codOrigen', 'Código DIVIPOLA de origen', 'Ej. Cujacal Pasto = 52001033')}
          {campo('prefijoRemesa', 'Prefijo remesa')}
          <Field label="Próximo consecutivo remesa" hint={`Próxima: ${config.proximaRemesa}`}><input className={s.input} value={c.consecutivoRemesa} onChange={set('consecutivoRemesa')} /></Field>
          {campo('procesoRemesa', 'Proceso remesa')}
          {campo('prefijoManifiesto', 'Prefijo manifiesto')}
          <Field label="Próximo consecutivo manifiesto" hint={`Próximo: ${config.proximoManifiesto}`}><input className={s.input} value={c.consecutivoManifiesto} onChange={set('consecutivoManifiesto')} /></Field>
          {campo('procesoManifiesto', 'Proceso manifiesto')}
          {campo('procesoRemesasManifiesto', 'Proceso remesas del manifiesto')}
        </div>
        <hr className={s.divider} />
        <p className={s.formSectionTitle}>Datos impresos en el manifiesto</p>
        <div className={s.formGrid3}>
          {campo('empresaNombre', 'Empresa de transporte')}{campo('empresaDireccion', 'Dirección')}{campo('empresaTelefono', 'Teléfono')}
          {campo('empresaCiudad', 'Ciudad / lugar de pago')}{campo('productoCodigo', 'Código del producto')}{campo('productoDescripcion', 'Descripción del producto')}
        </div>
      </div>
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}><Hash size={17} />Variables de la remesa (R) y el manifiesto (M)</h3>
            <p className={s.cardSub}>El valor puede usar: <span className={s.mono}>{TOKENS}</span>. Si queda vacío, la variable no se envía.</p>
          </div>
          <div className={s.headerActions}>
            <button className={s.btnGhost} onClick={modelo}><RefreshCw size={15} />Cargar modelo</button>
            <button className={s.btnGhost} onClick={() => setVars(v => [...v, { proceso: 'M', variable: '', valor: '', nota: '' }])}><Plus size={15} />Agregar</button>
            <button className={s.btnPrimary} onClick={guardarVars} disabled={ocupado === 'vars'}><Save size={15} />Guardar variables</button>
          </div>
        </div>
        {!vars ? <Loading /> : (
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead><tr><th>Proceso</th><th>Variable</th><th>Valor</th><th>Nota</th><th /></tr></thead>
              <tbody>{vars.map((v, i) => {
                const up = (k) => (e) => setVars(p => p.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
                return (
                  <tr key={v._id || `n${i}`}>
                    <td><select className={s.select} style={{ width: 70 }} value={v.proceso} onChange={up('proceso')}><option>R</option><option>M</option></select></td>
                    <td><input className={cx(s.input, s.mono)} value={v.variable} onChange={up('variable')} /></td>
                    <td><input className={cx(s.input, s.mono)} value={v.valor} onChange={up('valor')} /></td>
                    <td><input className={s.input} value={v.nota} onChange={up('nota')} /></td>
                    <td><button className={cx(s.iconBtn, s.iconBtnDanger)} onClick={() => setVars(p => p.filter((_, j) => j !== i))} title="Quitar"><X size={14} /></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAESTROS RNDC
// ══════════════════════════════════════════════════════════════════════════
const MAESTROS = {
  vehiculos: { label: 'Vehículos', campos: [['placa', 'Placa'], ['marca', 'Marca'], ['configuracion', 'Configuración'], ['pesoVacio', 'Peso vacío'], ['soat', 'SOAT (NIT y aseguradora)'], ['poliza', 'N° póliza'], ['venceSoat', 'Vence SOAT (aaaa/mm/dd)'], ['docTitular', 'Doc. titular'], ['pbv', 'PBV']] },
  titulares: { label: 'Titulares', campos: [['doc', 'Documento'], ['nombre', 'Nombre'], ['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['ciudad', 'Ciudad']] },
  conductores: { label: 'Conductores', campos: [['cedula', 'Cédula'], ['nombre', 'Nombre'], ['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['licencia', 'Licencia (ej. C2-123)'], ['ciudad', 'Ciudad']] },
  remitentes: { label: 'Remitentes', campos: [['nit', 'NIT'], ['nombre', 'Nombre (como en el RNDC)'], ['direccion', 'Dirección de cargue']] },
  sedes: { label: 'Sedes', campos: [['idTercero', 'ID tercero'], ['nombre', 'Nombre sede'], ['codigo', 'Código sede'], ['preferida', 'Preferida'], ['codMunicipio', 'Municipio DIVIPOLA'], ['municipio', 'Municipio (texto RNDC)'], ['direccion', 'Dirección']] },
  municipios: { label: 'Municipios (texto)', campos: [['codigo', 'Código'], ['texto', 'Texto en el manifiesto']] },
  alias: { label: 'Alias de destinos', campos: [['clave', 'Si el destino dice…'], ['municipio', 'Municipio (nombre DANE)']] },
  dane: { label: 'DANE', campos: [['codigo', 'Código RNDC'], ['departamento', 'Departamento'], ['municipio', 'Municipio'], ['nombreCorto', 'Nombre corto']], soloLectura: true },
};

function MaestrosRndc({ toast }) {
  const [tipo, setTipo] = useState('vehiculos');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [form, setForm] = useState(null);
  const [importando, setImportando] = useState('');
  const { confirmar, dialogo } = useConfirm();
  const m = MAESTROS[tipo];
  const cargar = useCallback(() => {
    api.get(`/rndc/maestros/${tipo}`, { q, page: pagina, limit: 100 }).then(setDatos).catch(e => toast.error(e.message));
  }, [tipo, q, pagina, toast]);
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [cargar]);
  useEffect(() => { setPagina(1); setDatos(null); }, [tipo, q]);
  const guardar = async () => {
    try {
      if (form._id) await api.put(`/rndc/maestros/${tipo}/${form._id}`, form); else await api.post(`/rndc/maestros/${tipo}`, form);
      toast.ok('Registro guardado.'); setForm(null); cargar();
    } catch (e) { toast.error(e.message); }
  };
  const eliminar = async (it) => {
    if (!(await confirmar({ titulo: 'Eliminar registro', mensaje: '¿Eliminar este registro del maestro?', aceptar: 'Eliminar', peligro: true }))) return;
    try { await api.del(`/rndc/maestros/${tipo}/${it._id}`); toast.ok('Eliminado.'); cargar(); } catch (e) { toast.error(e.message); }
  };
  const importar = async (clase, archivo) => {
    if (!archivo) return;
    setImportando(clase);
    try {
      const form = new FormData(); form.append('archivo', archivo);
      const r = await api.upload(`/rndc/importar/${clase}`, form);
      toast.ok(r.resultado.mensaje); cargar();
    } catch (e) { toast.error(e.message); } finally { setImportando(''); }
  };
  const botonImport = (clase, label) => (
    <label className={cx(s.btnGhost, s.btnSm)} style={{ cursor: 'pointer' }}>
      {importando === clase ? <Loader size={13} className={s.spin} /> : <Upload size={13} />}{label}
      <input type="file" accept=".xlsx,.xls" hidden onChange={e => { importar(clase, e.target.files?.[0]); e.target.value = ''; }} />
    </label>
  );
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}><Database size={17} />Maestros del RNDC</h3>
          <p className={s.cardSub}>Datos tal como salen en el RNDC (Consultas). Se usan para completar los viajes y para el PDF del manifiesto.</p>
        </div>
        <div className={s.headerActions}>
          {botonImport('vehiculos', 'Maestro de vehículos')}
          {botonImport('terceros', 'Maestro de terceros')}
          {botonImport('dane', 'DIVIPOLA (DANE)')}
        </div>
      </div>
      <div className={s.toolbar}>
        <select className={s.select} style={{ width: 200 }} value={tipo} onChange={e => setTipo(e.target.value)}>
          {Object.entries(MAESTROS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className={cx(s.searchBox, s.toolbarGrow)}><Search size={14} /><input className={s.input} value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar en ${m.label.toLowerCase()}…`} /></div>
        {!m.soloLectura && <button className={s.btnPrimary} onClick={() => setForm({})}><Plus size={15} />Agregar</button>}
      </div>
      {!datos ? <Loading /> : !datos.items.length ? <Empty texto="Sin registros." /> : (
        <>
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead><tr>{m.campos.map(([k, l]) => <th key={k}>{l}</th>)}{!m.soloLectura && <th />}</tr></thead>
              <tbody>{datos.items.map(it => (
                <tr key={it._id}>{m.campos.map(([k]) => <td key={k}>{k === 'preferida' ? (it[k] ? <Chip tono="verde">SI</Chip> : '') : String(it[k] ?? '')}</td>)}
                  {!m.soloLectura && <td className={s.nowrap}><button className={s.iconBtn} onClick={() => setForm(it)} title="Editar"><Edit2 size={14} /></button>{' '}<button className={cx(s.iconBtn, s.iconBtnDanger)} onClick={() => eliminar(it)} title="Eliminar"><Trash2 size={14} /></button></td>}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className={s.pager}>
            <span>{fmtMiles(datos.total)} registro(s) · página {datos.pagina} de {datos.paginas || 1}</span>
            <button className={cx(s.btnGhost, s.btnSm)} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
            <button className={cx(s.btnGhost, s.btnSm)} disabled={pagina >= datos.paginas} onClick={() => setPagina(p => p + 1)}>Siguiente</button>
          </div>
        </>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={`${form?._id ? 'Editar' : 'Agregar'} · ${m.label}`} icon={Database}
        footer={<><button className={s.btnGhost} onClick={() => setForm(null)}>Cancelar</button><button className={s.btnPrimary} onClick={guardar}><Save size={15} />Guardar</button></>}>
        {form && <div className={s.formGrid}>{m.campos.map(([k, l]) => (
          <Field key={k} label={l}>
            {k === 'preferida'
              ? <label className={s.checkRow}><input type="checkbox" checked={!!form[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} />Usar esta sede cuando hay varias con el mismo nombre</label>
              : <input className={s.input} value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />}
          </Field>
        ))}</div>}
      </Modal>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REGISTRO DE ENVÍOS (RNDC_LOG)
// ══════════════════════════════════════════════════════════════════════════
function LogRndc({ toast }) {
  const [log, setLog] = useState(null);
  const [ver, setVer] = useState(null);
  useEffect(() => { api.get('/rndc/log').then(r => setLog(r.log)).catch(e => toast.error(e.message)); }, [toast]);
  return (
    <div className={s.card}>
      <h3 className={s.cardTitle} style={{ marginBottom: 12 }}><ScrollText size={17} />Registro de comunicaciones con el RNDC</h3>
      <p className={s.cardSub} style={{ marginBottom: 12 }}>Lo enviado (sin la clave) y la respuesta del Ministerio. Sobre 1 = contenido escapado, 2 = CDATA (reintento automático ante RNDC72).</p>
      {!log ? <Loading /> : !log.length ? <Empty texto="Aún no hay envíos registrados." /> : (
        <div className={cx(s.tableWrap, s.scrollY)}>
          <table className={s.table}>
            <thead><tr><th>Fecha</th><th>Proceso</th><th>Sobre</th><th>Respuesta</th><th>Usuario</th><th /></tr></thead>
            <tbody>{log.map(l => {
              const ok = /ingresoid/i.test(l.respuesta);
              return (
                <tr key={l._id}><td className={s.nowrap}>{fmtFechaHora(l.fecha)}</td><td>{l.proceso || '—'}</td><td>{l.sobre}</td>
                  <td>{ok ? <Chip tono="verde">Aceptado</Chip> : <Chip tono="rojo">{(l.respuesta.match(/ErrorMSG>([^<]{0,60})/i) || [])[1] || 'Revisar'}</Chip>}</td>
                  <td>{l.usuario}</td><td><button className={cx(s.btnGhost, s.btnSm)} onClick={() => setVer(l)}><Eye size={13} />Ver</button></td></tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!ver} onClose={() => setVer(null)} size="xl" title="Detalle del envío" subtitle={ver && `${fmtFechaHora(ver.fecha)} · ${ver.url}`} icon={ScrollText}>
        {ver && <div className={s.grid2}>
          <Field label="Enviado (sin clave)"><pre className={s.msgBody} style={{ background: '#f8fafc', borderRadius: 9, maxHeight: 420, wordBreak: 'break-all' }}>{ver.enviado}</pre></Field>
          <Field label="Respuesta"><pre className={s.msgBody} style={{ background: '#f8fafc', borderRadius: 9, maxHeight: 420, wordBreak: 'break-all' }}>{ver.respuesta}</pre></Field>
        </div>}
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function RndcDespacho() {
  const [tab, setTab] = useState('viajes');
  const [config, setConfig] = useState(null);
  const { toasts, remove, toast } = useToast();
  const recargarConfig = useCallback(() => api.get('/rndc/config').then(setConfig).catch(e => toast.error(e.message)), [toast]);
  useEffect(() => { recargarConfig(); }, [recargarConfig]);
  const esReal = config?.config?.modo === 'REAL';
  const tabs = [
    { id: 'viajes', label: 'Viajes por enviar', icon: Send },
    { id: 'manifiestos', label: 'Manifiestos PDF', icon: FileText },
    { id: 'validar', label: 'Validar conductores', icon: UserCheck },
    { id: 'maestros', label: 'Maestros RNDC', icon: Database },
    { id: 'config', label: 'Configuración', icon: Settings },
    { id: 'log', label: 'Registro', icon: ScrollText },
  ];
  return (
    <div className={s.wrap}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Despacho RNDC {config && (esReal ? <Chip tono="rojo"><ShieldAlert size={12} />REAL</Chip> : <Chip tono="verde"><ShieldCheck size={12} />PRUEBA</Chip>)}</h1>
          <p className={s.pageSub}>Remesas y manifiestos de carga ante el Registro Nacional de Despachos de Carga del Ministerio de Transporte.</p>
        </div>
        {config && (
          <div className={s.kpis} style={{ marginBottom: 0, minWidth: 320 }}>
            <Kpi label="Próxima remesa" value={config.proximaRemesa} icon={Package} />
            <Kpi label="Próximo manifiesto" value={config.proximoManifiesto} icon={FileText} />
          </div>
        )}
      </div>
      <Tabs tabs={tabs} activo={tab} onChange={setTab} />
      <div className={s.tabContent}>
        {tab === 'viajes' && <ViajesRndc toast={toast} config={config} recargarConfig={recargarConfig} irA={setTab} />}
        {tab === 'manifiestos' && <Manifiestos toast={toast} />}
        {tab === 'validar' && <ValidarConductores toast={toast} />}
        {tab === 'maestros' && <MaestrosRndc toast={toast} />}
        {tab === 'config' && <Configuracion toast={toast} config={config} recargarConfig={recargarConfig} />}
        {tab === 'log' && <LogRndc toast={toast} />}
      </div>
      <Toasts toasts={toasts} remove={remove} />
    </div>
  );
}
