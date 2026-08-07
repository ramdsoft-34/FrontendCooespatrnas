// src/utils/authFetch.js
// Helpers para adjuntar el token JWT del usuario autenticado a cada petición.
// El backend usa este token para filtrar los datos por propietario (owner),
// de modo que cada usuario ve únicamente su propia información.

export const getToken = () => localStorage.getItem('token');

// Cabeceras JSON con Authorization
export const authHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Solo Authorization (para FormData / uploads, donde NO se fija Content-Type)
export const authHeadersRaw = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Wrapper de fetch que inyecta el token automáticamente.
// Si el servidor responde 401, limpia la sesión y redirige al inicio.
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    // Redirige al login/landing
    if (window.location.pathname !== '/') {
      window.location.replace('/');
    }
  }

  return res;
};
