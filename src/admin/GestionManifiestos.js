// src/admin/GestionManifiestos.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Trash2, Save, RefreshCw, Search, X, Truck,
    CheckCircle, AlertCircle, Edit2, Car, ClipboardList,
    MapPin, DollarSign, User, FileText, Building2, ArrowLeft,
} from 'lucide-react';
import styles from './GestionManifiestos.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';
const token = () => localStorage.getItem('token');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '$0';
const parseMoney = (val) => Number((val || '').toString().replace(/\./g, '').replace(',', '.')) || 0;

// ── Toast ─────────────────────────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);
    const add = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
    }, []);
    const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
    return { toasts, add, remove };
}

function Toasts({ toasts, remove }) {
    return (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', borderRadius: 10,
                    background: t.type === 'success' ? '#f0fdf4' : t.type === 'error' ? '#fff1f2' : '#eff6ff',
                    border: `1.5px solid ${t.type === 'success' ? '#86efac' : t.type === 'error' ? '#fca5a5' : '#93c5fd'}`,
                    color: t.type === 'success' ? '#166534' : t.type === 'error' ? '#991b1b' : '#1e40af',
                    fontSize: 13, fontWeight: 500, maxWidth: 360,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}>
                    {t.type === 'success' && <CheckCircle size={15} />}
                    {t.type === 'error' && <AlertCircle size={15} />}
                    <span style={{ flex: 1 }}>{t.message}</span>
                    <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}><X size={13} /></button>
                </div>
            ))}
        </div>
    );
}

