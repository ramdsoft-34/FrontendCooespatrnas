// src/logistica/ui.js
// Componentes y utilidades compartidas por los módulos de logística.
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader, Inbox, AlertTriangle } from 'lucide-react';
import s from './Logistica.module.css';

export const cx = (...c) => c.filter(Boolean).join(' ');

// ── Formatos (Colombia) ──────────────────────────────────────────────────
export const fmtMiles = (n) => (n === null || n === undefined || n === '' || Number.isNaN(Number(n)) ? '' : Math.round(Number(n)).toLocaleString('es-CO'));
export const fmtPesos = (n) => (typeof n === 'number' && Number.isFinite(n) ? `$ ${fmtMiles(n)}` : (n ?? ''));
export const fmtPct = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '');
const dd = (n) => String(n).padStart(2, '0');
// Las fechas "solo día" vienen como medianoche UTC
export const fmtFecha = (d) => {
  if (!d) return '';
  const f = new Date(d);
  return Number.isNaN(f.getTime()) ? '' : `${dd(f.getUTCDate())}/${dd(f.getUTCMonth() + 1)}/${f.getUTCFullYear()}`;
};
export const isoFecha = (d) => {
  if (!d) return '';
  const f = new Date(d);
  return Number.isNaN(f.getTime()) ? '' : `${f.getUTCFullYear()}-${dd(f.getUTCMonth() + 1)}-${dd(f.getUTCDate())}`;
};
export const hoyIso = () => {
  const c = new Date(Date.now() - 5 * 3600000); // hora de Colombia
  return `${c.getUTCFullYear()}-${dd(c.getUTCMonth() + 1)}-${dd(c.getUTCDate())}`;
};
export const fmtFechaHora = (d) => {
  if (!d) return '';
  const c = new Date(new Date(d).getTime() - 5 * 3600000);
  return `${dd(c.getUTCDate())}/${dd(c.getUTCMonth() + 1)}/${c.getUTCFullYear()} ${dd(c.getUTCHours())}:${dd(c.getUTCMinutes())}`;
};
export const soloDigitos = (v) => String(v ?? '').replace(/[^0-9]/g, '');
export const aNumero = (v) => { const d = soloDigitos(v); return d ? Number(d) : 0; };

// ── Toasts ───────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  const add = useCallback((message, type = 'ok', ms = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => remove(id), ms);
  }, [remove]);
  const toast = useMemo(() => ({
    ok: (m) => add(m, 'ok'),
    error: (m) => add(m, 'error', 8000),
    info: (m) => add(m, 'info'),
  }), [add]);
  return { toasts, remove, toast };
}

