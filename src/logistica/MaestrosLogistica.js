// src/logistica/MaestrosLogistica.js
// Datos base de la operación (hojas Empresas, CORREOS, Fletes y _CONDUCTORES
// de la plantilla de viajes) e importación de la plantilla de Excel.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2, Route, UserCog, Upload, Plus, Search, Edit2, Trash2, Save, Eraser,
  Mail, FileSpreadsheet, CheckCircle, Truck, User, CreditCard, Loader,
} from 'lucide-react';
import { api } from './api';
import {
  estilos as s, cx, useToast, Toasts, Modal, useConfirm, Field, MoneyInput, Combo, Loading, Empty,
  Chip, Alerta, Tabs, useCarga, fmtPesos, fmtFecha, isoFecha, hoyIso,
} from './ui';

// ══════════════════════════════════════════════════════════════════════════
// EMPRESAS
// ══════════════════════════════════════════════════════════════════════════
function Empresas({ toast }) {
  const { datos, cargando, error, recargar } = useCarga(() => Promise.all([api.get('/logistica/empresas'), api.get('/logistica/config')]));
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const { confirmar, dialogo } = useConfirm();
  const empresas = datos?.[0].empresas || [];
  const logos = datos?.[1].logos || [];

  const abrir = (e) => setForm(e ? { ...e, correos: (e.correos || []).join(', ') } : { nombre: '', nit: '', razonSocial: '', correos: '', logo: '' });
  const guardar = async () => {
    setGuardando(true);
    try {
      if (form._id) await api.put(`/logistica/empresas/${form._id}`, form);
      else await api.post('/logistica/empresas', form);
      toast.ok('Empresa registrada correctamente.');
      setForm(null); recargar();
    } catch (e) { toast.error(e.message); } finally { setGuardando(false); }
  };
  const eliminar = async (e) => {
    if (!(await confirmar({ titulo: 'Desactivar empresa', mensaje: `¿Desactivar "${e.nombre}"? Sus viajes y tarifas se conservan y puede volver a activarla registrándola de nuevo.`, aceptar: 'Desactivar', peligro: true }))) return;
    try { await api.del(`/logistica/empresas/${e._id}`); toast.ok('Empresa desactivada.'); recargar(); } catch (er) { toast.error(er.message); }
  };

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}><Building2 size={17} />Empresas cliente</h3>
          <p className={s.cardSub}>NIT, razón social (a quién van dirigidos los correos) y destinatarios de correo de cada empresa.</p>
        </div>
        <button className={s.btnPrimary} onClick={() => abrir(null)}><Plus size={15} />Nueva empresa</button>
      </div>
      {cargando ? <Loading /> : error ? <Alerta tipo="error">{error}</Alerta> : !empresas.length ? <Empty texto="No hay empresas registradas." /> : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Empresa</th><th>NIT</th><th>Razón social (Señores)</th><th>Correos destino</th><th>Logo</th><th /></tr></thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e._id}>
                  <td className={s.strong}>{e.nombre}</td>
                  <td className={s.mono}>{e.nit || <Chip tono="ambar">Sin NIT</Chip>}</td>
                  <td>{e.razonSocial || <span className={s.mutedText}>{e.nombre.toUpperCase()}</span>}</td>
                  <td>{e.correos?.length ? <Chip tono="azul" title={e.correos.join('\n')}><Mail size={11} />{e.correos.length} correo(s)</Chip> : <Chip tono="ambar">Sin correos</Chip>}</td>
                  <td>{e.logo || <span className={s.mutedText}>—</span>}</td>
                  <td className={s.nowrap}>
                    <button className={s.iconBtn} title="Editar" onClick={() => abrir(e)}><Edit2 size={14} /></button>{' '}
                    <button className={cx(s.iconBtn, s.iconBtnDanger)} title="Desactivar" onClick={() => eliminar(e)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Editar empresa' : 'Registrar empresa'} icon={Building2}
        footer={<><button className={s.btnGhost} onClick={() => setForm(null)}>Cancelar</button><button className={s.btnPrimary} disabled={guardando} onClick={guardar}><Save size={15} />Guardar</button></>}>
        {form && (
          <div className={s.formGrid}>
            <Field label="Nombre de la empresa" required><input className={s.input} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
            <Field label="NIT" required hint="Sin dígito de verificación para el RNDC (ej. 8909009431)"><input className={s.input} value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} /></Field>
            <Field label="A quién va dirigido (Señores:)" className={s.spanAll} hint="Se usa en el correo de salida y en el envío de manifiestos. Vacío = nombre de la empresa en mayúsculas.">
              <input className={s.input} value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} />
            </Field>
            <Field label="Correos destino" className={s.spanAll} hint="Separados por coma o en líneas distintas.">
              <textarea className={s.textarea} rows={4} value={form.correos} onChange={e => setForm({ ...form, correos: e.target.value })} />
            </Field>
            <Field label="Logo en los informes">
              <select className={s.select} value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}>
                <option value="">Automático / sin logo</option>
                {logos.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        )}
      </Modal>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TARIFAS Y DESTINOS
