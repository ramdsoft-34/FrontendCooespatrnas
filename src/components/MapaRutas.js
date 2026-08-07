// frontend/src/components/MapaRutas.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, AlertCircle, RefreshCw, Route, Clock } from 'lucide-react';
import styles from './MapaRutas.module.css';

const API_BASE = 'https://api.cooespatrans.com/api';
const MAPS_KEY = process.env.REACT_APP_MAPS_KEY || '';

const MapaRutas = ({ bodega, clientes, codigoViaje }) => {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const polylineRef    = useRef(null);
  const shadowLineRef  = useRef(null);
  const debounceRef    = useRef(null);
  const calcTokenRef   = useRef(0);

  const bodegaRef          = useRef(bodega);
  const clientesRef        = useRef(clientes);
  const lastCalcKeyRef     = useRef('');
  const prevCalcKeyRef     = useRef('');

  const [mapLoaded,    setMapLoaded]    = useState(false);
  const [error,        setError]        = useState('');
  const [ruta,         setRuta]         = useState(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [regenerando,  setRegenerando]  = useState(false);
  const [calcTick,     setCalcTick]     = useState(0);

  // Sincronizar refs en cada render (sin efectos extra)
  bodegaRef.current   = bodega;
  clientesRef.current = clientes;

  // ── Google Maps loader ────────────────────────────────────
  const loadGoogleMaps = () =>
    new Promise((resolve, reject) => {
      if (window.google?.maps) { resolve(); return; }
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const t = setInterval(() => { if (window.google?.maps) { clearInterval(t); resolve(); } }, 100);
        return;
      }
      const s = document.createElement('script');
      // Cargamos también la librería 'routes' además de 'geometry'
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry,routes`;
      s.async = true; s.defer = true;
      s.onload  = resolve;
      s.onerror = () => reject(new Error('Error cargando Google Maps'));
      document.head.appendChild(s);
    });

  // ── Inicializar mapa ──────────────────────────────────────
  const inicializarMapa = async () => {
    try {
      await loadGoogleMaps();
      if (!mapRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: 1.2136, lng: -77.2811 },
        mapTypeId: 'roadmap',
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      });
      mapInstanceRef.current = map;
      setMapLoaded(true);
      setError('');
    } catch {
      setError('Error al cargar el mapa de Google Maps');
    }
  };

  // ── Geocodificar ──────────────────────────────────────────
  const geocodificar = (direccion) => {
    if (!window.google?.maps) return Promise.resolve(null);
    return new Promise(resolve => {
      new window.google.maps.Geocoder().geocode(
        { address: `${direccion}, Pasto, Nariño, Colombia` },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            });
          } else resolve(null);
        }
      );
    });
  };

  const fmtPesos = (v) => v
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
    : '';
  const fmtDist = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const fmtTime = (s) => { const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m} min`; };

  // ── Limpiar polilíneas ────────────────────────────────────
  const limpiarLineas = () => {
    if (polylineRef.current)  { polylineRef.current.setMap(null);  polylineRef.current  = null; }
    if (shadowLineRef.current){ shadowLineRef.current.setMap(null); shadowLineRef.current = null; }
  };

  // ── Dibujar path en el mapa ───────────────────────────────
  const dibujarPath = useCallback((path) => {
    if (!mapInstanceRef.current || !path?.length) return;
    limpiarLineas();

    shadowLineRef.current = new window.google.maps.Polyline({
      path, map: mapInstanceRef.current,
      strokeColor: 'rgba(99,153,34,0.3)', strokeWeight: 10, strokeOpacity: 1,
    });
    polylineRef.current = new window.google.maps.Polyline({
      path, map: mapInstanceRef.current,
      strokeColor: '#639922', strokeWeight: 4, strokeOpacity: 1,
    });

    const bounds = new window.google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    mapInstanceRef.current.fitBounds(bounds);
  }, []);

  // ── Dibujar ruta guardada (desde backend) ─────────────────
  const dibujarRutaGuardada = useCallback((rutaData) => {
    if (!rutaData?.coordenadas?.length) return;
    const path = rutaData.coordenadas.map(c => ({ lat: c.lat, lng: c.lng }));
    dibujarPath(path);
  }, [dibujarPath]);

  // ── Marcadores ────────────────────────────────────────────
  const agregarMarcadores = useCallback(async () => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const b = bodegaRef.current;
    const cs = clientesRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (b?.direccion) {
      const coord = await geocodificar(b.direccion);
      if (coord) {
        const m = new window.google.maps.Marker({
          position: coord, map: mapInstanceRef.current,
          title: `Bodega: ${b.nombre}`,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: '#1E40AF', strokeWeight: 2 },
          zIndex: 10,
        });
        const iw = new window.google.maps.InfoWindow({ content: `<div style="padding:8px;max-width:200px"><h4 style="margin:0 0 8px;color:#3B82F6">🏢 ${b.nombre}</h4><p style="margin:0;font-size:12px;color:#666">📍 ${b.direccion}</p></div>` });
        m.addListener('click', () => iw.open(mapInstanceRef.current, m));
        markersRef.current.push(m);
        bounds.extend(coord); count++;
      }
    }

    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.direccion) continue;
      const coord = await geocodificar(c.direccion);
      if (!coord) continue;
      const m = new window.google.maps.Marker({
        position: coord, map: mapInstanceRef.current,
        title: `${c.nombre} ${c.apellido || ''}`.trim(),
        label: { text: String(i + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#EF4444', fillOpacity: 1, strokeColor: '#DC2626', strokeWeight: 2 },
      });
      const iw = new window.google.maps.InfoWindow({
        content: `<div style="padding:8px;max-width:250px"><h4 style="margin:0 0 8px;color:#EF4444">👤 ${c.nombre} ${c.apellido || ''}</h4><div style="font-size:12px;line-height:1.4"><p style="margin:4px 0">📍 ${c.direccion}</p>${c.telefono ? `<p style="margin:4px 0">📞 ${c.telefono}</p>` : ''}${c.nunFactura ? `<p style="margin:4px 0">🧾 ${c.nunFactura}</p>` : ''}${c.valorARecibir ? `<p style="margin:4px 0">💰 ${fmtPesos(c.valorARecibir)}</p>` : ''}</div></div>`,
      });
      m.addListener('click', () => iw.open(mapInstanceRef.current, m));
      markersRef.current.push(m);
      bounds.extend(coord); count++;
    }

    if (count > 1) { mapInstanceRef.current.fitBounds(bounds); setTimeout(() => { if (mapInstanceRef.current.getZoom() > 16) mapInstanceRef.current.setZoom(16); }, 200); }
    else if (count === 1) mapInstanceRef.current.setZoom(16);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Backend: cargar / regenerar ruta ─────────────────────
  const cargarRutaGuardada = useCallback(async (codigo) => {
    if (!codigo) return;
    setCargandoRuta(true);
    try {
      const res = await fetch(`${API_BASE}/viajes/ruta/${codigo}`);
      const data = await res.json();
      if (data.success && data.rutaDisponible) { setRuta(data.ruta); dibujarRutaGuardada(data.ruta); }
    } catch (e) { console.error('Error cargando ruta:', e); }
    finally { setCargandoRuta(false); }
  }, [dibujarRutaGuardada]);

  const regenerarRuta = async () => {
    if (!codigoViaje) return;
    setRegenerando(true);
    try {
      const res = await fetch(`${API_BASE}/viajes/regenerar-ruta/${codigoViaje}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { setRuta(data.ruta); dibujarRutaGuardada(data.ruta); }
    } catch (e) { console.error('Error regenerando:', e); }
    finally { setRegenerando(false); }
  };

  // ── Calcular ruta preview ─────────────────────────────────
  // Intenta Routes API (nueva), luego Directions API (legacy), luego línea recta
  const calcularPreview = useCallback(async (token) => {
    const b  = bodegaRef.current;
    const cs = clientesRef.current;
    if (!b?.direccion || cs.length === 0) { setCargandoRuta(false); return; }

    limpiarLineas();
    setRuta(null);

    try {
      // 1. Geocodificar todos los puntos
      const origin = await geocodificar(b.direccion);
      if (!origin || token !== calcTokenRef.current) return;

      const destCoords = [];
      for (const c of cs) {
        if (!c.direccion) continue;
        const coord = await geocodificar(c.direccion);
        if (coord) destCoords.push(coord);
        if (token !== calcTokenRef.current) return;
      }
      if (destCoords.length === 0) { setCargandoRuta(false); return; }

      const allPoints = [origin, ...destCoords];

      // 2. Intentar Routes API (REST — no requiere librería extra)
      let path = null;
      let distanciaTotal = 0;
      let duracionTotal  = 0;

      try {
        const waypoints = allPoints.slice(1, -1).map(p => ({
          location: { latLng: { latitude: p.lat, longitude: p.lng } },
          via: false,
        }));
        const body = {
          origin:      { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destCoords[destCoords.length - 1].lat, longitude: destCoords[destCoords.length - 1].lng } } },
          intermediates: waypoints,
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true,
          routingPreference: 'TRAFFIC_UNAWARE',
        };

        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': MAPS_KEY,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.routes?.[0]?.polyline?.encodedPolyline) {
            const decoded = window.google.maps.geometry.encoding.decodePath(
              data.routes[0].polyline.encodedPolyline
            );
            path = decoded.map(p => ({ lat: p.lat(), lng: p.lng() }));
            distanciaTotal = data.routes[0].distanceMeters ?? 0;
            duracionTotal  = parseInt(data.routes[0].duration ?? '0', 10);
          }
        }
      } catch (e) {
        console.warn('Routes API falló, intentando Directions API:', e.message);
      }

      if (token !== calcTokenRef.current) return;

      // 3. Fallback: Directions API (legacy)
      if (!path) {
        try {
          const destination = destCoords[destCoords.length - 1];
          const waypoints   = destCoords.slice(0, -1).map(c => ({
            location: new window.google.maps.LatLng(c.lat, c.lng),
            stopover: true,
          }));

          const result = await new Promise((resolve, reject) => {
            new window.google.maps.DirectionsService().route(
              {
                origin:            new window.google.maps.LatLng(origin.lat, origin.lng),
                destination:       new window.google.maps.LatLng(destination.lat, destination.lng),
                waypoints,
                optimizeWaypoints: true,
                travelMode:        window.google.maps.TravelMode.DRIVING,
              },
              (res, status) => { if (status === 'OK') resolve(res); else reject(new Error(status)); }
            );
          });

          path = [];
          result.routes[0].legs.forEach(leg => {
            distanciaTotal += leg.distance.value;
            duracionTotal  += leg.duration.value;
            leg.steps.forEach(step => step.path.forEach(p => path.push({ lat: p.lat(), lng: p.lng() })));
          });
        } catch (e) {
          console.warn('Directions API falló, usando línea recta:', e.message);
        }
      }

      if (token !== calcTokenRef.current) return;

      // 4. Último fallback: línea recta entre los puntos geocodificados
      if (!path) {
        path = allPoints.map(p => ({ lat: p.lat, lng: p.lng }));
        // Estimación básica de distancia (suma de segmentos)
        for (let i = 0; i < allPoints.length - 1; i++) {
          const a = new window.google.maps.LatLng(allPoints[i].lat, allPoints[i].lng);
          const b2 = new window.google.maps.LatLng(allPoints[i+1].lat, allPoints[i+1].lng);
          distanciaTotal += window.google.maps.geometry.spherical.computeDistanceBetween(a, b2);
        }
        duracionTotal = (distanciaTotal / 30) * 3.6; // ~30 km/h ciudad → segundos
      }

      const rutaPreview = {
        coordenadas:      path,
        distanciaTotal,
        duracionEstimada: duracionTotal,
      };

      dibujarPath(path);
      setRuta(rutaPreview);
    } catch (e) {
      console.error('Error calculando ruta preview:', e);
    } finally {
      if (token === calcTokenRef.current) setCargandoRuta(false);
    }
  }, [dibujarPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Programar cálculo con debounce ────────────────────────
  const programarCalculo = useCallback((forzar = false) => {
    const b  = bodegaRef.current;
    const cs = clientesRef.current;
    if (!b?.direccion || cs.length === 0) return;

    const key = [b._id ?? b.direccion, ...cs.map(c => c._id ?? c.direccion)].join('|');
    if (!forzar && key === lastCalcKeyRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCargandoRuta(true);

    debounceRef.current = setTimeout(() => {
      lastCalcKeyRef.current = key;
      calcTokenRef.current  += 1;
      calcularPreview(calcTokenRef.current);
    }, 700);
  }, [calcularPreview]);

  const recalcularPreview = () => { lastCalcKeyRef.current = ''; programarCalculo(true); };

  // ── EFECTOS ───────────────────────────────────────────────

  // 1. Init mapa una sola vez
  useEffect(() => {
    inicializarMapa();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Mapa listo: marcadores + ruta guardada si hay viaje
  useEffect(() => {
    if (!mapLoaded) return;
    agregarMarcadores();
    if (codigoViaje) cargarRutaGuardada(codigoViaje);
  }, [mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Nuevo viaje creado
  useEffect(() => {
    if (!mapLoaded || !codigoViaje) return;
    cargarRutaGuardada(codigoViaje);
  }, [codigoViaje]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. calcTick dispara marcadores + preview
  useEffect(() => {
    if (!mapLoaded || codigoViaje) return;
    agregarMarcadores();
    programarCalculo(false);
  }, [calcTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Detectar cambios reales en bodega/clientes → actualizar calcTick
  //    Corre en cada render pero solo dispara setState si la key cambia
  useEffect(() => {
    if (!mapLoaded) return;
    const key = [
      bodega?._id ?? bodega?.direccion ?? '',
      ...(clientes ?? []).map(c => c._id ?? c.direccion ?? ''),
    ].join('|');
    if (key !== prevCalcKeyRef.current) {
      prevCalcKeyRef.current = key;
      setCalcTick(t => t + 1);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────
  if (error) return (
    <div className={styles.errorContainer}>
      <AlertCircle size={48} color="#EF4444" />
      <h3>Error al cargar el mapa</h3>
      <p>{error}</p>
      <button onClick={inicializarMapa} className={styles.retryButton}>Reintentar</button>
    </div>
  );

  return (
    <div className={styles.mapaContainer}>
      <div className={styles.mapaHeader}>
        <div className={styles.mapaInfo}>
          <MapPin size={20} />
          <div>
            <h3>Mapa de Rutas</h3>
            <p>{bodega ? `${bodega.nombre} — ${clientes.length} clientes` : 'Selecciona una bodega'}</p>
          </div>
        </div>

        <div className={styles.mapaControles}>
          {bodega && (
            <button
              onClick={async () => {
                const c = await geocodificar(bodega.direccion);
                if (c && mapInstanceRef.current) { mapInstanceRef.current.setCenter(c); mapInstanceRef.current.setZoom(15); }
              }}
              className={styles.centrarButton}
              title="Centrar en bodega"
            >
              <Navigation size={16} /> Centrar
            </button>
          )}

          {(codigoViaje || clientes.length > 0) && (
            <button
              onClick={codigoViaje ? regenerarRuta : recalcularPreview}
              disabled={regenerando || cargandoRuta}
              className={styles.centrarButton}
              title="Calcular otra ruta"
              style={{ background: '#639922', color: 'white', border: 'none' }}
            >
              <RefreshCw size={16} className={(regenerando || cargandoRuta) ? styles.spinning : ''} />
              {(regenerando || cargandoRuta) ? 'Calculando...' : 'Otra ruta'}
            </button>
          )}
        </div>
      </div>

      {ruta && (
        <div style={{ display:'flex', gap:16, padding:'8px 16px', background:'#f0fdf4', borderBottom:'1px solid #bbf7d0', fontSize:13 }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, color:'#166534' }}>
            <Route size={14} /> {fmtDist(ruta.distanciaTotal)}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4, color:'#166534' }}>
            <Clock size={14} /> ~{fmtTime(ruta.duracionEstimada)}
          </span>
          <span style={{ color:'#9ca3af', fontSize:12 }}>
            {codigoViaje ? 'Ruta por vías reales' : 'Vista previa'} · {clientes.length} paradas
          </span>
        </div>
      )}

      <div className={styles.mapaWrapper}>
        <div ref={mapRef} className={styles.mapa} style={{ width:'100%', height:'100%' }} />

        {(!mapLoaded || cargandoRuta) && !error && (
          <div className={styles.cargandoOverlay}>
            <div className={styles.spinner}></div>
            <p>{cargandoRuta ? 'Calculando ruta...' : 'Cargando mapa...'}</p>
          </div>
        )}

        {mapLoaded && clientes.length === 0 && (
          <div className={styles.sinClientesOverlay}>
            <MapPin size={48} color="#9CA3AF" />
            <p>No hay clientes para mostrar</p>
          </div>
        )}
      </div>

      {mapLoaded && clientes.length > 0 && (
        <div className={styles.leyenda}>
          <div className={styles.leyendaItem}>
            <div className={styles.marcadorAzul}></div><span>Bodega</span>
          </div>
          <div className={styles.leyendaItem}>
            <div className={styles.marcadorRojo}></div><span>Clientes</span>
          </div>
          {ruta && (
            <div className={styles.leyendaItem}>
              <div style={{ width:20, height:4, background:'#639922', borderRadius:2 }}></div>
              <span>{codigoViaje ? 'Ruta' : 'Ruta preview'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapaRutas;