// frontend/src/pages/ManualUsuario.js
//
// Manual de usuario — PÚBLICO, SOLO LECTURA. Nadie edita nada desde aquí
// (la gestión vive en el panel de administración, en Admin > Manual).
//
// Dos manuales completamente separados, cada uno con su propia URL:
//   /manual         -> selector (elegir cuál ver)
//   /manual/web     -> Manual del Coordinador Logístico (uso de la página)
//   /manual/app     -> Manual de Conductores (uso de la app móvil)
//
// El contenido de un manual nunca se mezcla con el del otro: cada vista
// pide al backend un solo `tipo` a la vez.

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './ManualUsuario.module.css';
import {
  BookOpen, ChevronDown, ChevronLeft, Truck, Warehouse, Users, MapPin,
  FileText, MessageCircle, BarChart3, UserCog, Settings, Loader2,
  PlayCircle, Monitor, Smartphone, NotebookPen, Receipt, FileCheck2, Database,
} from 'lucide-react';

const API_BASE = 'https://api.cooespatrans.com/api';
const UPLOADS_BASE = 'https://api.cooespatrans.com';

const ICONOS = {
  BookOpen, Truck, Warehouse, Users, MapPin, FileText, MessageCircle,
  BarChart3, UserCog, Settings, Monitor, Smartphone, NotebookPen, Receipt, FileCheck2, Database,
};

function IconoSeccion({ nombre, size = 20 }) {
  const Cmp = ICONOS[nombre] || BookOpen;
  return <Cmp size={size} />;
}

const INFO_MANUAL = {
  web: {
    titulo: 'Manual del Coordinador Logístico',
    subtitulo: 'Uso de la página web',
    icono: Monitor,
  },
  app: {
    titulo: 'Manual de Conductores',
    subtitulo: 'Uso de la aplicación móvil SurTrack',
    icono: Smartphone,
  },
};

export default function ManualUsuario() {
  const { tipo } = useParams(); // undefined en /manual, 'web' o 'app' en las otras rutas

  if (!tipo) return <SelectorManual />;
  if (tipo !== 'web' && tipo !== 'app') return <SelectorManual />;
  return <ContenidoManual tipo={tipo} />;
}

// ─────────────────────────────────────────────
// /manual — elegir cuál de los dos manuales ver
// ─────────────────────────────────────────────
function SelectorManual() {
  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div className={styles.headerContenido}>
          <div className={styles.headerTitulo}>
            <BookOpen size={26} />
            <div>
              <h1>Manual de Usuario</h1>
              <p>Cooespatrans · Guías rápidas</p>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.contenidoSelector}>
        <p className={styles.textoSelector}>¿Qué manual quieres consultar?</p>
        <div className={styles.tarjetasSelector}>
          <Link to="/manual/web" className={styles.tarjetaSelector}>
            <Monitor size={36} />
            <h2>Coordinador Logístico</h2>
            <p>Uso de la página web: bodegas, viajes, seguimiento y reportes.</p>
          </Link>
          <Link to="/manual/app" className={styles.tarjetaSelector}>
            <Smartphone size={36} />
            <h2>Conductores</h2>
            <p>Uso de la app móvil SurTrack: viajes, navegación y entregas.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// /manual/web o /manual/app — contenido de UN solo manual, solo lectura
// ─────────────────────────────────────────────
function ContenidoManual({ tipo }) {
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(null);
  const navigate = useNavigate();
  const info = INFO_MANUAL[tipo];
  const IconoManual = info.icono;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/manual?tipo=${tipo}`);
        const data = await res.json();
        if (cancelado) return;
        if (data.success) {
          setSecciones(data.secciones || []);
          setAbierta(data.secciones?.[0]?._id || null);
        } else {
          setError(data.message || 'No se pudo cargar el manual');
        }
      } catch {
        if (!cancelado) setError('No se pudo conectar con el servidor');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [tipo]);

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <div className={styles.headerContenido}>
          <button className={styles.btnVolver} onClick={() => navigate('/manual')}>
            <ChevronLeft size={18} />
          </button>
          <div className={styles.headerTitulo}>
            <IconoManual size={24} />
            <div>
              <h1>{info.titulo}</h1>
              <p>{info.subtitulo}</p>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        {cargando ? (
          <div className={styles.estadoCentro}>
            <Loader2 className={styles.spin} size={28} />
            <p>Cargando el manual...</p>
          </div>
        ) : error ? (
          <div className={styles.estadoCentro}><p>{error}</p></div>
        ) : secciones.length === 0 ? (
          <div className={styles.estadoCentro}>
            <BookOpen size={40} color="#c7c7c7" />
            <p>Este manual estará disponible pronto.</p>
          </div>
        ) : (
          <div className={styles.listaSecciones}>
            {secciones.map((s) => (
              <SeccionAcordeon
                key={s._id}
                seccion={s}
                abierta={abierta === s._id}
                onToggle={() => setAbierta(abierta === s._id ? null : s._id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SeccionAcordeon({ seccion, abierta, onToggle }) {
  return (
    <div className={styles.tarjetaSeccion}>
      <button className={styles.encabezadoSeccion} onClick={onToggle}>
        <div className={styles.encabezadoIzq}>
          <span className={styles.iconoCirculo}><IconoSeccion nombre={seccion.icono} /></span>
          <div>
            <h2>{seccion.titulo}</h2>
            {seccion.descripcion && <p>{seccion.descripcion}</p>}
          </div>
        </div>
        <ChevronDown className={abierta ? styles.chevronArriba : styles.chevron} size={20} />
      </button>

      {abierta && (
        <div className={styles.cuerpoSeccion}>
          <div className={styles.lineaTiempo}>
            {seccion.pasos.length === 0 ? (
              <p className={styles.sinPasos}>Contenido próximamente.</p>
            ) : (
              seccion.pasos.map((p, i) => (
                <div className={styles.paso} key={p._id}>
                  <div className={styles.pasoMarcador}>
                    <span>{i + 1}</span>
                    <div className={styles.pasoLinea} />
                  </div>
                  <div className={styles.pasoContenido}>
                    <h3>{p.titulo}</h3>
                    {p.tipoMedia === 'video' && p.videoUrl ? (
                      <video className={styles.video} controls playsInline preload="metadata"
                        src={`${UPLOADS_BASE}${p.videoUrl}`} />
                    ) : p.tipoMedia === 'imagen' && p.imagenUrl ? (
                      <img className={styles.imagen} src={`${UPLOADS_BASE}${p.imagenUrl}`} alt={p.titulo} />
                    ) : (
                      <div className={styles.videoPendiente}><PlayCircle size={28} /><span>Contenido pendiente</span></div>
                    )}
                    <p className={styles.instruccion}>{p.instruccion}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
