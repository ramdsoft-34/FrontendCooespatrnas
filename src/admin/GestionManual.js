// frontend/src/admin/GestionManual.js
//
// Panel de administración del Manual de Usuario — mismo patrón que
// GestionUsuarios.js. Solo lo ve un admin (ya protegido por AdminDashboard).
//
// Administra los DOS manuales por separado con pestañas arriba: cambiar de
// pestaña cambia el `tipo` ('web' | 'app') de TODAS las peticiones — nunca
// se editan o listan mezclados.

import React, { useState, useEffect } from 'react';
import {
  BookOpen, Monitor, Smartphone, Plus, Pencil, Trash2, X, Save,
  ChevronDown, ChevronUp, Upload, Loader, AlertCircle, RefreshCw,
  ExternalLink, Image as ImageIcon, Video as VideoIcon, ArrowUp, ArrowDown,
} from 'lucide-react';
import styles from './GestionManual.module.css';
import { authFetch } from '../utils/authFetch';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';
const UPLOADS_BASE = 'https://api.cooespatrans.com';

const ICONOS_DISPONIBLES = [
  'BookOpen', 'Truck', 'Warehouse', 'Users', 'MapPin', 'FileText',
  'MessageCircle', 'BarChart3', 'UserCog', 'Settings', 'Monitor', 'Smartphone',
];

const MANUALES = [
  { tipo: 'web', label: 'Coordinador Logístico (Web)', icon: Monitor },
  { tipo: 'app', label: 'Conductores (App móvil)', icon: Smartphone },
];