export function Toasts({ toasts, remove }) {
  return (
    <div className={s.toasts} role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={cx(s.toast, t.type === 'ok' ? s.toastOk : t.type === 'error' ? s.toastError : s.toastInfo)}>
          {t.type === 'ok' ? <CheckCircle size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
          <span style={{ flex: 1, whiteSpace: 'pre-line' }}>{t.message}</span>
          <button onClick={() => remove(t.id)} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, icon: Icon, size, children, footer, footerLeft, cerrarAlClicFuera = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={s.overlay} onMouseDown={(e) => { if (cerrarAlClicFuera && e.target === e.currentTarget) onClose?.(); }}>
      <div className={cx(s.modal, size === 'lg' && s.modalLg, size === 'xl' && s.modalXl)} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.modalHead}>
          <div>
            <h3 className={s.modalTitle}>{Icon && <Icon size={18} />}{title}</h3>
            {subtitle && <p className={s.modalSub}>{subtitle}</p>}
          </div>
          <button className={s.iconBtn} onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className={s.modalBody}>{children}</div>
        {(footer || footerLeft) && (
          <div className={s.modalFoot}>
            {footerLeft && <div className={s.modalFootLeft}>{footerLeft}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmación (reemplaza los MsgBox Sí/No del Excel)
export function useConfirm() {
  const [estado, setEstado] = useState(null);
  const confirmar = useCallback((opts) => new Promise((resolve) => setEstado({ ...opts, resolve })), []);
  const cerrar = (v) => { estado?.resolve(v); setEstado(null); };
  const dialogo = (
    <Modal
      open={!!estado}
      onClose={() => cerrar(false)}
      title={estado?.titulo || 'Confirmar'}
      icon={estado?.peligro ? AlertTriangle : Info}
      footer={(
        <>
          <button className={s.btnGhost} onClick={() => cerrar(false)}>{estado?.cancelar || 'Cancelar'}</button>
          <button className={estado?.peligro ? s.btnDanger : s.btnPrimary} onClick={() => cerrar(true)} autoFocus>{estado?.aceptar || 'Aceptar'}</button>
        </>
      )}
    >
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{estado?.mensaje}</div>
    </Modal>
  );
  return { confirmar, dialogo };
}

// ── Campos ───────────────────────────────────────────────────────────────
export function Field({ label, required, hint, hintType, error, children, className }) {
  return (
    <div className={cx(s.field, className)}>
      {label && <label className={s.label}>{label}{required && <span className={s.req}>*</span>}</label>}
      {children}
      {error ? <span className={s.hintWarn} style={{ color: '#b91c1c' }}>{error}</span>
        : hint ? <span className={hintType === 'ok' ? s.hintOk : hintType === 'warn' ? s.hintWarn : s.hint}>{hint}</span> : null}
    </div>
  );
}

// Campo de moneda: muestra "$ 1.390.000" y entrega el número
export function MoneyInput({ value, onChange, placeholder = '$ 0', disabled, invalid, ...rest }) {
  const [foco, setFoco] = useState(false);
  const texto = value === null || value === undefined || value === '' ? '' : (foco ? String(value) : `$ ${fmtMiles(value)}`);
  return (
    <input
      {...rest}
      className={cx(s.input, invalid && s.inputError)}
      inputMode="numeric"
      value={texto}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      onChange={(e) => { const d = soloDigitos(e.target.value); onChange(d === '' ? '' : Number(d)); }}
    />
  );
}

// Combobox con búsqueda (reemplaza los ComboBox del Excel)
export function Combo({ value, onChange, opciones, placeholder, disabled, getLabel = (o) => o.label ?? o, getMeta, onPick, onBlur, invalid, autoFocus, maxItems = 60 }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const ref = useRef(null);
  const listaId = useId();
  const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtradas = useMemo(() => {
    const q = sinTildes(value);
    const lista = !q ? opciones : opciones.filter(o => sinTildes(getLabel(o)).includes(q) || (getMeta && sinTildes(getMeta(o)).includes(q)));
    return lista.slice(0, maxItems);
  }, [value, opciones, getLabel, getMeta, maxItems]);
  useEffect(() => {
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);
  const elegir = (o) => { onChange(getLabel(o)); onPick?.(o); setAbierto(false); };
  return (
    <div className={s.combo} ref={ref}>
      <input
        className={cx(s.input, invalid && s.inputError)}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={() => setAbierto(true)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo(a => Math.min(a + 1, filtradas.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && abierto && filtradas[activo]) { e.preventDefault(); elegir(filtradas[activo]); }
          if (e.key === 'Escape') setAbierto(false);
        }}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
      />
      {abierto && !disabled && filtradas.length > 0 && (
        <div className={s.comboList} role="listbox" id={listaId}>
          {filtradas.map((o, i) => (
            <div key={`${getLabel(o)}-${i}`} role="option" aria-selected={i === activo}
              className={cx(s.comboItem, i === activo && s.comboItemActive)}
              onMouseDown={(e) => { e.preventDefault(); elegir(o); }}
              onMouseEnter={() => setActivo(i)}>
              <span>{getLabel(o)}</span>
              {getMeta && <span className={s.comboMeta}>{getMeta(o)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Piezas visuales ──────────────────────────────────────────────────────
export const Loading = ({ texto = 'Cargando...' }) => <div className={s.loading}><Loader size={18} className={s.spin} />{texto}</div>;
export const Empty = ({ texto = 'No hay datos para mostrar.', icon: Icon = Inbox, children }) => (
  <div className={s.empty}><Icon size={34} /><div>{texto}</div>{children}</div>
);
export function Kpi({ label, value, hint, icon: Icon, tono }) {
  return (
    <div className={cx(s.kpi, tono === 'bueno' && s.kpiGood, tono === 'malo' && s.kpiBad)}>
      <div className={s.kpiLabel}>{Icon && <Icon size={13} />}{label}</div>
      <div className={s.kpiValue}>{value}</div>
      {hint && <div className={s.kpiHint}>{hint}</div>}
    </div>
  );
}
export function Chip({ tono = 'gris', children, title }) {
  const t = { gris: s.chipGray, verde: s.chipGreen, rojo: s.chipRed, ambar: s.chipAmber, azul: s.chipBlue, navy: s.chipNavy }[tono];
  return <span className={cx(s.chip, t)} title={title}>{children}</span>;
}
export function Alerta({ tipo = 'info', children, icon: Icon }) {
  const I = Icon || (tipo === 'error' ? AlertCircle : tipo === 'warn' ? AlertTriangle : tipo === 'ok' ? CheckCircle : Info);
  const c = { info: s.alertInfo, warn: s.alertWarn, error: s.alertError, ok: s.alertOk }[tipo];
  return <div className={cx(s.alert, c)}><I size={16} /><div style={{ flex: 1 }}>{children}</div></div>;
}
export function Tabs({ tabs, activo, onChange }) {
  return (
    <div className={s.tabs} role="tablist">
      {tabs.map(t => {
        const I = t.icon;
        return (
          <button key={t.id} role="tab" aria-selected={activo === t.id} className={cx(s.tab, activo === t.id && s.tabActive)} onClick={() => onChange(t.id)}>
            {I && <I size={15} />}{t.label}{t.badge ? <span className={s.tabBadge}>{t.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// Carga de datos con estado de carga y error
export function useCarga(fn, deps = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const recargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setDatos(await fn()); } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { recargar(); }, [recargar]);
  return { datos, setDatos, cargando, error, recargar };
}

export { s as estilos };
