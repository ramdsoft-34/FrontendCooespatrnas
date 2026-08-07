import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';
const token = () => localStorage.getItem('token');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const SEDE_INFO = {
  Pitalito: { color: '#0d9488', bg: '#f0fdfa' },
  Neiva:    { color: '#7c3aed', bg: '#f5f3ff' },
  Pasto:    { color: '#2563eb', bg: '#eff6ff' },
};

export default function GestionSedes() {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const fetchSedes = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/sede-config`, { headers: hdrs() });
      if (res.status === 403) throw new Error('No tienes permisos para ver esta sección.');
      if (!res.ok) throw new Error(`Error del servidor (${res.status}).`);
      const data = await res.json();
      setSedes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSedes(); }, [fetchSedes]);

  const handleToggle = async (nombre) => {
    setTogglingId(nombre); setError('');
    try {
      const res = await fetch(`${API_URL}/sede-config/${nombre}/toggle`, {
        method: 'PATCH', headers: hdrs(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo actualizar la sede.');
      setSedes((prev) => prev.map((s) => (s.nombre === nombre ? data : s)));
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2236', margin: 0 }}>Visibilidad de Sedes</h1>
        <button
          onClick={fetchSedes}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff',
            color: '#374151', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>
      <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 0, marginBottom: 22 }}>
        Activa o desactiva qué sedes se muestran en la vista consolidada de <strong>Seguimiento de Planillas</strong>.
        Los usuarios propios de cada sede no se ven afectados por este interruptor.
      </p>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 16,
          borderRadius: 8, background: '#fff1f2', border: '1.5px solid #fca5a5', color: '#b91c1c', fontSize: 13,
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 14, padding: '20px 0' }}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando sedes…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sedes.map((s) => {
            const info = SEDE_INFO[s.nombre] || { color: '#374151', bg: '#f9fafb' };
            const isToggling = togglingId === s.nombre;
            return (
              <div
                key={s.nombre}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', borderRadius: 12,
                  border: `1.5px solid ${info.color}22`, background: info.bg,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color,
                  }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1a2236' }}>{s.nombre}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5, color: s.activa ? '#15803d' : '#9ca3af' }}>
                      {s.activa
                        ? <><CheckCircle2 size={12} /> Visible en panel consolidado</>
                        : 'Oculta del panel consolidado'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(s.nombre)}
                  disabled={isToggling}
                  aria-pressed={s.activa}
                  style={{
                    width: 52, height: 28, borderRadius: 999, border: 'none',
                    background: s.activa ? '#16a34a' : '#cbd5e1',
                    position: 'relative', cursor: isToggling ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                  title={s.activa ? 'Desactivar sede' : 'Activar sede'}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: s.activa ? 27 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}