export default function GestionManual() {
  const [tipoActivo, setTipoActivo] = useState('web');
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [expandida, setExpandida] = useState(null);
  const [creandoSeccion, setCreandoSeccion] = useState(false);

  useEffect(() => { cargarSecciones(tipoActivo); }, [tipoActivo]);

  async function cargarSecciones(tipo) {
    setCargando(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/manual/admin?tipo=${tipo}`);
      const data = await res.json();
      if (data.success) {
        setSecciones(data.secciones || []);
      } else {
        setError(data.message || 'No se pudo cargar el manual');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  }

  async function moverSeccion(index, direccion) {
    const nuevas = [...secciones];
    const destino = index + direccion;
    if (destino < 0 || destino >= nuevas.length) return;
    [nuevas[index], nuevas[destino]] = [nuevas[destino], nuevas[index]];
    setSecciones(nuevas);
    await authFetch(`${API_URL}/manual/secciones/reordenar`, {
      method: 'PUT',
      body: JSON.stringify({
        tipo: tipoActivo,
        secciones: nuevas.map((s, i) => ({ _id: s._id, orden: i })),
      }),
    });
    cargarSecciones(tipoActivo);
  }

  async function eliminarSeccion(seccion) {
    if (!window.confirm(`¿Eliminar la sección "${seccion.titulo}" y todos sus pasos? Esta acción no se puede deshacer.`)) return;
    await authFetch(`${API_URL}/manual/secciones/${seccion._id}`, { method: 'DELETE' });
    cargarSecciones(tipoActivo);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <div>
          <h2><BookOpen size={20} /> Manual de Usuario</h2>
          <p className={styles.subtitulo}>
            Gestiona el contenido de los dos manuales públicos.{' '}
            <a
              href={`https://www.cooespatrans.com/manual/${tipoActivo}`}
              target="_blank" rel="noopener noreferrer"
              className={styles.linkPublico}
            >
              Ver página pública <ExternalLink size={12} />
            </a>
          </p>
        </div>
        <button className={styles.btnRefresh} onClick={() => cargarSecciones(tipoActivo)}>
          <RefreshCw size={14} className={cargando ? styles.spin : ''} /> Actualizar
        </button>
      </div>

      {/* Pestañas: cada una es un manual completamente separado */}
      <div className={styles.tabs}>
        {MANUALES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.tipo}
              className={`${styles.tab} ${tipoActivo === m.tipo ? styles.tabActiva : ''}`}
              onClick={() => { setTipoActivo(m.tipo); setExpandida(null); }}
            >
              <Icon size={16} /> {m.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} /> {error}
          <button onClick={() => cargarSecciones(tipoActivo)} className={styles.retryBtn}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <div className={styles.loadingState}>
          <Loader className={styles.spin} size={24} />
          <p>Cargando...</p>
        </div>
      ) : (
        <div className={styles.listaSecciones}>
          {secciones.length === 0 && !creandoSeccion && (
            <div className={styles.vacio}>Este manual todavía no tiene secciones.</div>
          )}
          {secciones.map((s, i) => (
            <SeccionItem
              key={s._id}
              seccion={s}
              expandida={expandida === s._id}
              onToggle={() => setExpandida(expandida === s._id ? null : s._id)}
              onEliminar={() => eliminarSeccion(s)}
              onSubirIndice={() => moverSeccion(i, -1)}
              onBajarIndice={() => moverSeccion(i, 1)}
              esPrimera={i === 0}
              esUltima={i === secciones.length - 1}
              onCambio={() => cargarSecciones(tipoActivo)}
            />
          ))}

          {creandoSeccion ? (
            <FormSeccion
              tipo={tipoActivo}
              ordenSugerido={secciones.length}
              onCancelar={() => setCreandoSeccion(false)}
              onGuardado={() => { setCreandoSeccion(false); cargarSecciones(tipoActivo); }}
            />
          ) : (
            <button className={styles.btnNuevaSeccion} onClick={() => setCreandoSeccion(true)}>
              <Plus size={16} /> Nueva sección
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// UNA SECCIÓN (fila expandible con sus pasos)
// ─────────────────────────────────────────────
function SeccionItem({ seccion, expandida, onToggle, onEliminar, onSubirIndice, onBajarIndice, esPrimera, esUltima, onCambio }) {
  const [editando, setEditando] = useState(false);
  const [creandoPaso, setCreandoPaso] = useState(false);

  async function toggleActiva() {
    await authFetch(`${API_URL}/manual/secciones/${seccion._id}`, {
      method: 'PUT',
      body: JSON.stringify({ activa: !seccion.activa }),
    });
    onCambio();
  }

  return (
    <div className={`${styles.tarjetaSeccion} ${!seccion.activa ? styles.inactiva : ''}`}>
      <div className={styles.filaSeccion}>
        <button className={styles.ordenBtns} onClick={onSubirIndice} disabled={esPrimera} title="Subir">
          <ArrowUp size={13} />
        </button>
        <button className={styles.ordenBtns} onClick={onBajarIndice} disabled={esUltima} title="Bajar">
          <ArrowDown size={13} />
        </button>

        <button className={styles.tituloSeccionBtn} onClick={onToggle}>
          {expandida ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <strong>{seccion.titulo}</strong>
          <span className={styles.contadorPasos}>{seccion.pasos.length} paso(s)</span>
          {!seccion.activa && <span className={styles.badgeOculta}>Oculta</span>}
        </button>

        <div className={styles.accionesSeccion}>
          <button onClick={toggleActiva} title={seccion.activa ? 'Ocultar del manual público' : 'Mostrar en el manual público'}>
            {seccion.activa ? 'Ocultar' : 'Mostrar'}
          </button>
          <button onClick={() => setEditando(true)} title="Editar"><Pencil size={14} /></button>
          <button onClick={onEliminar} className={styles.btnPeligro} title="Eliminar"><Trash2 size={14} /></button>
        </div>
      </div>

      {editando && (
        <FormSeccion
          tipo={seccion.tipo}
          seccion={seccion}
          onCancelar={() => setEditando(false)}
          onGuardado={() => { setEditando(false); onCambio(); }}
        />
      )}

      {expandida && (
        <div className={styles.pasosWrap}>
          {seccion.pasos.length === 0 ? (
            <p className={styles.vacio}>Sin pasos todavía.</p>
          ) : (
            seccion.pasos.map((p, i) => (
              <PasoItem
                key={p._id}
                paso={p}
                numero={i + 1}
                seccionId={seccion._id}
                onCambio={onCambio}
              />
            ))
          )}

          {creandoPaso ? (
            <FormPaso
              seccionId={seccion._id}
              ordenSugerido={seccion.pasos.length}
              onCancelar={() => setCreandoPaso(false)}
              onGuardado={() => { setCreandoPaso(false); onCambio(); }}
            />
          ) : (
            <button className={styles.btnAgregarPaso} onClick={() => setCreandoPaso(true)}>
              <Plus size={14} /> Agregar paso
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// UN PASO (con acciones editar/eliminar)
// ─────────────────────────────────────────────
function PasoItem({ paso, numero, seccionId, onCambio }) {
  const [editando, setEditando] = useState(false);

  async function eliminar() {
    if (!window.confirm('¿Eliminar este paso y su archivo?')) return;
    await authFetch(`${API_URL}/manual/secciones/${seccionId}/pasos/${paso._id}`, { method: 'DELETE' });
    onCambio();
  }

  if (editando) {
    return (
      <FormPaso
        seccionId={seccionId}
        paso={paso}
        onCancelar={() => setEditando(false)}
        onGuardado={() => { setEditando(false); onCambio(); }}
      />
    );
  }

  return (
    <div className={styles.filaPaso}>
      <span className={styles.numeroPaso}>{numero}</span>
      <div className={styles.mediaMiniatura}>
        {paso.tipoMedia === 'video' && paso.videoUrl ? (
          <video src={`${UPLOADS_BASE}${paso.videoUrl}`} muted />
        ) : paso.tipoMedia === 'imagen' && paso.imagenUrl ? (
          <img src={`${UPLOADS_BASE}${paso.imagenUrl}`} alt="" />
        ) : (
          <div className={styles.sinMedia}>{paso.tipoMedia === 'video' ? <VideoIcon size={16} /> : <ImageIcon size={16} />}</div>
        )}
      </div>
      <div className={styles.textoPaso}>
        <strong>{paso.titulo}</strong>
        <p>{paso.instruccion}</p>
      </div>
      <div className={styles.accionesSeccion}>
        <button onClick={() => setEditando(true)} title="Editar"><Pencil size={13} /></button>
        <button onClick={eliminar} className={styles.btnPeligro} title="Eliminar"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORMULARIO: crear/editar sección
// ─────────────────────────────────────────────
function FormSeccion({ tipo, seccion, ordenSugerido, onCancelar, onGuardado }) {
  const [titulo, setTitulo] = useState(seccion?.titulo || '');
  const [descripcion, setDescripcion] = useState(seccion?.descripcion || '');
  const [icono, setIcono] = useState(seccion?.icono || 'BookOpen');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!titulo.trim()) return;
    setGuardando(true);
    try {
      if (seccion) {
        await authFetch(`${API_URL}/manual/secciones/${seccion._id}`, {
          method: 'PUT',
          body: JSON.stringify({ titulo, descripcion, icono }),
        });
      } else {
        await authFetch(`${API_URL}/manual/secciones`, {
          method: 'POST',
          body: JSON.stringify({ tipo, titulo, descripcion, icono, orden: ordenSugerido }),
        });
      }
      onGuardado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <strong>{seccion ? 'Editar sección' : 'Nueva sección'}</strong>
        <button onClick={onCancelar}><X size={16} /></button>
      </div>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ej: Crear un viaje)" />
      <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción corta (opcional)" />
      <select value={icono} onChange={(e) => setIcono(e.target.value)}>
        {ICONOS_DISPONIBLES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <div className={styles.formBtns}>
        <button onClick={guardar} disabled={guardando || !titulo.trim()} className={styles.btnPrimario}>
          <Save size={13} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORMULARIO: crear/editar paso (título + instrucción + video/imagen)
// ─────────────────────────────────────────────
function FormPaso({ seccionId, paso, ordenSugerido, onCancelar, onGuardado }) {
  const [titulo, setTitulo] = useState(paso?.titulo || '');
  const [instruccion, setInstruccion] = useState(paso?.instruccion || '');
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!titulo.trim() || !instruccion.trim()) return;
    setGuardando(true);
    try {
      const body = new FormData();
      body.append('titulo', titulo);
      body.append('instruccion', instruccion);
      if (paso === undefined) body.append('orden', ordenSugerido);
      if (archivo) body.append('archivo', archivo);

      const url = paso
        ? `${API_URL}/manual/secciones/${seccionId}/pasos/${paso._id}`
        : `${API_URL}/manual/secciones/${seccionId}/pasos`;
      await authFetch(url, { method: paso ? 'PUT' : 'POST', body });
      onGuardado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <strong>{paso ? 'Editar paso' : 'Nuevo paso'}</strong>
        <button onClick={onCancelar}><X size={16} /></button>
      </div>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título del paso (ej: 1. Selecciona la bodega)" />
      <textarea value={instruccion} onChange={(e) => setInstruccion(e.target.value)} placeholder="Instrucción clara y corta" rows={3} />
      <label className={styles.labelArchivo}>
        <Upload size={14} />
        {archivo ? archivo.name : paso?.videoUrl || paso?.imagenUrl ? 'Reemplazar video o imagen (opcional)' : 'Subir video o imagen (opcional)'}
        <input type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" hidden
          onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
      </label>
      <div className={styles.formBtns}>
        <button onClick={guardar} disabled={guardando || !titulo.trim() || !instruccion.trim()} className={styles.btnPrimario}>
          <Save size={13} /> {guardando ? 'Guardando...' : 'Guardar paso'}
        </button>
        <button onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
