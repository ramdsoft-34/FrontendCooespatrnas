// frontend/src/components/MapaRecorrido.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapaRecorrido.module.css';
import {
  Navigation,
  RefreshCw,
  Maximize2,
  Minimize2,
  MapPin,
  Clock,
  Zap,
  Route,
  Target,
  User,
  Truck,
  Play,
  Signal,
  Flag,
  CheckCircle,
  Calendar,
  Timer
} from 'lucide-react';

// Fix para los iconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// 🛠️ UTILIDADES
// ============================================

/**
 * Calcula la distancia en metros entre dos puntos [lat, lng]
 */
const distanciaMetros = (a, b) => {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
};

/**
 * Elimina puntos duplicados o demasiado cercanos (< umbralMetros)
 */
const filtrarPuntosCercanos = (puntos, umbralMetros = 10) => {
  if (!puntos || puntos.length === 0) return [];
  const resultado = [puntos[0]];
  for (let i = 1; i < puntos.length; i++) {
    if (distanciaMetros(resultado[resultado.length - 1], puntos[i]) >= umbralMetros) {
      resultado.push(puntos[i]);
    }
  }
  return resultado;
};

/**
 * Serializa un array de puntos para comparación estable
 */
const serializarPuntos = (puntos) =>
  puntos.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|');

// 🚗 MAP MATCHING (OSRM propio) — pega el RASTRO GPS REAL a las vías y
// RECONSTRUYE el tramo por calles cuando hubo un hueco de señal.
//
// Mejoras clave para máxima precisión (requieren tu propio servidor OSRM):
//  - Se envían TIMESTAMPS: OSRM ordena y parte el rastro correctamente.
//  - Se envían RADIUSES (precisión GPS por punto): mejora el "pegado" a la vía.
//  - Se trabaja con objetos {lat,lng,ts,prec} para conservar esos datos.
//  - Los huecos de señal se rellenan con /route (camino real por calles).
//
// CONFIG: apunta OSRM_BASE a tu servidor. Mientras montas el tuyo puedes dejar
// el público, pero es inestable para producción.
// ============================================

// 👉 CAMBIA esto por tu servidor OSRM (con HTTPS vía Nginx). Ej:
//    const OSRM_BASE = 'https://osrm.cooespatrans.com';
const OSRM_BASE = 'https://app.backend.cooespatrans.com/osrm';

const MAX_SALTO_METROS = 60;    // > esto entre dos puntos = hueco de señal (corte de segmento)
const MAX_PUNTOS_MATCH = 100;   // límite de OSRM /match por llamada

// Caché en memoria: evita repetir las mismas llamadas OSRM mientras el viaje crece.
const _cacheOSRM = new Map();

const _fetchJSON = async (url, ms = 8000) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    clearTimeout(t);
    return null;
  }
};

// Distancia entre dos objetos-punto {lat,lng}.
const distObj = (a, b) => distanciaMetros([a.lat, a.lng], [b.lat, b.lng]);

// Quita puntos casi encima del anterior (duplicados / demasiado cercanos).
const filtrarObjCercanos = (pts, umbral = 5) => {
  if (!pts || pts.length === 0) return [];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (distObj(out[out.length - 1], pts[i]) >= umbral) out.push(pts[i]);
  }
  return out;
};

// Parte el recorrido en segmentos continuos (corta donde hay un hueco grande).
const partirEnSegmentos = (pts, maxSalto = MAX_SALTO_METROS) => {
  const segmentos = [];
  let actual = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (distObj(pts[i - 1], pts[i]) > maxSalto) {
      if (actual.length > 0) segmentos.push(actual);
      actual = [pts[i]];
    } else {
      actual.push(pts[i]);
    }
  }
  if (actual.length > 0) segmentos.push(actual);
  return segmentos;
};