// ── Autocomplete municipio ────────────────────────────────────────────────
function MunicipioInput({ value, onChange, placeholder, disabled, style }) {
    const [sugerencias, setSugerencias] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const timer = useRef(null);

    const buscar = useCallback(async (q) => {
        if (q.length < 2) { setSugerencias([]); setOpen(false); return; }
        try {
            const res = await fetch(`${API_URL}/manifiestos/municipios?q=${encodeURIComponent(q)}`, { headers: hdrs() });
            const data = await res.json();
            setSugerencias(data.municipios || []);
            setOpen((data.municipios || []).length > 0);
        } catch { setSugerencias([]); }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value.toUpperCase();
        onChange(val);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => buscar(val), 250);
    };

    const select = (m) => { onChange(m); setSugerencias([]); setOpen(false); };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            <input value={value} onChange={handleChange} placeholder={placeholder} disabled={disabled}
                style={{ ...style, width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: '#fff', border: '1.5px solid #d0d5dd', borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
                }}>
                    {sugerencias.map(m => (
                        <div key={m} onMouseDown={() => select(m)}
                            style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#1a2236', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                            {m}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Autocomplete placa ────────────────────────────────────────────────────
function PlacaInput({ value, onChange, onSelectVehiculo, placeholder, disabled, style }) {
    const [sugerencias, setSugerencias] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const timer = useRef(null);

    const buscar = useCallback(async (q) => {
        if (q.length < 2) { setSugerencias([]); setOpen(false); return; }
        try {
            const res = await fetch(`${API_URL}/manifiestos/vehiculos/buscar?placa=${encodeURIComponent(q)}`, { headers: hdrs() });
            const data = await res.json();
            setSugerencias(data.vehiculos || []);
            setOpen((data.vehiculos || []).length > 0);
        } catch { setSugerencias([]); }
    }, []);

    const handleChange = (e) => {
        const val = e.target.value.toUpperCase();
        onChange(val);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => buscar(val), 250);
    };

    const select = (v) => { onSelectVehiculo(v); setSugerencias([]); setOpen(false); };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            <input value={value} onChange={handleChange} placeholder={placeholder} disabled={disabled}
                style={{ ...style, width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: '#fff', border: '1.5px solid #d0d5dd', borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 260, overflowY: 'auto',
                }}>
                    {sugerencias.map(v => (
                        <div key={v._id} onMouseDown={() => select(v)}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2236' }}>{v.placa}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{v.nombreConductor} · {v.nombreTitular}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Money input ───────────────────────────────────────────────────────────
function MoneyInput({ value, onChange, placeholder, disabled, style }) {
    const handleChange = (e) => {
        const soloDigitos = e.target.value.replace(/\D/g, '');
        const conPuntos = soloDigitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        onChange(conPuntos);
    };
    return (
        <input value={value} onChange={handleChange} placeholder={placeholder || '0'}
            disabled={disabled}
            style={{ ...style, width: '100%', boxSizing: 'border-box' }} />
    );
}

// ── Vehículo vacío ────────────────────────────────────────────────────────
const VEHICULO_VACIO = (remesa = '', manifiesto = '') => ({
    _key: Date.now() + Math.random(),
    placa: '', nombreConductor: '', cedulaConductor: '',
    nombreTitular: '', cedulaTitular: '',
    destino: '', valorFlete: '', valorAnticipo: '', ajuste: '',
    numeroRemesa: remesa, numeroManifiesto: manifiesto,
    _loading: false, _saved: false, _error: '',
});

// ── Formulario compacto de un vehículo ───────────────────────────────────
function VehiculoForm({ veh, idx, onChange, onRemove, totalVehiculos, inputStyle }) {
    const handlePlacaSelect = (v) => {
        onChange(idx, 'placa', v.placa);
        onChange(idx, 'nombreConductor', v.nombreConductor);
        onChange(idx, 'cedulaConductor', v.cedulaConductor);
        onChange(idx, 'nombreTitular', v.nombreTitular);
        onChange(idx, 'cedulaTitular', v.cedulaTitular);
    };

    const saldo = (() => {
        const f = parseMoney(veh.valorFlete);
        const a = parseMoney(veh.valorAnticipo);
        const aj = parseMoney(veh.ajuste);
        return f - a + aj;
    })();

    const lbl = {
        fontSize: 10, fontWeight: 700, color: '#6b7280',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        marginBottom: 3, display: 'block',
    };

    const compactInput = {
        ...inputStyle,
        padding: '7px 10px',
        fontSize: 13,
    };

    return (
        <div className={styles.vehCard}>
            {/* Cabecera */}
            <div className={styles.vehCardHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className={styles.vehBadgeNum}>{idx + 1}</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a2236', lineHeight: 1.2 }}>
                            {veh.placa || `Vehículo ${idx + 1}`}
                        </div>
                        {veh.nombreConductor && (
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{veh.nombreConductor}</div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {parseMoney(veh.valorFlete) > 0 && (
                        <div className={styles.saldoChip}>Saldo: {fmtMoney(saldo)}</div>
                    )}
                    {totalVehiculos > 1 && (
                        <button onClick={() => onRemove(idx)} className={styles.btnRemoveVeh} title="Eliminar">
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Body compacto */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Fila 1: Remesa + Manifiesto */}
                <div className={styles.compactRow}>
                    <div className={styles.compactField}>
                        <label style={lbl}><FileText size={9} style={{ display: 'inline', marginRight: 3 }} />Remesa</label>
                        <input
                            value={veh.numeroRemesa}
                            onChange={e => onChange(idx, 'numeroRemesa', e.target.value.toUpperCase())}
                            placeholder="R00000001"
                            style={{ ...compactInput, fontFamily: 'monospace' }}
                        />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}><FileText size={9} style={{ display: 'inline', marginRight: 3 }} />Manifiesto</label>
                        <input
                            value={veh.numeroManifiesto}
                            onChange={e => onChange(idx, 'numeroManifiesto', e.target.value.toUpperCase())}
                            placeholder="M00000001"
                            style={{ ...compactInput, fontFamily: 'monospace' }}
                        />
                    </div>
                </div>

                {/* Fila 2: Placa + Destino */}
                <div className={styles.compactRow}>
                    <div className={styles.compactField}>
                        <label style={lbl}><Car size={9} style={{ display: 'inline', marginRight: 3 }} />Placa *</label>
                        <PlacaInput value={veh.placa} onChange={val => onChange(idx, 'placa', val)}
                            onSelectVehiculo={handlePlacaSelect} placeholder="ABC123" style={compactInput} />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}><MapPin size={9} style={{ display: 'inline', marginRight: 3 }} />Destino *</label>
                        <MunicipioInput value={veh.destino} onChange={val => onChange(idx, 'destino', val)}
                            placeholder="Buscar municipio…" style={compactInput} />
                    </div>
                </div>

                {/* Fila 3: Conductor nombre + cédula */}
                <div className={styles.compactRow}>
                    <div className={styles.compactField} style={{ flex: 2 }}>
                        <label style={lbl}><User size={9} style={{ display: 'inline', marginRight: 3 }} />Conductor *</label>
                        <input value={veh.nombreConductor}
                            onChange={e => onChange(idx, 'nombreConductor', e.target.value.toUpperCase())}
                            placeholder="Nombre del conductor"
                            style={{ ...compactInput, textTransform: 'uppercase' }} />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}>Cédula *</label>
                        <input value={veh.cedulaConductor}
                            onChange={e => onChange(idx, 'cedulaConductor', e.target.value)}
                            placeholder="Número" style={compactInput} />
                    </div>
                </div>

                {/* Fila 4: Titular nombre + cédula */}
                <div className={styles.compactRow}>
                    <div className={styles.compactField} style={{ flex: 2 }}>
                        <label style={lbl}><User size={9} style={{ display: 'inline', marginRight: 3 }} />Propietario *</label>
                        <input value={veh.nombreTitular}
                            onChange={e => onChange(idx, 'nombreTitular', e.target.value.toUpperCase())}
                            placeholder="Nombre del propietario"
                            style={{ ...compactInput, textTransform: 'uppercase' }} />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}>Cédula *</label>
                        <input value={veh.cedulaTitular}
                            onChange={e => onChange(idx, 'cedulaTitular', e.target.value)}
                            placeholder="Número" style={compactInput} />
                    </div>
                </div>

                {/* Fila 5: Valores */}
                <div className={styles.compactRow}>
                    <div className={styles.compactField}>
                        <label style={lbl}><DollarSign size={9} style={{ display: 'inline', marginRight: 3 }} />Flete *</label>
                        <MoneyInput value={veh.valorFlete} onChange={val => onChange(idx, 'valorFlete', val)} placeholder="0" style={compactInput} />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}>Anticipo</label>
                        <MoneyInput value={veh.valorAnticipo} onChange={val => onChange(idx, 'valorAnticipo', val)} placeholder="0" style={compactInput} />
                    </div>
                    <div className={styles.compactField}>
                        <label style={lbl}>Ajuste</label>
                        <MoneyInput value={veh.ajuste} onChange={val => onChange(idx, 'ajuste', val)} placeholder="0" style={compactInput} />
                    </div>
                </div>

                {/* Resumen de valores */}
                {parseMoney(veh.valorFlete) > 0 && (
                    <div className={styles.valoresResumen}>
                        <span>Flete: <strong>{fmtMoney(parseMoney(veh.valorFlete))}</strong></span>
                        <span>− Anticipo: <strong>{fmtMoney(parseMoney(veh.valorAnticipo))}</strong></span>
                        {parseMoney(veh.ajuste) !== 0 && <span>± Ajuste: <strong>{fmtMoney(parseMoney(veh.ajuste))}</strong></span>}
                        <span className={styles.saldoFinal}>Saldo: <strong>{fmtMoney(saldo)}</strong></span>
                    </div>
                )}

                {/* Error */}
                {veh._error && (
                    <div className={styles.errorBox}>
                        <AlertCircle size={13} /> {veh._error}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Modal Bodega (crear / editar) ─────────────────────────────────────────
function BodegaModal({ bodega, onClose, onSaved, toast }) {
    const isEdit = !!bodega;
    const [nombre, setNombre] = useState(bodega?.nombre || '');
    const [nit, setNit] = useState(bodega?.nit || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!nombre.trim()) { toast.add('El nombre es requerido', 'error'); return; }
        setSaving(true);
        try {
            const url = isEdit
                ? `${API_URL}/manifiestos/bodegas/${bodega._id}`
                : `${API_URL}/manifiestos/bodegas`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: hdrs(),
                body: JSON.stringify({ nombre: nombre.trim().toUpperCase(), nit: nit.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al guardar');
            toast.add(isEdit ? 'Bodega actualizada' : 'Bodega creada');
            onSaved(data.bodega);
        } catch (e) {
            toast.add(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d5dd',
        fontSize: 13, color: '#1a2236', outline: 'none',
        width: '100%', boxSizing: 'border-box',
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHead}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1a2236' }}>
                        {isEdit ? 'Editar bodega' : 'Nueva bodega'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Nombre *</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())}
                            placeholder="Nombre de la bodega" style={inputStyle}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>NIT</label>
                        <input value={nit} onChange={e => setNit(e.target.value)}
                            placeholder="Ej: 900123456-7" style={inputStyle}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} />
                    </div>
                </div>
                <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose}
                        style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: saving ? '#9ca3af' : '#1a2236', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? <><RefreshCw size={13} className={styles.spin} /> Guardando…</> : <><Save size={13} /> Guardar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   NUEVA SESIÓN — flujo en dos pantallas
══════════════════════════════════════════════════════════════════════════ */
function NuevaSesion({ toast }) {
    const [pantalla, setPantalla] = useState('selector');
    const [bodegas, setBodegas] = useState([]);
    const [loadingBodegas, setLoadingBodegas] = useState(true);
    const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null);
    const [vehiculos, setVehiculos] = useState([]);
    const [guardandoTodo, setGuardandoTodo] = useState(false);
    const [modalBodega, setModalBodega] = useState(null);

    const inputStyle = {
        padding: '8px 11px', borderRadius: 8, border: '1.5px solid #d0d5dd',
        fontSize: 13, color: '#1a2236', outline: 'none', background: '#fff',
    };

    const fetchBodegas = useCallback(async () => {
        setLoadingBodegas(true);
        try {
            const res = await fetch(`${API_URL}/manifiestos/bodegas`, { headers: hdrs() });
            const data = await res.json();
            setBodegas(data.bodegas || []);
        } catch { toast.add('Error al cargar bodegas', 'error'); }
        finally { setLoadingBodegas(false); }
    }, []);

    useEffect(() => { fetchBodegas(); }, [fetchBodegas]);

    const fetchSiguienteNumero = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/manifiestos/siguiente-numero`, { headers: hdrs() });
            const data = await res.json();
            if (data.success) return {
                numeroRemesa: data.numeroRemesa,
                numeroManifiesto: data.numeroManifiesto,
                secuencia: data.secuencia,
            };
        } catch { }
        return { numeroRemesa: '', numeroManifiesto: '', secuencia: 0 };
    }, []);

    // ── NUEVO: al seleccionar bodega, obtiene el siguiente número del backend
    const handleSeleccionarBodega = async (bodega) => {
        setBodegaSeleccionada(bodega);
        const nums = await fetchSiguienteNumero();
        setVehiculos([VEHICULO_VACIO(nums.numeroRemesa, nums.numeroManifiesto)]);
        setPantalla('formulario');
    };

    // ── NUEVO: handleVehChange sincroniza remesa ↔ manifiesto automáticamente
    const handleVehChange = (idx, field, value) => {
        setVehiculos(prev => {
            const next = [...prev];
            const veh = { ...next[idx], [field]: value };

            if (field === 'numeroRemesa') {
                // Mantiene la R que el usuario escribe; extrae solo dígitos del resto
                const sinPrefijo = value.startsWith('R') ? value.slice(1) : value;
                const soloDigitos = sinPrefijo.replace(/\D/g, '');
                veh.numeroRemesa = `R${soloDigitos}`;
                veh.numeroManifiesto = `M${soloDigitos}`;
            } else if (field === 'numeroManifiesto') {
                // Mantiene la M que el usuario escribe; extrae solo dígitos del resto
                const sinPrefijo = value.startsWith('M') ? value.slice(1) : value;
                const soloDigitos = sinPrefijo.replace(/\D/g, '');
                veh.numeroRemesa = `R${soloDigitos}`;
                veh.numeroManifiesto = `M${soloDigitos}`;
            }

            next[idx] = veh;
            return next;
        });
    };

    const handleAddVehiculo = () => {
        setVehiculos(prev => {
            const ultimoVeh = prev[prev.length - 1];
            const ultimaRemesa = ultimoVeh?.numeroRemesa || 'R00000000';
            const digitos = ultimaRemesa.replace(/\D/g, '');
            const siguiente = parseInt(digitos, 10) + 1;
            const pad = String(siguiente).padStart(digitos.length || 8, '0');
            return [...prev, VEHICULO_VACIO(`R${pad}`, `M${pad}`)];
        });
    };

    const handleRemoveVehiculo = (idx) => {
        if (vehiculos.length === 1) return;
        setVehiculos(prev => prev.filter((_, i) => i !== idx));
    };

    const handleGuardarTodo = async () => {
        let hayError = false;
        const validados = vehiculos.map(veh => {
            if (!veh.placa || !veh.nombreConductor || !veh.cedulaConductor ||
                !veh.nombreTitular || !veh.cedulaTitular || !veh.destino || !veh.valorFlete) {
                hayError = true;
                return { ...veh, _error: 'Completa todos los campos obligatorios (*)' };
            }
            return { ...veh, _error: '' };
        });
        if (hayError) {
            setVehiculos(validados);
            toast.add('Hay campos obligatorios sin completar', 'error');
            return;
        }

        setGuardandoTodo(true);
        let guardados = 0;
        let errores = 0;

        const resultados = [...vehiculos];
        for (let idx = 0; idx < vehiculos.length; idx++) {
            const veh = vehiculos[idx];
            resultados[idx] = { ...resultados[idx], _loading: true };
            setVehiculos([...resultados]);
            try {
                const body = {
                    bodegaNombre: bodegaSeleccionada.nombre,
                    placa: veh.placa,
                    nombreConductor: veh.nombreConductor,
                    cedulaConductor: veh.cedulaConductor,
                    nombreTitular: veh.nombreTitular,
                    cedulaTitular: veh.cedulaTitular,
                    destino: veh.destino,
                    valorFlete: parseMoney(veh.valorFlete),
                    valorAnticipo: parseMoney(veh.valorAnticipo),
                    ajuste: parseMoney(veh.ajuste),
                    numeroRemesa: veh.numeroRemesa || undefined,
                    numeroManifiesto: veh.numeroManifiesto || undefined,
                };
                const res = await fetch(`${API_URL}/manifiestos/reportes`, {
                    method: 'POST', headers: hdrs(), body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Error al guardar');
                resultados[idx] = { ...resultados[idx], _loading: false, _saved: true, _error: '' };
                guardados++;
            } catch (e) {
                resultados[idx] = { ...resultados[idx], _loading: false, _error: e.message };
                errores++;
            }
            setVehiculos([...resultados]);
        }

        setGuardandoTodo(false);

        if (errores === 0) {
            toast.add(`✓ ${guardados} vehículo${guardados !== 1 ? 's' : ''} registrado${guardados !== 1 ? 's' : ''} en ${bodegaSeleccionada.nombre}`);
            setPantalla('selector');
            setBodegaSeleccionada(null);
            setVehiculos([]);
        } else {
            toast.add(`${guardados} guardado${guardados !== 1 ? 's' : ''}, ${errores} con error`, errores > 0 ? 'error' : 'success');
        }
    };

    const handleDeleteBodega = async (bodega) => {
        if (!window.confirm(`¿Eliminar la bodega "${bodega.nombre}"?`)) return;
        try {
            await fetch(`${API_URL}/manifiestos/bodegas/${bodega._id}`, { method: 'DELETE', headers: hdrs() });
            toast.add('Bodega eliminada');
            fetchBodegas();
        } catch { toast.add('Error al eliminar', 'error'); }
    };

    const handleBodegaSaved = () => {
        setModalBodega(null);
        fetchBodegas();
    };

    // ── PANTALLA SELECTOR ─────────────────────────────────────────────────
    if (pantalla === 'selector') {
        return (
            <div>
                {modalBodega && (
                    <BodegaModal
                        bodega={modalBodega === 'nueva' ? null : modalBodega}
                        onClose={() => setModalBodega(null)}
                        onSaved={handleBodegaSaved}
                        toast={toast}
                    />
                )}

                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1a2236' }}>Selecciona una bodega</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Elige la bodega de origen para este registro</p>
                    </div>
                    <button onClick={() => setModalBodega('nueva')} className={styles.btnPrimary}>
                        <Plus size={14} /> Nueva bodega
                    </button>
                </div>

                {loadingBodegas ? (
                    <div className={styles.loadingBox}><RefreshCw size={18} className={styles.spin} /><span>Cargando bodegas…</span></div>
                ) : bodegas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                        <Building2 size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: 13 }}>No hay bodegas registradas</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Crea una bodega para comenzar</p>
                    </div>
                ) : (
                    <div className={styles.bodegasGrid}>
                        {bodegas.map(b => (
                            <div key={b._id} className={styles.bodegaCard}>
                                <div className={styles.bodegaCardContent} onClick={() => handleSeleccionarBodega(b)}>
                                    <div className={styles.bodegaIcon}>
                                        <Building2 size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2236', lineHeight: 1.2 }}>{b.nombre}</div>
                                        {b.nit && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>NIT: {b.nit}</div>}
                                    </div>
                                </div>
                                <div className={styles.bodegaCardActions}>
                                    <button onClick={() => setModalBodega(b)} className={styles.bodegaActionBtn} title="Editar">
                                        <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => handleDeleteBodega(b)} className={`${styles.bodegaActionBtn} ${styles.bodegaActionBtnDanger}`} title="Eliminar">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── PANTALLA FORMULARIO ───────────────────────────────────────────────
    return (
        <div>
            <div className={styles.formularioHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => { setPantalla('selector'); setBodegaSeleccionada(null); setVehiculos([]); }}
                        className={styles.btnBack}>
                        <ArrowLeft size={14} /> Bodegas
                    </button>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2236' }}>{bodegaSeleccionada.nombre}</div>
                        {bodegaSeleccionada.nit && <div style={{ fontSize: 11, color: '#6b7280' }}>NIT: {bodegaSeleccionada.nit}</div>}
                    </div>
                </div>
                <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                    {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''}
                </span>
            </div>

            {vehiculos.map((veh, idx) => (
                <VehiculoForm
                    key={veh._key}
                    veh={veh} idx={idx}
                    onChange={handleVehChange}
                    onRemove={handleRemoveVehiculo}
                    totalVehiculos={vehiculos.length}
                    inputStyle={inputStyle}
                />
            ))}

            <div className={styles.formularioFooter}>
                <button onClick={handleAddVehiculo} className={styles.btnAddVeh}>
                    <Plus size={14} /> Agregar otro vehículo
                </button>
                <button onClick={handleGuardarTodo} disabled={guardandoTodo} className={styles.btnGuardarTodo}
                    style={{ opacity: guardandoTodo ? 0.7 : 1, cursor: guardandoTodo ? 'not-allowed' : 'pointer' }}>
                    {guardandoTodo
                        ? <><RefreshCw size={14} className={styles.spin} /> Guardando…</>
                        : <><Save size={14} /> Guardar registro</>}
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   REPORTES REGISTRADOS
══════════════════════════════════════════════════════════════════════════ */
function ReportesRegistrados({ toast }) {
    const [reportes, setReportes] = useState([]);
    const [bodegas, setBodegas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroBodega, setFiltroBodega] = useState('todas');

    const inputStyle = {
        padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d5dd',
        fontSize: 13, color: '#1a2236', outline: 'none', background: '#fff',
    };

    const fetchBodegas = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/manifiestos/bodegas`, { headers: hdrs() });
            const data = await res.json();
            setBodegas(data.bodegas || []);
        } catch { }
    }, []);

    const fetchReportes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
            if (filtroBodega !== 'todas') params.append('bodega', filtroBodega);
            const res = await fetch(`${API_URL}/manifiestos/reportes?${params}`, { headers: hdrs() });
            const data = await res.json();
            setReportes(data.reportes || []);
        } catch { toast.add('Error al cargar reportes', 'error'); }
        finally { setLoading(false); }
    }, [filtroEstado, filtroBodega]);

    useEffect(() => { fetchBodegas(); }, [fetchBodegas]);
    useEffect(() => { fetchReportes(); }, [fetchReportes]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este reporte?')) return;
        try {
            await fetch(`${API_URL}/manifiestos/reportes/${id}`, { method: 'DELETE', headers: hdrs() });
            toast.add('Reporte eliminado');
            fetchReportes();
        } catch { toast.add('Error al eliminar', 'error'); }
    };

    const estadoBadge = (estado) => {
        const cfg = {
            pendiente: { bg: '#fef9c3', color: '#92400e', label: 'Pendiente' },
            en_proceso: { bg: '#dbeafe', color: '#1e40af', label: 'En proceso' },
            completado: { bg: '#dcfce7', color: '#15803d', label: 'Completado' },
        };
        const c = cfg[estado] || cfg.pendiente;
        return <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>{c.label}</span>;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h2 className={styles.sectionTitle}>Reportes Registrados</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Historial completo de manifiestos</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}>
                        <option value="todos">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="completado">Completado</option>
                    </select>
                    <select value={filtroBodega} onChange={e => setFiltroBodega(e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}>
                        <option value="todas">Todas las bodegas</option>
                        {bodegas.map(b => <option key={b._id} value={b.nombre}>{b.nombre}</option>)}
                    </select>
                    <button onClick={fetchReportes}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer' }}>
                        <RefreshCw size={13} className={loading ? styles.spin : ''} />
                    </button>
                </div>
            </div>

            <div className={styles.reportesSection}>
                {reportes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                            {reportes.length} reporte{reportes.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className={styles.loadingBox}><RefreshCw size={20} className={styles.spin} /><span>Cargando reportes…</span></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Remesa</th><th>Manifiesto</th><th>Bodega</th>
                                    <th>Placa</th><th>Conductor</th><th>Destino</th>
                                    <th>Flete</th><th>Anticipo</th><th>Estado</th>
                                    <th>Tomado por</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportes.map(r => (
                                    <tr key={r._id}>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a2236' }}>{r.numeroRemesa}</span></td>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a2236' }}>{r.numeroManifiesto}</span></td>
                                        <td><span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>{r.bodegaNombre}</span></td>
                                        <td><strong>{r.placa}</strong></td>
                                        <td style={{ fontSize: 12 }}>{r.nombreConductor}</td>
                                        <td style={{ fontSize: 12 }}>{r.destino}</td>
                                        <td style={{ fontSize: 12 }}>{fmtMoney(r.valorFlete)}</td>
                                        <td style={{ fontSize: 12 }}>{fmtMoney(r.valorAnticipo)}</td>
                                        <td>{estadoBadge(r.estado)}</td>
                                        <td style={{ fontSize: 12, color: '#6b7280' }}>{r.tomadoPorNombre || '—'}</td>
                                        <td>
                                            <button onClick={() => handleDelete(r._id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#b91c1c', fontSize: 12, cursor: 'pointer' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {reportes.length === 0 && (
                                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: 13 }}>Sin reportes registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   REGISTRO MAESTRO DE VEHÍCULOS
══════════════════════════════════════════════════════════════════════════ */
function RegistroVehiculos({ toast }) {
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({ placa: '', nombreConductor: '', cedulaConductor: '', nombreTitular: '', cedulaTitular: '', capacidadToneladas: '' });
    const [saving, setSaving] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const inputStyle = {
        padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d5dd',
        fontSize: 13, color: '#1a2236', outline: 'none',
        width: '100%', boxSizing: 'border-box',
    };

    const fetchVehiculos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/manifiestos/vehiculos`, { headers: hdrs() });
            const data = await res.json();
            setVehiculos(data.vehiculos || []);
        } catch { toast.add('Error al cargar vehículos', 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchVehiculos(); }, [fetchVehiculos]);

    const openNew = () => {
        setForm({ placa: '', nombreConductor: '', cedulaConductor: '', nombreTitular: '', cedulaTitular: '', destinosFrecuentes: [] });
        setEditTarget(null);
        setModalOpen(true);
    };

    const openEdit = (v) => {
        setForm({ placa: v.placa, nombreConductor: v.nombreConductor, cedulaConductor: v.cedulaConductor, nombreTitular: v.nombreTitular, cedulaTitular: v.cedulaTitular, capacidadToneladas: v.capacidadToneladas ?? '' });
        setEditTarget(v);
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.placa || !form.nombreConductor || !form.cedulaConductor || !form.nombreTitular || !form.cedulaTitular) {
            toast.add('Completa todos los campos obligatorios', 'error'); return;
        }
        setSaving(true);
        try {
            const url = editTarget ? `${API_URL}/manifiestos/vehiculos/${editTarget._id}` : `${API_URL}/manifiestos/vehiculos`;
            const method = editTarget ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al guardar');
            toast.add(editTarget ? 'Vehículo actualizado' : 'Vehículo registrado');
            setModalOpen(false);
            fetchVehiculos();
        } catch (e) { toast.add(e.message, 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (v) => {
        if (!window.confirm(`¿Eliminar el vehículo ${v.placa}?`)) return;
        try {
            await fetch(`${API_URL}/manifiestos/vehiculos/${v._id}`, { method: 'DELETE', headers: hdrs() });
            toast.add('Vehículo eliminado');
            fetchVehiculos();
        } catch { toast.add('Error al eliminar', 'error'); }
    };

    const filtrados = vehiculos.filter(v => {
        const q = busqueda.toUpperCase();
        return v.placa.includes(q) || v.nombreConductor.includes(q) || v.nombreTitular.includes(q);
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h2 className={styles.sectionTitle}>Registro de Vehículos</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Base maestra para autocompletado</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8 }}>
                        <Search size={13} color="#9ca3af" />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar placa, conductor…"
                            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, width: 180, color: '#1a2236' }} />
                    </div>
                    <button onClick={openNew} className={styles.btnPrimary}><Plus size={14} /> Nuevo vehículo</button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingBox}><RefreshCw size={22} className={styles.spin} /><span>Cargando…</span></div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Placa</th><th>Conductor</th><th>Cédula Cond.</th><th>Titular</th><th>Cédula Tit.</th><th>Cap. (ton)</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map(v => (
                                <tr key={v._id}>
                                    <td><strong>{v.placa}</strong></td>
                                    <td>{v.nombreConductor}</td>
                                    <td>{v.cedulaConductor}</td>
                                    <td>{v.nombreTitular}</td>
                                    <td>{v.cedulaTitular}</td>
                                    <td style={{ fontSize: 12, color: '#374151' }}>
                                        {v.capacidadToneladas != null ? `${v.capacidadToneladas} t` : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openEdit(v)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #d0d5dd', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                <Edit2 size={12} /> Editar
                                            </button>
                                            <button onClick={() => handleDelete(v)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#b91c1c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtrados.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: 13 }}>Sin vehículos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1a2236' }}>
                                {editTarget ? 'Editar vehículo' : 'Nuevo vehículo'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {[
                                { label: 'Placa *', key: 'placa', upper: true },
                                { label: 'Nombre Conductor *', key: 'nombreConductor', upper: true },
                                { label: 'Cédula Conductor *', key: 'cedulaConductor' },
                                { label: 'Nombre Titular *', key: 'nombreTitular', upper: true },
                                { label: 'Cédula Titular *', key: 'cedulaTitular' },
                                { label: 'Capacidad (ton)', key: 'capacidadToneladas' },
                            ].map(({ label, key, upper }) => (
                                <div key={key}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>{label}</label>
                                    <input
                                        value={form[key]}
                                        type={key === 'capacidadToneladas' ? 'number' : 'text'}
                                        min={key === 'capacidadToneladas' ? 0 : undefined}
                                        step={key === 'capacidadToneladas' ? '0.5' : undefined}
                                        placeholder={key === 'capacidadToneladas' ? 'Ej: 10, 12.5' : undefined}
                                        onChange={e => setForm(p => ({ ...p, [key]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                                        style={inputStyle}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setModalOpen(false)}
                                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: saving ? '#9ca3af' : '#1a2236', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? <><RefreshCw size={13} className={styles.spin} /> Guardando…</> : <><Save size={13} /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANEL PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function GestionManifiestos({ user }) {
    const toast = useToast();
    const [tab, setTab] = useState('sesion');

    return (
        <div className={styles.wrap}>
            <Toasts toasts={toast.toasts} remove={toast.remove} />

            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Gestión de Manifiestos</h1>
                    <p className={styles.pageSub}>Registro de vehículos · seguimiento de reportes</p>
                </div>
            </div>

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'sesion' ? styles.tabActive : ''}`} onClick={() => setTab('sesion')}>
                    <Truck size={14} /> Nuevo registro
                </button>
                <button className={`${styles.tab} ${tab === 'reportes' ? styles.tabActive : ''}`} onClick={() => setTab('reportes')}>
                    <ClipboardList size={14} /> Reportes Registrados
                </button>
                <button className={`${styles.tab} ${tab === 'vehiculos' ? styles.tabActive : ''}`} onClick={() => setTab('vehiculos')}>
                    <Car size={14} /> Registro de Vehículos
                </button>
            </div>

            <div className={styles.tabContent}>
                {tab === 'sesion' && <NuevaSesion toast={toast} />}
                {tab === 'reportes' && <ReportesRegistrados toast={toast} />}
                {tab === 'vehiculos' && <RegistroVehiculos toast={toast} />}
            </div>
        </div>
    );
}