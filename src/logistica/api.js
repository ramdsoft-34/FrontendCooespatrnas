// src/logistica/api.js
// Cliente de la API de logística y RNDC. Usa authFetch (token JWT y cierre
// de sesión automático en 401) y REACT_APP_API_URL como en el resto del panel.
import { authFetch } from '../utils/authFetch';

export const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? `?${new URLSearchParams(p).toString()}` : '';
};

async function request(method, path, { params, body, form } = {}) {
  const res = await authFetch(`${API_URL}${path}${qs(params)}`, {
    method,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let data = {};
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok || data.success === false) {
    throw new ApiError(data.message || `Error ${res.status}`, res.status, data);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, { form }),
};

// Descarga un archivo generado por el servidor (PDF, Excel o ZIP)
export async function descargar(path, params, nombrePorDefecto = 'archivo') {
  const res = await authFetch(`${API_URL}${path}${qs(params)}`);
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { msg = (await res.json()).message || msg; } catch { /* sin json */ }
    throw new ApiError(msg, res.status);
  }
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="([^"]+)"/);
  const nombre = m ? decodeURIComponent(m[1]) : nombrePorDefecto;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return nombre;
}

// Abre un PDF en una pestaña nueva (para ver o imprimir)
export async function abrirPdf(path, params) {
  const ventana = window.open('', '_blank');
  const res = await authFetch(`${API_URL}${path}${qs(params)}`);
  if (!res.ok) {
    if (ventana) ventana.close();
    let msg = `Error ${res.status}`;
    try { msg = (await res.json()).message || msg; } catch { /* sin json */ }
    throw new ApiError(msg, res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  if (ventana) ventana.location.href = url; else window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