// ══════════════════════════════════════════════════════════════════════════
const TARIFA_VACIA = { _id: null, destino: '', tarifaCliente: '', tarifaAuxiliar: '', fleteConductor: '', auxiliarPagado: '', anticipoHabitual: '' };

function Tarifas({ toast }) {
  const [empresas, setEmpresas] = useState([]);
  const [empresa, setEmpresa] = useState('');
  const [tarifas, setTarifas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState(TARIFA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const { confirmar, dialogo } = useConfirm();

  useEffect(() => { api.get('/logistica/empresas').then(r => setEmpresas(r.empresas)).catch(e => toast.error(e.message)); }, [toast]);
  const cargar = async (emp = empresa) => {
    if (!emp) { setTarifas([]); return; }
    setCargando(true);
    try { setTarifas((await api.get('/logistica/tarifas', { empresa: emp })).tarifas); } catch (e) { toast.error(e.message); } finally { setCargando(false); }
  };
  useEffect(() => { cargar(empresa); setForm(TARIFA_VACIA); }, [empresa]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = tarifas.filter(t => !filtro || t.destino.toLowerCase().includes(filtro.toLowerCase()));
  const elegir = (t) => setForm({ ...t, anticipoHabitual: t.anticipoHabitual ?? '' });

  // "Guardar" crea o actualiza por empresa+destino; "Modificar" cambia el destino elegido
  const guardar = async (modificar) => {
    if (!empresa) { toast.error('Selecciona una Empresa.'); return; }
    if (!String(form.destino).trim()) { toast.error('Escribe o selecciona un Destino.'); return; }
    if (form.tarifaCliente === '' || form.fleteConductor === '') { toast.error('Las tarifas deben ser números (Tarifa cliente y Flete conductor son obligatorios).'); return; }
    setGuardando(true);
    try {
      const body = { ...form, empresa };
      if (modificar) await api.put(`/logistica/tarifas/${form._id}`, body);
      else await api.post('/logistica/tarifas', body);
      toast.ok(modificar ? 'Modificado correctamente.' : 'Guardado correctamente.');
      setForm(TARIFA_VACIA); cargar();
    } catch (e) { toast.error(e.message); } finally { setGuardando(false); }
  };
  const eliminar = async (t) => {
    if (!(await confirmar({ titulo: 'Eliminar destino', mensaje: `¿Eliminar la tarifa de "${t.destino}" (${empresa})?\nLos viajes ya registrados conservan sus valores; la relación de fletes dejará de encontrar esta tarifa.`, aceptar: 'Eliminar', peligro: true }))) return;
    try { await api.del(`/logistica/tarifas/${t._id}`); toast.ok('Destino eliminado.'); setForm(TARIFA_VACIA); cargar(); } catch (e) { toast.error(e.message); }
  };

  return (
    <div className={s.grid2} style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, 1fr)', alignItems: 'start' }}>
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}><Route size={17} />Tarifas y destinos</h3>
            <p className={s.cardSub}>Lo que se cobra a la empresa y lo que se paga al conductor por cada destino (x viaje/día).</p>
          </div>
        </div>
        <div className={s.toolbar}>
          <Field label="Empresa" className={s.toolbarGrow}>
            <select className={s.select} value={empresa} onChange={e => setEmpresa(e.target.value)}>
              <option value="">Selecciona una empresa…</option>
              {empresas.map(e => <option key={e._id} value={e.nombre}>{e.nombre}</option>)}
            </select>
          </Field>
          <Field label="Buscar destino" className={s.toolbarGrow}>
            <div className={s.searchBox}><Search size={14} /><input className={s.input} value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Ej. Pasto 3.0" disabled={!empresa} /></div>
          </Field>
        </div>
        {!empresa ? <Empty texto="Selecciona una empresa para ver sus destinos." icon={Route} /> : cargando ? <Loading /> : !visibles.length ? <Empty texto="Esta empresa no tiene destinos registrados." /> : (
          <div className={cx(s.tableWrap, s.scrollY)}>
            <table className={s.table}>
              <thead><tr><th>Destino</th><th className={s.num}>Tarifa cliente</th><th className={s.num}>Tarifa auxiliar</th><th className={s.num}>Flete conductor</th><th className={s.num}>Auxiliar pagado</th><th className={s.num}>Anticipo habitual</th><th /></tr></thead>
              <tbody>
                {visibles.map(t => (
                  <tr key={t._id} className={form._id === t._id ? s.rowSelected : ''} onClick={() => elegir(t)} style={{ cursor: 'pointer' }}>
                    <td className={s.strong}>{t.destino}</td>
                    <td className={s.num}>{fmtPesos(t.tarifaCliente)}</td>
                    <td className={s.num}>{fmtPesos(t.tarifaAuxiliar)}</td>
                    <td className={s.num}>{fmtPesos(t.fleteConductor)}</td>
                    <td className={s.num}>{fmtPesos(t.auxiliarPagado)}</td>
                    <td className={s.num}>{t.anticipoHabitual ? fmtPesos(t.anticipoHabitual) : '—'}</td>
                    <td><button className={cx(s.iconBtn, s.iconBtnDanger)} title="Eliminar" onClick={(e) => { e.stopPropagation(); eliminar(t); }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={s.card}>
        <h3 className={s.cardTitle} style={{ marginBottom: 12 }}>{form._id ? <><Edit2 size={16} />Editar destino</> : <><Plus size={16} />Nuevo destino</>}</h3>
        <div className={s.stack} style={{ gap: 12 }}>
          <Field label="Destino" required hint={form._id ? 'Seleccionado de la lista: use "Modificar" para cambiarlo.' : 'Si el destino ya existe, "Guardar" actualiza sus valores.'}>
            <Combo value={form.destino} onChange={v => setForm(f => ({ ...f, destino: v }))} opciones={tarifas.map(t => t.destino)} placeholder="Ej. Pasto alkosto 5.0" disabled={!empresa}
              onPick={(d) => { const t = tarifas.find(x => x.destino === d); if (t) elegir(t); }} />
          </Field>
          <div className={s.formGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Tarifa cliente" required><MoneyInput value={form.tarifaCliente} onChange={v => setForm({ ...form, tarifaCliente: v })} disabled={!empresa} /></Field>
            <Field label="Tarifa auxiliar"><MoneyInput value={form.tarifaAuxiliar} onChange={v => setForm({ ...form, tarifaAuxiliar: v })} disabled={!empresa} /></Field>
            <Field label="Flete conductor" required><MoneyInput value={form.fleteConductor} onChange={v => setForm({ ...form, fleteConductor: v })} disabled={!empresa} /></Field>
            <Field label="Auxiliar pagado"><MoneyInput value={form.auxiliarPagado} onChange={v => setForm({ ...form, auxiliarPagado: v })} disabled={!empresa} /></Field>
            <Field label="Anticipo habitual" className={s.spanAll} hint="Se propone al registrar un viaje con este destino."><MoneyInput value={form.anticipoHabitual} onChange={v => setForm({ ...form, anticipoHabitual: v })} disabled={!empresa} /></Field>
          </div>
          <div className={s.headerActions}>
            <button className={s.btnPrimary} disabled={!empresa || guardando} onClick={() => guardar(false)}><Save size={15} />Guardar</button>
            <button className={s.btnGhost} disabled={!form._id || guardando} onClick={() => guardar(true)}><Edit2 size={15} />Modificar</button>
            <button className={s.btnGhost} onClick={() => setForm(TARIFA_VACIA)}><Eraser size={15} />Limpiar</button>
          </div>
        </div>
      </div>
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONDUCTORES Y VEHÍCULOS
// ══════════════════════════════════════════════════════════════════════════
const FECHAS = ['fechaNacimiento', 'venceLicencia', 'venceSoat', 'venceTecnomecanica'];
const CONDUCTOR_VACIO = {
  nombre: '', cedula: '', fechaNacimiento: '', numeroLicencia: '', categoriaLicencia: '', venceLicencia: '', celular: '',
  direccion: '', departamento: '', ciudad: '', placa: '', pbv: '', pesoVacio: '', venceSoat: '', venceTecnomecanica: '',
  ccTenedor: '', nombreTenedor: '', celTenedor: '', dirTenedor: '', deptoTenedor: '', ciudadTenedor: '',
  cuenta: '', tipoCuenta: '', entidad: '',
};

function edad(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const h = hoyIso().split('-').map(Number);
  let a = h[0] - y;
  if (h[1] < m || (h[1] === m && h[2] < d)) a -= 1;
  return a >= 0 ? `${a} años` : '';
}
function chipVence(fecha) {
  if (!fecha) return <span className={s.mutedText}>—</span>;
  const dias = Math.round((new Date(fecha) - new Date(`${hoyIso()}T00:00:00Z`)) / 86400000);
  if (dias < 0) return <Chip tono="rojo" title={`Venció hace ${-dias} días`}>{fmtFecha(fecha)}</Chip>;
  if (dias <= 30) return <Chip tono="ambar" title={`Vence en ${dias} días`}>{fmtFecha(fecha)}</Chip>;
  return <span className={s.nowrap}>{fmtFecha(fecha)}</span>;
}

function useCiudades(depto) {
  const [ciudades, setCiudades] = useState([]);
  useEffect(() => {
    if (!depto) { setCiudades([]); return; }
    api.get('/logistica/ciudades', { departamento: depto }).then(r => setCiudades(r.ciudades)).catch(() => setCiudades([]));
  }, [depto]);
  return ciudades;
}

function FormConductor({ inicial, departamentos, onClose, onGuardado, toast }) {
  const [f, setF] = useState(() => {
    const base = { ...CONDUCTOR_VACIO, ...(inicial || {}) };
    FECHAS.forEach(k => { base[k] = isoFecha(base[k]); });
    ['pbv', 'pesoVacio'].forEach(k => { base[k] = base[k] ?? ''; });
    return base;
  });
  const [estado, setEstado] = useState(inicial?._id ? `Editando el registro de la placa ${inicial.placa}.` : 'Llene los campos para registrar un conductor nuevo.');
  const [guardando, setGuardando] = useState(false);
  const { confirmar, dialogo } = useConfirm();
  const ciudades = useCiudades(f.departamento);
  const ciudadesT = useCiudades(f.deptoTenedor);
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e?.target ? e.target.value : e }));

  // AutoCedula: si la cédula ya existe copia los datos; si no, nombre del maestro del RNDC
  const autoCedula = async () => {
    if (!f.cedula || f._id || f.nombre) return;
    try {
      const r = await api.get('/logistica/conductores/por-cedula', { cedula: f.cedula });
      if (r.datos) {
        setF(p => ({ ...p, ...r.datos, fechaNacimiento: isoFecha(r.datos.fechaNacimiento) || p.fechaNacimiento, venceLicencia: isoFecha(r.datos.venceLicencia) || p.venceLicencia }));
        setEstado(r.mensaje);
      }
    } catch { /* sin datos */ }
  };
  // AutoTenedor: CC y nombre del tenedor de la placa en el maestro del RNDC
  const autoTenedor = async () => {
    if (!f.placa || f.ccTenedor) return;
    try {
      const r = await api.get('/logistica/conductores/tenedor', { placa: f.placa });
      if (r.datos) {
        setF(p => ({ ...p, ...Object.fromEntries(Object.entries(r.datos).filter(([k, v]) => v && !p[k])), ccTenedor: r.datos.ccTenedor, nombreTenedor: r.datos.nombreTenedor || p.nombreTenedor }));
        setEstado(r.mensaje);
      }
    } catch { /* sin datos */ }
  };

  const guardar = async (confirmarCedula = false) => {
    setGuardando(true);
    try {
      const body = { ...f, confirmarCedula };
      if (f._id) await api.put(`/logistica/conductores/${f._id}`, body);
      else await api.post('/logistica/conductores', body);
      toast.ok(`Conductor ${f._id ? 'actualizado' : 'registrado'} correctamente (también en el maestro del RNDC).`);
      onGuardado();
    } catch (e) {
      if (e.data?.requiereConfirmacion === 'cedula') {
        if (await confirmar({ titulo: 'Cédula', mensaje: e.message, aceptar: 'Guardar de todas formas' })) { setGuardando(false); guardar(true); return; }
      } else toast.error(e.message);
    } finally { setGuardando(false); }
  };

  const depSelect = (k, kc, lista) => (
    <>
      <Field label="Departamento"><select className={s.select} value={f[k]} onChange={e => setF(p => ({ ...p, [k]: e.target.value, [kc]: '' }))}><option value="">—</option>{departamentos.map(d => <option key={d}>{d}</option>)}</select></Field>
      <Field label="Ciudad"><select className={s.select} value={f[kc]} onChange={set(kc)} disabled={!f[k]}><option value="">—</option>{lista.map(c => <option key={c}>{c}</option>)}{f[kc] && !lista.includes(f[kc]) && <option>{f[kc]}</option>}</select></Field>
    </>
  );

  return (
    <Modal open onClose={onClose} size="lg" title={f._id ? 'Editar conductor y vehículo' : 'Registrar conductor y vehículo'} subtitle={estado} icon={UserCog}
      footer={<><button className={s.btnGhost} onClick={onClose}>Cancelar</button><button className={s.btnPrimary} disabled={guardando} onClick={() => guardar(false)}>{guardando ? <Loader size={15} className={s.spin} /> : <Save size={15} />}{f._id ? 'Actualizar' : 'Guardar'}</button></>}>
      <div className={s.stack} style={{ gap: 14 }}>
        <div className={s.formSection}>
          <p className={s.formSectionTitle}><User size={14} />Conductor</p>
          <div className={s.formGrid3}>
            <Field label="Nombre completo" required className={s.span2}><input className={s.input} value={f.nombre} onChange={set('nombre')} autoFocus /></Field>
            <Field label="Cédula" hint="Al salir del campo se completan los datos si ya existe."><input className={s.input} value={f.cedula} onChange={set('cedula')} onBlur={autoCedula} inputMode="numeric" /></Field>
            <Field label="Fecha de nacimiento" hint={edad(f.fechaNacimiento)}><input type="date" className={s.input} value={f.fechaNacimiento} onChange={set('fechaNacimiento')} /></Field>
            <Field label="N° licencia"><input className={s.input} value={f.numeroLicencia} onChange={set('numeroLicencia')} /></Field>
            <Field label="Categoría"><input className={s.input} value={f.categoriaLicencia} onChange={set('categoriaLicencia')} placeholder="C2" /></Field>
            <Field label="Vence licencia"><input type="date" className={s.input} value={f.venceLicencia} onChange={set('venceLicencia')} /></Field>
            <Field label="Celular"><input className={s.input} value={f.celular} onChange={set('celular')} inputMode="tel" /></Field>
            <Field label="Dirección"><input className={s.input} value={f.direccion} onChange={set('direccion')} /></Field>
            {depSelect('departamento', 'ciudad', ciudades)}
          </div>
        </div>
        <div className={s.formSection}>
          <p className={s.formSectionTitle}><Truck size={14} />Vehículo</p>
          <div className={s.formGrid3}>
            <Field label="Placa" required hint="Al salir del campo se busca el tenedor en el RNDC."><input className={s.input} value={f.placa} onChange={e => setF(p => ({ ...p, placa: e.target.value.toUpperCase().replace(/\s/g, '') }))} onBlur={autoTenedor} /></Field>
            <Field label="PBV (kg)" hint="Peso bruto vehicular. FOPAT aplica si supera 10.500."><input className={s.input} value={f.pbv} onChange={set('pbv')} inputMode="numeric" /></Field>
            <Field label="Peso vacío (kg)"><input className={s.input} value={f.pesoVacio} onChange={set('pesoVacio')} inputMode="numeric" /></Field>
            <Field label="Vence SOAT"><input type="date" className={s.input} value={f.venceSoat} onChange={set('venceSoat')} /></Field>
            <Field label="Vence revisión tecnomecánica"><input type="date" className={s.input} value={f.venceTecnomecanica} onChange={set('venceTecnomecanica')} /></Field>
          </div>
        </div>
        <div className={s.formSection}>
          <p className={s.formSectionTitle}><User size={14} />Tenedor / titular del vehículo</p>
          <div className={s.formGrid3}>
            <Field label="CC tenedor"><input className={s.input} value={f.ccTenedor} onChange={set('ccTenedor')} /></Field>
            <Field label="Nombre tenedor" className={s.span2}><input className={s.input} value={f.nombreTenedor} onChange={set('nombreTenedor')} /></Field>
            <Field label="Celular tenedor"><input className={s.input} value={f.celTenedor} onChange={set('celTenedor')} /></Field>
            <Field label="Dirección tenedor" className={s.span2}><input className={s.input} value={f.dirTenedor} onChange={set('dirTenedor')} /></Field>
            {depSelect('deptoTenedor', 'ciudadTenedor', ciudadesT)}
          </div>
        </div>
        <div className={s.formSection}>
          <p className={s.formSectionTitle}><CreditCard size={14} />Datos de pago</p>
          <div className={s.formGrid3}>
            <Field label="N° de cuenta"><input className={s.input} value={f.cuenta} onChange={set('cuenta')} /></Field>
            <Field label="Tipo de cuenta"><select className={s.select} value={f.tipoCuenta} onChange={set('tipoCuenta')}><option value="">—</option><option>Ahorros</option><option>Corriente</option></select></Field>
            <Field label="Entidad"><input className={s.input} value={f.entidad} onChange={set('entidad')} /></Field>
          </div>
        </div>
      </div>
      {dialogo}
    </Modal>
  );
}

function Conductores({ toast }) {
  const [q, setQ] = useState('');
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/logistica/conductores'), []);
  const [deps, setDeps] = useState([]);
  const [editando, setEditando] = useState(null);
  const { confirmar, dialogo } = useConfirm();
  useEffect(() => { api.get('/logistica/departamentos').then(r => setDeps(r.departamentos)).catch(() => {}); }, []);
  const lista = useMemo(() => {
    const t = q.toLowerCase();
    return (datos?.conductores || []).filter(c => !t || [c.nombre, c.placa, c.cedula, c.nombreTenedor].some(v => String(v || '').toLowerCase().includes(t)));
  }, [datos, q]);
  const desactivar = async (c) => {
    if (!(await confirmar({ titulo: 'Desactivar conductor', mensaje: `¿Desactivar a ${c.nombre} (${c.placa})? Deja de aparecer en las listas; sus viajes se conservan.`, aceptar: 'Desactivar', peligro: true }))) return;
    try { await api.del(`/logistica/conductores/${c._id}`); toast.ok('Conductor desactivado.'); recargar(); } catch (e) { toast.error(e.message); }
  };
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}><UserCog size={17} />Conductores y vehículos</h3>
          <p className={s.cardSub}>Base para autocompletar la placa en la bitácora, el transportador en la relación de fletes y las cédulas del RNDC.</p>
        </div>
        <button className={s.btnPrimary} onClick={() => setEditando({})}><Plus size={15} />Nuevo conductor</button>
      </div>
      <div className={s.toolbar}>
        <div className={cx(s.searchBox, s.toolbarGrow)}><Search size={14} /><input className={s.input} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, placa, cédula o tenedor" /></div>
        <span className={s.mutedText}>{lista.length} registro(s)</span>
      </div>
      {cargando ? <Loading /> : error ? <Alerta tipo="error">{error}</Alerta> : !lista.length ? <Empty texto="No hay conductores que coincidan." /> : (
        <div className={cx(s.tableWrap, s.scrollY)}>
          <table className={s.table}>
            <thead><tr><th>Conductor</th><th>Placa</th><th>Cédula</th><th>Celular</th><th>Vence licencia</th><th>Vence SOAT</th><th>Vence tecnomecánica</th><th className={s.num}>PBV</th><th>Tenedor</th><th /></tr></thead>
            <tbody>
              {lista.map(c => (
                <tr key={c._id}>
                  <td className={s.strong}>{c.nombre}</td>
                  <td className={s.mono}>{c.placa}</td>
                  <td className={s.mono}>{c.cedula || <Chip tono="ambar">Sin cédula</Chip>}</td>
                  <td>{c.celular}</td>
                  <td>{chipVence(c.venceLicencia)}</td>
                  <td>{chipVence(c.venceSoat)}</td>
                  <td>{chipVence(c.venceTecnomecanica)}</td>
                  <td className={s.num}>{c.pbv ? c.pbv.toLocaleString('es-CO') : '—'}</td>
                  <td>{c.nombreTenedor}</td>
                  <td className={s.nowrap}>
                    <button className={s.iconBtn} title="Editar" onClick={() => setEditando(c)}><Edit2 size={14} /></button>{' '}
                    <button className={cx(s.iconBtn, s.iconBtnDanger)} title="Desactivar" onClick={() => desactivar(c)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && <FormConductor inicial={editando._id ? editando : null} departamentos={deps} toast={toast} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); recargar(); }} />}
      {dialogo}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// IMPORTAR PLANTILLA
// ══════════════════════════════════════════════════════════════════════════
const ETIQUETAS_IMPORT = {
  empresas: 'Empresas', tarifas: 'Tarifas', conductores: 'Conductores', bitacora: 'Viajes de la bitácora', relacion: 'Cargues de la relación',
  variables: 'Variables RNDC', maestrosRndc: 'Maestros RNDC', sedes: 'Sedes RNDC', dane: 'Municipios DANE', alias: 'Alias de destinos',
  rndcViajes: 'Viajes RNDC', rndcLog: 'Registro RNDC', pdfEnviados: 'PDF de manifiestos enviados', registroEnvios: 'Registro de envíos', rndcConfig: 'Configuración RNDC',
};
function ImportarPlantilla({ toast }) {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const importar = async () => {
    if (!archivo) { toast.error('Selecciona el archivo de Excel (.xlsm o .xlsx).'); return; }
    setCargando(true); setResultado(null);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const r = await api.upload('/logistica/importar', form);
      setResultado(r.resultado);
      toast.ok('Importación terminada.');
    } catch (e) { toast.error(e.message); } finally { setCargando(false); }
  };
  return (
    <div className={s.card} style={{ maxWidth: 760 }}>
      <h3 className={s.cardTitle}><FileSpreadsheet size={17} />Importar la plantilla de viajes (Excel)</h3>
      <p className={s.cardSub} style={{ marginBottom: 14 }}>Carga empresas, correos, tarifas, conductores, bitácora, relación de fletes y toda la información del RNDC desde PLANTILLA_DE_VIAJES_FORMULARIO.xlsm.</p>
      <Alerta tipo="info">La importación <b>no borra ni sobrescribe</b> nada: solo agrega lo que falta y completa campos vacíos. Puede repetirse sin duplicar registros.</Alerta>
      <div className={s.toolbar}>
        <input type="file" accept=".xlsm,.xlsx" className={s.input} style={{ maxWidth: 420 }} onChange={e => setArchivo(e.target.files?.[0] || null)} />
        <button className={s.btnPrimary} disabled={!archivo || cargando} onClick={importar}>{cargando ? <Loader size={15} className={s.spin} /> : <Upload size={15} />}Importar</button>
      </div>
      {resultado && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Información</th><th>Resultado</th></tr></thead>
            <tbody>
              {Object.entries(resultado).map(([k, v]) => (
                <tr key={k}><td className={s.strong}>{ETIQUETAS_IMPORT[k] || k}</td>
                  <td>{typeof v === 'string' ? v : Object.entries(v).map(([a, b]) => `${a}: ${b}`).join(' · ')}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: 10 }}><Chip tono="verde"><CheckCircle size={12} />Datos disponibles en todos los módulos</Chip></div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function MaestrosLogistica() {
  const [tab, setTab] = useState('empresas');
  const { toasts, remove, toast } = useToast();
  const tabs = [
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'tarifas', label: 'Tarifas y destinos', icon: Route },
    { id: 'conductores', label: 'Conductores y vehículos', icon: UserCog },
    { id: 'importar', label: 'Importar plantilla', icon: Upload },
  ];
  return (
    <div className={s.wrap}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Maestros de logística</h1>
          <p className={s.pageSub}>Empresas cliente, tarifas por destino y la base de conductores y vehículos que usan la bitácora, la relación de fletes y el RNDC.</p>
        </div>
      </div>
      <Tabs tabs={tabs} activo={tab} onChange={setTab} />
      <div className={s.tabContent}>
        {tab === 'empresas' && <Empresas toast={toast} />}
        {tab === 'tarifas' && <Tarifas toast={toast} />}
        {tab === 'conductores' && <Conductores toast={toast} />}
        {tab === 'importar' && <ImportarPlantilla toast={toast} />}
      </div>
      <Toasts toasts={toasts} remove={remove} />
    </div>
  );
}