// OSRM /match para un segmento de objetos {lat,lng,ts,prec}.
// Devuelve puntos [lat,lng] pegados a vías, o null.
const matchSegmento = async (segmento) => {
  if (segmento.length < 2) return null;

  let pts = segmento;
  if (segmento.length > MAX_PUNTOS_MATCH) {
    const paso = Math.ceil(segmento.length / MAX_PUNTOS_MATCH);
    pts = segmento.filter((_, i) => i === 0 || i === segmento.length - 1 || i % paso === 0);
  }

  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');
  const clave = 'match:' + coords;
  if (_cacheOSRM.has(clave)) return _cacheOSRM.get(clave);

  // timestamps (segundos) y radiuses (precisión GPS en m; mínimo 4, máximo 50).
  const hayTs = pts.every((p) => Number.isFinite(p.ts));
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    tidy: 'true',
    gaps: hayTs ? 'split' : 'ignore',
  });
  if (hayTs) params.set('timestamps', pts.map((p) => p.ts).join(';'));
  params.set(
    'radiuses',
    pts.map((p) => {
      const r = p.prec && p.prec > 0 ? p.prec : 10;
      return Math.min(35, Math.max(4, Math.round(r)));
    }).join(';')
  );

  const url = `${OSRM_BASE}/match/v1/driving/${coords}?${params.toString()}`;
  const data = await _fetchJSON(url);
  let linea = null;
  if (data && data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
    linea = [];
    data.matchings.forEach((m) => {
      m.geometry.coordinates.forEach((c) => linea.push([c[1], c[0]]));
    });
    if (linea.length < 2) linea = null;
  }
  _cacheOSRM.set(clave, linea);
  return linea;
};

// OSRM /route entre dos objetos-punto: reconstruye el camino real por calles
// para RELLENAR un hueco de señal. Devuelve puntos [lat,lng] o null.
const puenteEntre = async (desde, hasta) => {
  if (!desde || !hasta) return null;
  if (distObj(desde, hasta) > 150) return null; // hueco > 150m: unir directo; menor: pegar a via

  const coords = `${desde.lng},${desde.lat};${hasta.lng},${hasta.lat}`;
  const clave = 'route:' + coords;
  if (_cacheOSRM.has(clave)) return _cacheOSRM.get(clave);

  const url = `${OSRM_BASE}/route/v1/driving/${coords}?geometries=geojson&overview=full`;
  const data = await _fetchJSON(url);
  let linea = null;
  if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
    linea = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
    if (linea.length < 2) linea = null;
  }
  _cacheOSRM.set(clave, linea);
  return linea;
};

// Función principal. Recibe objetos {lat,lng,ts,prec} y devuelve el recorrido
// pegado a vías (con huecos rellenos por calle) o null si no se pudo.
const calcularRutaPorVias = async (puntosObj) => {
  if (!puntosObj || puntosObj.length < 2) return null;

  const limpios = filtrarObjCercanos(puntosObj, 5);
  if (limpios.length < 2) return null;

  const segmentos = partirEnSegmentos(limpios);
  const resultado = [];
  let huboMatch = false;

  for (let i = 0; i < segmentos.length; i++) {
    const seg = segmentos[i];

    let trazo = null;
    if (seg.length >= 2 && distObj(seg[0], seg[seg.length - 1]) >= 6) {
      trazo = await matchSegmento(seg);
    }
    // trazoSeg como array [lat,lng] (match) o los puntos crudos del segmento.
    const trazoSeg = trazo && trazo.length >= 2
      ? (huboMatch = true, trazo)
      : seg.map((p) => [p.lat, p.lng]);

    if (resultado.length > 0) {
      const finAnterior = { lat: resultado[resultado.length - 1][0], lng: resultado[resultado.length - 1][1] };
      const inicioActual = { lat: trazoSeg[0][0], lng: trazoSeg[0][1] };
      const puente = await puenteEntre(finAnterior, inicioActual);
      if (puente && puente.length >= 2) {
        huboMatch = true;
        resultado.push(...puente.slice(1));
      }
    }
    resultado.push(...trazoSeg);
  }

  if (resultado.length < 2) return null;
  return huboMatch ? resultado : null;
};


// ICONOS PERSONALIZADOS
// ============================================

const choferIcon = new L.DivIcon({
  className: 'custom-chofer-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <div style="
        position: absolute; top: -4px; right: -4px;
        width: 12px; height: 12px;
        background: #22c55e; border-radius: 50%; border: 2px solid white;
        animation: pulse 1.5s infinite;
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const inicioIcon = new L.DivIcon({
  className: 'custom-inicio-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #22c55e, #16a34a);
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(34, 197, 94, 0.4);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const finIcon = new L.DivIcon({
  className: 'custom-fin-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(239, 68, 68, 0.4);
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// ============================================
// COMPONENTES AUXILIARES DEL MAPA
// ============================================

function CentrarMapa({ centro, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (centro) map.setView(centro, zoom || map.getZoom());
  }, [centro, zoom, map]);
  return null;
}

function AjustarAlRecorrido({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos && puntos.length > 0) {
      const bounds = L.latLngBounds(puntos);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [puntos, map]);
  return null;
}
// Recalcula el tamaño del mapa cuando se expande/contrae (evita zonas grises)
function RedimensionarMapa({ expandido, puntos }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (puntos && puntos.length > 0) {
        map.fitBounds(L.latLngBounds(puntos), { padding: [50, 50] });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [expandido, map, puntos]);
  return null;
}

// ============================================
// COMPONENTE PRINCIPAL: MapaRecorrido
// ============================================

export default function MapaRecorrido({
  viajeId,
  ubicacionActual,
  choferNombre,
  codigoViaje,
  onRefresh,
  cargando,
}) {
  const [recorrido, setRecorrido] = useState([]);
  const [recorridoPorVias, setRecorridoPorVias] = useState(null);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    distanciaTotal: 0,
    cantidadPuntos: 0,
    velocidadPromedio: 0,
  });
  const [cargandoRecorrido, setCargandoRecorrido] = useState(false);
  const [error, setError] = useState(null);
  const [mapaExpandido, setMapaExpandido] = useState(false);
  const [centrarEnChofer, setCentrarEnChofer] = useState(true);

  const intervalRef = useRef(null);
  // Guardamos la última clave de recorrido calculado para evitar recálculos innecesarios
  const ultimaClaveRef = useRef('');
  // Guarda los puntos como objetos {lat,lng,ts,prec} para el map matching.
  const datosRef = useRef([]);

  // ── Calcular ruta por vías cuando cambie el recorrido (sin bucle) ──
  useEffect(() => {
    if (recorrido.length < 2) return;

    const claveActual = serializarPuntos(recorrido);
    if (claveActual === ultimaClaveRef.current) return; // ya calculado para estos puntos
    ultimaClaveRef.current = claveActual;

    let cancelado = false;

    const calcularRuta = async () => {
      setCalculandoRuta(true);
      const rutaVias = datosRef.current
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map(p => [p.lat, p.lng]);
      if (!cancelado) {
        setRecorridoPorVias(rutaVias); // null si falló → fallback a línea directa
        setCalculandoRuta(false);
      }
    };

    calcularRuta();

    return () => {
      cancelado = true;
    };
  }, [recorrido]);

  // ── Cargar historial del recorrido ──
  const cargarRecorrido = useCallback(async () => {
    if (!viajeId) return;
    setCargandoRecorrido(true);
    setError(null);
    try {
      const res = await fetch(
        `https://app.backend.cooespatrans.com/api/ubicacion/recorrido/${viajeId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const coords = data.data.coordenadas || [];
          const tss = data.data.timestamps || [];
          const precs = data.data.precisiones || [];
          const puntos = coords.map((coord) => [coord[0], coord[1]]);
          // Objetos para OSRM /match (con hora y precisión por punto).
          datosRef.current = coords.map((coord, i) => ({
            lat: coord[0],
            lng: coord[1],
            ts: Number.isFinite(tss[i]) ? tss[i] : undefined,
            prec: precs[i] || 0,
          }));
          setRecorrido(puntos);
          setEstadisticas({
            distanciaTotal: data.data.distanciaTotal || 0,
            cantidadPuntos: data.data.cantidadPuntos || 0,
            activo: data.data.activo,
          });
        }
      } else {
        console.error('Error al cargar recorrido:', res.status);
      }
    } catch (err) {
      console.error('Error al cargar recorrido:', err);
      setError('Error al cargar el recorrido');
    } finally {
      setCargandoRecorrido(false);
    }
  }, [viajeId]);

  // ── Cargar estadísticas ──
  const cargarEstadisticas = useCallback(async () => {
    if (!viajeId) return;
    try {
      const res = await fetch(
        `https://app.backend.cooespatrans.com/api/ubicacion/estadisticas/${viajeId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setEstadisticas((prev) => ({
            ...prev,
            distanciaTotalKm: data.data.distanciaTotalKm,
            velocidadPromedioKmh: data.data.velocidadPromedioKmh,
            velocidadMaximaKmh: data.data.velocidadMaximaKmh,
            duracionMinutos: data.data.duracionMinutos,
          }));
        }
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, [viajeId]);

  // ── Efecto inicial + polling cada 15 s ──
  useEffect(() => {
    cargarRecorrido();
    cargarEstadisticas();
    intervalRef.current = setInterval(() => {
      cargarRecorrido();
    }, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cargarRecorrido, cargarEstadisticas]);

  const centroMapa = ubicacionActual
    ? [ubicacionActual.latitud, ubicacionActual.longitud]
    : recorrido.length > 0
    ? recorrido[recorrido.length - 1]
    : [4.570868, -74.297333];

  const puntoInicio = recorrido.length > 0 ? recorrido[0] : null;
  const puntosParaDibujar = recorridoPorVias || recorrido;

  const handleRefresh = () => {
    ultimaClaveRef.current = ''; // forzar recálculo de ruta
    cargarRecorrido();
    cargarEstadisticas();
    if (onRefresh) onRefresh();
  };

  const formatearDistancia = (metros) => {
    if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
    return `${Math.round(metros)} m`;
  };

  return (
    <div className={`${styles.mapaContainer} ${mapaExpandido ? styles.expandido : ''}`}>
      {/* Header */}
      <div className={styles.mapaHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Navigation size={20} />
            {estadisticas.activo && <span className={styles.liveIndicator}></span>}
          </div>
          <div className={styles.headerText}>
            <h3>Rastreo en Tiempo Real</h3>
            <p>
              {choferNombre || 'Conductor'} • {codigoViaje}
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          {estadisticas.activo && (
            <div className={styles.liveBadge}>
              <span className={styles.liveDot}></span>
              EN VIVO
            </div>
          )}

          {recorridoPorVias && !calculandoRuta && (
            <div
              className={styles.liveBadge}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Zap size={12} />
              POR VÍAS
            </div>
          )}

          <button
            onClick={handleRefresh}
            className={styles.refreshBtn}
            disabled={cargandoRecorrido || cargando}
          >
            <RefreshCw
              size={16}
              className={cargandoRecorrido ? styles.spinning : ''}
            />
          </button>

          <button
            onClick={() => setMapaExpandido(!mapaExpandido)}
            className={styles.expandBtn}
          >
            {mapaExpandido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Mapa */}
      <div className={styles.mapaWrapper}>
        <MapContainer
          center={centroMapa}
          zoom={15}
          className={styles.leafletMap}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off"
            maxZoom={20}
          />

          {puntosParaDibujar.length > 1 && (
            <>
              <Polyline
                positions={puntosParaDibujar}
                pathOptions={{
                  color: recorridoPorVias
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(59, 130, 246, 0.3)',
                  weight: 10,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={puntosParaDibujar}
                pathOptions={{
                  color: recorridoPorVias ? '#10b981' : '#3b82f6',
                  weight: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {recorrido.map((punto, index) => {
            if (index === 0 || index === recorrido.length - 1) return null;
            if (index % 5 !== 0) return null;
            return (
              <Marker
                key={`gps-${index}`}
                position={punto}
                icon={L.divIcon({
                  className: 'gps-point-marker',
                  html: `<div style="width:8px;height:8px;background:${
                    recorridoPorVias ? '#10b981' : '#3b82f6'
                  };border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [8, 8],
                  iconAnchor: [4, 4],
                })}
              >
                <Popup>
                  <div className={styles.popupContent}>
                    <div className={styles.popupHeader}>
                      <MapPin size={14} />
                      <strong>Punto GPS #{index + 1}</strong>
                    </div>
                    <div className={styles.popupInfo}>
                      <span>
                        <Target size={12} /> {punto[0].toFixed(6)},{' '}
                        {punto[1].toFixed(6)}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {puntoInicio && (
            <Marker position={puntoInicio} icon={inicioIcon}>
              <Popup>
                <div className={styles.popupContent}>
                  <Play size={14} />
                  <span>Inicio del recorrido</span>
                </div>
              </Popup>
            </Marker>
          )}

          {ubicacionActual && (
            <Marker
              position={[ubicacionActual.latitud, ubicacionActual.longitud]}
              icon={choferIcon}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <User size={16} />
                    <strong>{choferNombre || 'Conductor'}</strong>
                  </div>
                  <div className={styles.popupInfo}>
                    <span>
                      <Target size={12} /> {ubicacionActual.latitud.toFixed(5)},{' '}
                      {ubicacionActual.longitud.toFixed(5)}
                    </span>
                    {ubicacionActual.velocidad > 0 && (
                      <span>
                        <Zap size={12} />{' '}
                        {(ubicacionActual.velocidad * 3.6).toFixed(1)} km/h
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {centrarEnChofer && ubicacionActual && (
            <CentrarMapa
              centro={[ubicacionActual.latitud, ubicacionActual.longitud]}
            />
          )}
        </MapContainer>

        {((cargandoRecorrido && recorrido.length === 0) || calculandoRuta) && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}></div>
            <p>
              {calculandoRuta
                ? 'Calculando ruta por vías...'
                : 'Cargando recorrido...'}
            </p>
          </div>
        )}

        {error && (
          <div className={styles.errorOverlay}>
            <p>{error}</p>
            <button onClick={handleRefresh}>Reintentar</button>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className={styles.statsPanel}>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Route size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Distancia</span>
            <span className={styles.statValue}>
              {formatearDistancia(estadisticas.distanciaTotal)}
            </span>
          </div>
        </div>

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <MapPin size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Puntos</span>
            <span className={styles.statValue}>{estadisticas.cantidadPuntos}</span>
          </div>
        </div>

        {estadisticas.velocidadPromedioKmh && (
          <>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Zap size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Vel. Prom.</span>
                <span className={styles.statValue}>
                  {estadisticas.velocidadPromedioKmh} km/h
                </span>
              </div>
            </div>
          </>
        )}

        {estadisticas.duracionMinutos && (
          <>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Clock size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Duración</span>
                <span className={styles.statValue}>
                  {Math.round(estadisticas.duracionMinutos)} min
                </span>
              </div>
            </div>
          </>
        )}

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Signal size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Estado</span>
            <span
              className={`${styles.statValue} ${styles.statusBadge} ${
                estadisticas.activo ? styles.active : styles.inactive
              }`}
            >
              {estadisticas.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Controles flotantes */}
      <div className={styles.mapControls}>
        <button
          onClick={() => setCentrarEnChofer(!centrarEnChofer)}
          className={`${styles.controlBtn} ${centrarEnChofer ? styles.active : ''}`}
          title={centrarEnChofer ? 'Dejar de seguir' : 'Seguir conductor'}
        >
          <Target size={18} />
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: MapaRecorridoHistorico
// ============================================
export function MapaRecorridoHistorico({
  viajeId,
  choferNombre,
  codigoViaje,
  fechaCompletado,
  clientes = [],
  enProgreso = false,
}) {
  const [recorrido, setRecorrido] = useState([]);
  const [recorridoPorVias, setRecorridoPorVias] = useState(null);
  const [calculandoRuta, setCalculandoRuta] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    distanciaTotal: 0,
    cantidadPuntos: 0,
    velocidadPromedioKmh: 0,
    duracionMinutos: 0,
  });
  const [cargandoRecorrido, setCargandoRecorrido] = useState(true);
  const [error, setError] = useState(null);
  const [mapaExpandido, setMapaExpandido] = useState(false);

  const ultimaClaveRef = useRef('');
  // Guarda los puntos como objetos {lat,lng,ts,prec} para el map matching.
  const datosRef = useRef([]);

  // ── Calcular ruta por vías (sin bucle) ──
  useEffect(() => {
    if (recorrido.length < 2) return;

    const claveActual = serializarPuntos(recorrido);
    if (claveActual === ultimaClaveRef.current) return;
    ultimaClaveRef.current = claveActual;

    let cancelado = false;

    const calcularRuta = async () => {
      setCalculandoRuta(true);
      const rutaVias = datosRef.current
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map(p => [p.lat, p.lng]);
      if (!cancelado) {
        setRecorridoPorVias(rutaVias);
        setCalculandoRuta(false);
      }
    };

    calcularRuta();
    return () => { cancelado = true; };
  }, [recorrido]);

  const cargarRecorrido = useCallback(async () => {
    if (!viajeId) return;
    setCargandoRecorrido(true);
    setError(null);
    try {
      const res = await fetch(
        `https://app.backend.cooespatrans.com/api/ubicacion/recorrido/${viajeId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const coords = data.data.coordenadas || [];
          const tss = data.data.timestamps || [];
          const precs = data.data.precisiones || [];
          const puntos = coords.map((coord) => [coord[0], coord[1]]);
          // Objetos para OSRM /match (con hora y precisión por punto).
          datosRef.current = coords.map((coord, i) => ({
            lat: coord[0],
            lng: coord[1],
            ts: Number.isFinite(tss[i]) ? tss[i] : undefined,
            prec: precs[i] || 0,
          }));
          setRecorrido(puntos);
          setEstadisticas((prev) => ({
            ...prev,
            distanciaTotal: data.data.distanciaTotal || 0,
            cantidadPuntos: data.data.cantidadPuntos || 0,
          }));
        }
      } else {
        setError('No se encontró el recorrido de este viaje');
      }
    } catch (err) {
      console.error('Error al cargar recorrido:', err);
      setError('Error al cargar el recorrido');
    } finally {
      setCargandoRecorrido(false);
    }
  }, [viajeId]);

  const cargarEstadisticas = useCallback(async () => {
    if (!viajeId) return;
    try {
      const res = await fetch(
        `https://app.backend.cooespatrans.com/api/ubicacion/estadisticas/${viajeId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setEstadisticas((prev) => ({
            ...prev,
            distanciaTotalKm: data.data.distanciaTotalKm,
            velocidadPromedioKmh: data.data.velocidadPromedioKmh,
            velocidadMaximaKmh: data.data.velocidadMaximaKmh,
            duracionMinutos: data.data.duracionMinutos,
            fechaInicio: data.data.fechaInicio,
            fechaFin: data.data.fechaFin,
          }));
        }
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, [viajeId]);

  useEffect(() => {
    cargarRecorrido();
    cargarEstadisticas();
  }, [cargarRecorrido, cargarEstadisticas]);

  const calcularCentro = () => {
    if (recorrido.length === 0) return [4.570868, -74.297333];
    const sumLat = recorrido.reduce((s, p) => s + p[0], 0);
    const sumLng = recorrido.reduce((s, p) => s + p[1], 0);
    return [sumLat / recorrido.length, sumLng / recorrido.length];
  };

  const centroMapa = calcularCentro();
  const puntoInicio = recorrido.length > 0 ? recorrido[0] : null;
  const puntoFin = recorrido.length > 0 ? recorrido[recorrido.length - 1] : null;
  const puntosParaDibujar = recorridoPorVias || recorrido;

  const formatearDistancia = (metros) => {
    if (!metros) return '0 m';
    if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
    return `${Math.round(metros)} m`;
  };

  const formatearDuracion = (minutos) => {
    if (!minutos) return '0 min';
    if (minutos >= 60) {
      const horas = Math.floor(minutos / 60);
      const mins = Math.round(minutos % 60);
      return `${horas}h ${mins}m`;
    }
    return `${Math.round(minutos)} min`;
  };

  if (!cargandoRecorrido && recorrido.length === 0) {
    return (
      <div className={styles.mapaInactivo}>
        <div className={styles.inactivoContent}>
          <div className={styles.inactivoIconWrapper}>
            <div
              className={styles.inactivoIconBg}
              style={{
                background: enProgreso
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              {enProgreso ? <Clock size={48} /> : <CheckCircle size={48} />}
            </div>
          </div>
          <div className={styles.inactivoText}>
            <h3>{enProgreso ? 'Chofer sin señal GPS' : 'Viaje Completado'}</h3>
            <p>
              {error
                ? 'No se registró recorrido GPS para este viaje'
                : enProgreso
                ? 'El conductor no tiene activo el rastreo GPS'
                : 'El conductor no activó el rastreo durante este viaje'}
            </p>
          </div>
          <div className={styles.inactivoStats}>
            <div className={styles.inactivoStat}>
              <MapPin size={20} />
              <div>
                <strong>{clientes?.length || 0}</strong>
                <span>Entregas</span>
              </div>
            </div>
            <div className={styles.inactivoStatDivider}></div>
            <div className={styles.inactivoStat}>
              {enProgreso ? <Clock size={20} /> : <CheckCircle size={20} />}
              <div>
                <strong>{enProgreso ? 'En Progreso' : 'Finalizado'}</strong>
                <span>
                  {fechaCompletado
                    ? new Date(fechaCompletado).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const colorPrincipal = enProgreso ? '#f59e0b' : '#10b981';
  const colorSombra = enProgreso
    ? 'rgba(245, 158, 11, 0.3)'
    : 'rgba(16, 185, 129, 0.3)';

  return (
    <div className={`${styles.mapaContainer} ${mapaExpandido ? styles.expandido : ''}`}>
      <div
        className={styles.mapaHeader}
        style={{
          background: enProgreso
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #10b981, #059669)',
        }}
      >
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            {enProgreso ? <Clock size={20} /> : <Flag size={20} />}
          </div>
          <div className={styles.headerText}>
            <h3>
              {enProgreso ? 'Recorrido Hasta Ahora' : 'Recorrido Completado'}
            </h3>
            <p>
              {choferNombre || 'Conductor'} • {codigoViaje}
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div
            className={styles.liveBadge}
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {enProgreso ? <Clock size={14} /> : <CheckCircle size={14} />}
            {enProgreso ? 'EN PROGRESO' : 'FINALIZADO'}
          </div>

          {recorridoPorVias && !calculandoRuta && (
            <div
              className={styles.liveBadge}
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              <Zap size={12} />
              POR VÍAS
            </div>
          )}

          <button
            onClick={() => {
              ultimaClaveRef.current = '';
              cargarRecorrido();
              cargarEstadisticas();
            }}
            className={styles.refreshBtn}
            disabled={cargandoRecorrido}
          >
            <RefreshCw
              size={16}
              className={cargandoRecorrido ? styles.spinning : ''}
            />
          </button>

          <button
            onClick={() => setMapaExpandido(!mapaExpandido)}
            className={styles.expandBtn}
          >
            {mapaExpandido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className={styles.mapaWrapper}>
        {cargandoRecorrido || calculandoRuta ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}></div>
            <p>
              {calculandoRuta
                ? 'Calculando ruta por vías...'
                : 'Cargando recorrido histórico...'}
            </p>
          </div>
        ) : (
          <MapContainer
            center={centroMapa}
            zoom={13}
            className={styles.leafletMap}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off"
            maxZoom={20}
            />

            <AjustarAlRecorrido puntos={puntosParaDibujar} />
            <RedimensionarMapa expandido={mapaExpandido} puntos={puntosParaDibujar} />

            {puntosParaDibujar.length > 1 && (
              <>
                <Polyline
                  positions={puntosParaDibujar}
                  pathOptions={{
                    color: colorSombra,
                    weight: 10,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={puntosParaDibujar}
                  pathOptions={{
                    color: colorPrincipal,
                    weight: 4,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </>
            )}

            {recorrido.map((punto, index) => {
              if (index === 0 || index === recorrido.length - 1) return null;
              if (index % 5 !== 0) return null;
              return (
                <Marker
                  key={`gps-${index}`}
                  position={punto}
                  icon={L.divIcon({
                    className: 'gps-point-marker',
                    html: `<div style="width:8px;height:8px;background:${
                      enProgreso ? '#f59e0b' : '#10b981'
                    };border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [8, 8],
                    iconAnchor: [4, 4],
                  })}
                >
                  <Popup>
                    <div className={styles.popupContent}>
                      <div className={styles.popupHeader}>
                        <MapPin size={14} />
                        <strong>Punto GPS #{index + 1}</strong>
                      </div>
                      <div className={styles.popupInfo}>
                        <span>
                          <Target size={12} /> {punto[0].toFixed(6)},{' '}
                          {punto[1].toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {puntoInicio && (
              <Marker position={puntoInicio} icon={inicioIcon}>
                <Popup>
                  <div className={styles.popupContent}>
                    <div className={styles.popupHeader}>
                      <Play size={14} />
                      <strong>Inicio del viaje</strong>
                    </div>
                    {estadisticas.fechaInicio && (
                      <div className={styles.popupInfo}>
                        <span>
                          <Clock size={12} />{' '}
                          {new Date(estadisticas.fechaInicio).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {puntoFin && puntoFin !== puntoInicio && (
              <Marker
                position={puntoFin}
                icon={enProgreso ? choferIcon : finIcon}
              >
                <Popup>
                  <div className={styles.popupContent}>
                    <div className={styles.popupHeader}>
                      {enProgreso ? <Clock size={14} /> : <Flag size={14} />}
                      <strong>
                        {enProgreso ? 'Última ubicación' : 'Fin del viaje'}
                      </strong>
                    </div>
                    <div className={styles.popupInfo}>
                      {enProgreso ? (
                        <span>
                          <Target size={12} /> {puntoFin[0].toFixed(6)},{' '}
                          {puntoFin[1].toFixed(6)}
                        </span>
                      ) : estadisticas.fechaFin ? (
                        <span>
                          <Clock size={12} />{' '}
                          {new Date(estadisticas.fechaFin).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>

      {/* Estadísticas históricas */}
      <div
        className={styles.statsPanel}
        style={{ borderTop: `3px solid ${colorPrincipal}` }}
      >
        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ color: colorPrincipal }}>
            <Route size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Distancia Total</span>
            <span className={styles.statValue}>
              {estadisticas.distanciaTotalKm
                ? `${estadisticas.distanciaTotalKm} km`
                : formatearDistancia(estadisticas.distanciaTotal)}
            </span>
          </div>
        </div>

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ color: colorPrincipal }}>
            <Timer size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Duración</span>
            <span className={styles.statValue}>
              {formatearDuracion(estadisticas.duracionMinutos)}
            </span>
          </div>
        </div>

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ color: colorPrincipal }}>
            <Zap size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Vel. Promedio</span>
            <span className={styles.statValue}>
              {estadisticas.velocidadPromedioKmh
                ? `${estadisticas.velocidadPromedioKmh} km/h`
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ color: colorPrincipal }}>
            <MapPin size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Puntos GPS</span>
            <span className={styles.statValue}>{estadisticas.cantidadPuntos}</span>
          </div>
        </div>

        <div className={styles.statDivider}></div>

        <div className={styles.statItem}>
          <div className={styles.statIcon} style={{ color: colorPrincipal }}>
            {enProgreso ? <Clock size={18} /> : <CheckCircle size={18} />}
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Estado</span>
            <span
              className={`${styles.statValue} ${styles.statusBadge}`}
              style={{ background: colorPrincipal, color: 'white' }}
            >
              {enProgreso ? 'En Progreso' : 'Completado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: MapaInactivo
// ============================================
export function MapaInactivo({
  viajeId,
  estado,
  cantidadClientes,
  bodegaNombre,
}) {
  return (
    <div className={styles.mapaInactivo}>
      <div className={styles.inactivoContent}>
        <div className={styles.inactivoIconWrapper}>
          <div className={styles.inactivoIconBg}>
            <Navigation size={48} />
          </div>
          <div className={styles.radarRing}></div>
          <div className={styles.radarRing} style={{ animationDelay: '1s' }}></div>
          <div className={styles.radarRing} style={{ animationDelay: '2s' }}></div>
        </div>

        <div className={styles.inactivoText}>
          <h3>
            {estado === 'aceptado'
              ? 'Esperando señal del conductor...'
              : 'Rastreo no disponible'}
          </h3>
          <p>
            {estado === 'aceptado'
              ? 'La ubicación aparecerá automáticamente cuando el conductor inicie el viaje desde la aplicación móvil'
              : 'El rastreo en tiempo real solo está disponible durante viajes activos'}
          </p>
        </div>

        <div className={styles.inactivoStats}>
          <div className={styles.inactivoStat}>
            <MapPin size={20} />
            <div>
              <strong>{cantidadClientes || 0}</strong>
              <span>Paradas</span>
            </div>
          </div>
          <div className={styles.inactivoStatDivider}></div>
          <div className={styles.inactivoStat}>
            <Truck size={20} />
            <div>
              <strong>{bodegaNombre?.split(' ')[0] || 'Origen'}</strong>
              <span>Punto inicio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}