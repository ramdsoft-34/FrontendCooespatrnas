import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, X, RefreshCw, Trash2, Edit2, CheckCircle,
  XCircle, AlertCircle, Save, Eye, EyeOff, Shield, Mail, Loader
} from 'lucide-react';
import Modal from '../components/Modal';
import styles from './GestionUsuarios.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.cooespatrans.com/api';

const ROLES = [
  { value: 'user',           label: 'Usuario'             },
  { value: 'admin',          label: 'Administrador'        },
  { value: 'adminSede',      label: 'Admin de Sede'        },
  { value: 'sede',           label: 'Sede'                 },
  { value: 'userManifiesto', label: 'Operador Manifiesto'  },
  { value: 'coordLogistico', label: 'Coordinador Logístico' },
];

const SEDES_VALIDAS = ['Pitalito', 'Neiva', 'Pasto'];

const ROLE_MAP = {
  admin:          { color: '#7c3aed', bg: '#f5f3ff', label: 'Administrador'       },
  adminSede:      { color: '#4338ca', bg: '#eef2ff', label: 'Admin de Sede'       },
  sede:           { color: '#0369a1', bg: '#e0f2fe', label: 'Sede'                },
  userManifiesto: { color: '#b45309', bg: '#fffbeb', label: 'Operador Manifiesto' },
  user:           { color: '#374151', bg: '#f3f4f6', label: 'Usuario'             },
  coordLogistico: { color: '#be185d', bg: '#fdf2f8', label: 'Coordinador Logístico' },
};

const RolBadge = ({ role }) => {
  const s = ROLE_MAP[role] || ROLE_MAP.user;
  return (
    <span className={styles.rolBadge} style={{ color: s.color, background: s.bg }}>
      <Shield size={10} /> {s.label}
    </span>
  );
};

export default function GestionUsuarios() {
  const [vista, setVista] = useState('lista'); // 'lista' | 'crear'

  /* ───────────────── LISTA / GESTIÓN ───────────────── */
  const [usuarios,   setUsuarios]   = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');
  const [filtro,     setFiltro]     = useState('');
  const [filtroRol,  setFiltroRol]  = useState('todos');

  const [modalEliminar,  setModalEliminar]  = useState(false);
  const [usuarioAElim,   setUsuarioAElim]   = useState(null);
  const [eliminando,     setEliminando]     = useState(false);

  const [modalEditar,    setModalEditar]    = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [formEdit, setFormEdit] = useState({
    email: '', role: '', sedeNombre: '', newPassword: '', confirmPassword: ''
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [editMsg,     setEditMsg]     = useState({ type: '', text: '' });

  const [alerta, setAlerta] = useState({ open: false, title: '', message: '', type: 'info' });
  const mostrarAlerta = (title, message, type = 'info') =>
    setAlerta({ open: true, title, message, type });

  useEffect(() => { cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsuarios(data.users || []);
    } catch (err) {
      setError('No se pudieron cargar los usuarios. Verifica el endpoint.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirEliminar = (u) => { setUsuarioAElim(u); setModalEliminar(true); };

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_URL}/auth/users/${usuarioAElim._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al eliminar');
      setModalEliminar(false);
      setUsuarioAElim(null);
      mostrarAlerta('¡Eliminado!', `Usuario "${usuarioAElim.username}" eliminado.`, 'success');
      cargarUsuarios();
    } catch (err) {
      mostrarAlerta('Error', err.message, 'alert');
    } finally {
      setEliminando(false);
    }
  };

  const abrirEditar = (u) => {
    setUsuarioAEditar(u);
    setFormEdit({
      email:           u.email,
      role:            u.role,
      sedeNombre:      u.sedeNombre || '',
      newPassword:     '',
      confirmPassword: '',
    });
    setEditMsg({ type: '', text: '' });
    setShowPass(false);
    setShowConfirm(false);
    setModalEditar(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormEdit(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && value !== 'sede' ? { sedeNombre: '' } : {}),
    }));
    setEditMsg({ type: '', text: '' });
  };

  const guardarCambios = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEdit.email)) {
      setEditMsg({ type: 'error', text: 'Correo inválido.' }); return;
    }
    if (formEdit.role === 'sede' && !formEdit.sedeNombre) {
      setEditMsg({ type: 'error', text: 'Selecciona una sede.' }); return;
    }
    if (formEdit.newPassword && formEdit.newPassword.length < 6) {
      setEditMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' }); return;
    }
    if (formEdit.newPassword && formEdit.newPassword !== formEdit.confirmPassword) {
      setEditMsg({ type: 'error', text: 'Las contraseñas no coinciden.' }); return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const body  = {
        email:      formEdit.email,
        role:       formEdit.role,
        sedeNombre: formEdit.role === 'sede' ? formEdit.sedeNombre : null,
        ...(formEdit.newPassword ? { password: formEdit.newPassword } : {}),
      };

      const res  = await fetch(`${API_URL}/auth/users/${usuarioAEditar._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar');

      setEditMsg({ type: 'success', text: 'Cambios guardados correctamente.' });
      cargarUsuarios();
    } catch (err) {
      setEditMsg({ type: 'error', text: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const t = filtro.toLowerCase();
    const matchTexto =
      u.username?.toLowerCase().includes(t) ||
      u.email?.toLowerCase().includes(t)    ||
      u.sedeNombre?.toLowerCase().includes(t);
    const matchRol = filtroRol === 'todos' || u.role === filtroRol;
    return matchTexto && matchRol;
  });

  const stats = {
    total:          usuarios.length,
    admin:          usuarios.filter(u => u.role === 'admin').length,
    adminSede:      usuarios.filter(u => u.role === 'adminSede').length,
    sede:           usuarios.filter(u => u.role === 'sede').length,
    user:           usuarios.filter(u => u.role === 'user').length,
    userManifiesto: usuarios.filter(u => u.role === 'userManifiesto').length,
    coordLogistico: usuarios.filter(u => u.role === 'coordLogistico').length,
  };

  /* ───────────────── CREAR USUARIO ───────────────── */
  const [formCrear, setFormCrear] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'user', sedeNombre: '',
  });
  const [showPasswordCrear, setShowPasswordCrear] = useState(false);
  const [showConfirmCrear,  setShowConfirmCrear]  = useState(false);
  const [statusCrear,       setStatusCrear]       = useState(null);
  const [messageCrear,      setMessageCrear]      = useState('');

  const handleChangeCrear = (e) => {
    const { name, value } = e.target;
    setFormCrear(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'role' && value !== 'sede' ? { sedeNombre: '' } : {}),
    }));
    setStatusCrear(null);
  };

  const validateCrear = () => {
    if (!formCrear.username.trim() || formCrear.username.length < 3) {
      setMessageCrear('El nombre de usuario debe tener al menos 3 caracteres.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formCrear.email)) {
      setMessageCrear('Ingrese un correo electrónico válido.');
      return false;
    }
    if (formCrear.password.length < 6) {
      setMessageCrear('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (formCrear.password !== formCrear.confirmPassword) {
      setMessageCrear('Las contraseñas no coinciden.');
      return false;
    }
    if (formCrear.role === 'sede' && !formCrear.sedeNombre) {
      setMessageCrear('Debes seleccionar una sede para este rol.');
      return false;
    }
    return true;
  };

  const handleSubmitCrear = async (e) => {
    e.preventDefault();
    setStatusCrear(null);
    if (!validateCrear()) { setStatusCrear('error'); return; }

    setStatusCrear('loading');
    try {
      const token = localStorage.getItem('token');
      const body = {
        username:   formCrear.username.trim(),
        email:      formCrear.email.trim().toLowerCase(),
        password:   formCrear.password,
        role:       formCrear.role,
        sedeNombre: formCrear.role === 'sede' ? formCrear.sedeNombre : null,
      };

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear el usuario.');

      setStatusCrear('success');
      setMessageCrear(`Usuario "${formCrear.username}" creado como "${ROLE_MAP[formCrear.role]?.label || formCrear.role}" exitosamente.`);
      setFormCrear({ username: '', email: '', password: '', confirmPassword: '', role: 'user', sedeNombre: '' });
      cargarUsuarios(); // refresca la lista en segundo plano

    } catch (err) {
      setStatusCrear('error');
      setMessageCrear(err.message);
    }
  };

  const passwordStrength = () => {
    const p = formCrear.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6)          score++;
    if (p.length >= 10)         score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
  const strength = passwordStrength();

  /* ───────────────── RENDER ───────────────── */
  return (
    <div className={styles.wrapper}>

      {/* Header con tabs */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            {vista === 'lista' ? <Users size={26} /> : <UserPlus size={26} />}
          </div>
          <div>
            <h1 className={styles.title}>
              {vista === 'lista' ? 'Gestión de Usuarios' : 'Crear Nuevo Usuario'}
            </h1>
            <p className={styles.subtitle}>
              {vista === 'lista'
                ? `${stats.total} usuarios registrados en el sistema`
                : 'Completa el formulario para registrar un nuevo usuario'}
            </p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${vista === 'lista' ? styles.tabBtnActive : ''}`}
            onClick={() => setVista('lista')}
          >
            <Users size={14} /> Lista
          </button>
          <button
            className={`${styles.tabBtn} ${vista === 'crear' ? styles.tabBtnActive : ''}`}
            onClick={() => setVista('crear')}
          >
            <UserPlus size={14} /> Crear usuario
          </button>
        </div>
      </div>

      {vista === 'lista' ? (
        <>
          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { label: 'Total',          val: stats.total,          rol: 'todos',          color: '#374151' },
              { label: 'Administradores',val: stats.admin,          rol: 'admin',          color: '#7c3aed' },
              { label: 'Admin de Sede',  val: stats.adminSede,      rol: 'adminSede',      color: '#4338ca' },
              { label: 'Sedes',          val: stats.sede,           rol: 'sede',           color: '#0369a1' },
              { label: 'Usuarios',       val: stats.user,           rol: 'user',           color: '#059669' },
              { label: 'Op. Manifiesto', val: stats.userManifiesto, rol: 'userManifiesto', color: '#b45309' },
              { label: 'Coord. Logístico', val: stats.coordLogistico, rol: 'coordLogistico', color: '#be185d' },
            ].map(s => (
              <div
                key={s.label}
                className={`${styles.statPill} ${filtroRol === s.rol ? styles.statPillActive : ''}`}
                onClick={() => setFiltroRol(filtroRol === s.rol ? 'todos' : s.rol)}
                style={filtroRol === s.rol ? { borderColor: s.color, color: s.color } : {}}
              >
                <span className={styles.statNum}>{s.val}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Búsqueda */}
          <div className={styles.searchBar}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text" placeholder="Buscar por usuario, email o sede..."
              className={styles.searchInput}
              value={filtro} onChange={e => setFiltro(e.target.value)}
            />
            {filtro && (
              <button className={styles.clearBtn} onClick={() => setFiltro('')}>
                <X size={13} />
              </button>
            )}
            <button className={styles.btnRefresh} onClick={cargarUsuarios}>
              <RefreshCw size={14} className={cargando ? styles.spinner : ''} /> Actualizar
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={15} /> {error}
              <button onClick={cargarUsuarios} className={styles.retryBtn}>
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          )}

          {/* Tabla */}
          {cargando ? (
            <div className={styles.loadingState}>
              <div className={styles.spinnerBig} />
              <p>Cargando usuarios...</p>
            </div>
          ) : usuariosFiltrados.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Sede</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {u.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className={styles.username}>{u.username}</span>
                        </div>
                      </td>
                      <td className={styles.emailCell}>{u.email}</td>
                      <td><RolBadge role={u.role} /></td>
                      <td className={styles.sedeCell}>{u.sedeNombre || <em className={styles.noData}>—</em>}</td>
                      <td>
                        {u.isActive !== false
                          ? <span className={styles.badgeActive}><CheckCircle size={11} /> Activo</span>
                          : <span className={styles.badgeInactive}><XCircle size={11} /> Inactivo</span>
                        }
                      </td>
                      <td className={styles.fechaCell}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.btnEdit} onClick={() => abrirEditar(u)} title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button className={styles.btnDelete} onClick={() => abrirEliminar(u)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Users size={46} className={styles.emptyIcon} />
              <h3>Sin resultados</h3>
              <p>{filtro || filtroRol !== 'todos' ? 'No hay usuarios con los filtros aplicados.' : 'No hay usuarios registrados.'}</p>
              {(filtro || filtroRol !== 'todos') && (
                <button className={styles.btnSecondary} onClick={() => { setFiltro(''); setFiltroRol('todos'); }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* ───────────── FORMULARIO CREAR ───────────── */
        <div className={styles.formContainer}>
          <form className={styles.form} onSubmit={handleSubmitCrear} noValidate>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Nombre de usuario</label>
              <input
                id="username" name="username" type="text" autoComplete="off"
                className={styles.input} placeholder="ej. juan.perez"
                value={formCrear.username} onChange={handleChangeCrear}
                disabled={statusCrear === 'loading'} required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Correo electrónico</label>
              <input
                id="email" name="email" type="email" autoComplete="off"
                className={styles.input} placeholder="usuario@correo.com"
                value={formCrear.email} onChange={handleChangeCrear}
                disabled={statusCrear === 'loading'} required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="role">
                <Shield size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Rol del usuario
              </label>
              <select
                id="role" name="role"
                className={styles.input}
                value={formCrear.role}
                onChange={handleChangeCrear}
                disabled={statusCrear === 'loading'}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {formCrear.role === 'sede' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sedeNombre">Sede asignada</label>
                <select
                  id="sedeNombre" name="sedeNombre"
                  className={styles.input}
                  value={formCrear.sedeNombre}
                  onChange={handleChangeCrear}
                  disabled={statusCrear === 'loading'}
                >
                  <option value="">— Selecciona una sede —</option>
                  {SEDES_VALIDAS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Contraseña</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password" name="password"
                  type={showPasswordCrear ? 'text' : 'password'}
                  className={styles.input} placeholder="Mínimo 6 caracteres"
                  value={formCrear.password} onChange={handleChangeCrear}
                  disabled={statusCrear === 'loading'} required
                />
                <button type="button" className={styles.eyeBtn}
                  onClick={() => setShowPasswordCrear(!showPasswordCrear)} tabIndex={-1}>
                  {showPasswordCrear ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formCrear.password && (
                <div className={styles.strengthBar}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={styles.strengthSegment}
                      style={{ background: i <= strength ? strengthColors[strength] : '#e2e8f0' }} />
                  ))}
                  <span className={styles.strengthLabel} style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className={styles.passwordWrap}>
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirmCrear ? 'text' : 'password'}
                  className={`${styles.input} ${
                    formCrear.confirmPassword && formCrear.password !== formCrear.confirmPassword ? styles.inputError   : ''
                  } ${
                    formCrear.confirmPassword && formCrear.password === formCrear.confirmPassword ? styles.inputSuccess : ''
                  }`}
                  placeholder="Repita la contraseña"
                  value={formCrear.confirmPassword} onChange={handleChangeCrear}
                  disabled={statusCrear === 'loading'} required
                />
                <button type="button" className={styles.eyeBtn}
                  onClick={() => setShowConfirmCrear(!showConfirmCrear)} tabIndex={-1}>
                  {showConfirmCrear ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {statusCrear === 'error' && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertCircle size={16} /><span>{messageCrear}</span>
              </div>
            )}
            {statusCrear === 'success' && (
              <div className={`${styles.alert} ${styles.alertSuccess}`}>
                <CheckCircle size={16} /><span>{messageCrear}</span>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={statusCrear === 'loading'}>
              {statusCrear === 'loading' ? (
                <><Loader size={18} className={styles.spinner} />Creando usuario...</>
              ) : (
                <><UserPlus size={18} />Crear Usuario</>
              )}
            </button>

          </form>
        </div>
      )}

      {/* ── MODAL EDITAR ── */}
      {modalEditar && (
        <div className={styles.modalOverlay} onClick={() => setModalEditar(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><Edit2 size={17} /> Editar usuario: <strong>{usuarioAEditar?.username}</strong></h3>
              <button className={styles.closeBtn} onClick={() => setModalEditar(false)}><X size={19} /></button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.label}><Mail size={13} /> Correo electrónico</label>
                <input name="email" type="email" className={styles.input}
                  value={formEdit.email} onChange={handleEditChange} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}><Shield size={13} /> Rol</label>
                <select name="role" className={styles.input}
                  value={formEdit.role} onChange={handleEditChange}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {formEdit.role === 'sede' && (
                <div className={styles.field}>
                  <label className={styles.label}>Sede</label>
                  <select name="sedeNombre" className={styles.input}
                    value={formEdit.sedeNombre} onChange={handleEditChange}>
                    <option value="">— Selecciona —</option>
                    {SEDES_VALIDAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña <span className={styles.optional}>(opcional)</span></label>
                <div className={styles.passwordWrap}>
                  <input name="newPassword" type={showPass ? 'text' : 'password'}
                    className={styles.input} placeholder="Dejar vacío para no cambiar"
                    value={formEdit.newPassword} onChange={handleEditChange} />
                  <button type="button" className={styles.eyeBtn}
                    onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {formEdit.newPassword && (
                <div className={styles.field}>
                  <label className={styles.label}>Confirmar contraseña</label>
                  <div className={styles.passwordWrap}>
                    <input name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                      className={`${styles.input} ${
                        formEdit.confirmPassword && formEdit.newPassword !== formEdit.confirmPassword
                          ? styles.inputError : ''
                      }`}
                      placeholder="Repite la contraseña"
                      value={formEdit.confirmPassword} onChange={handleEditChange} />
                    <button type="button" className={styles.eyeBtn}
                      onClick={() => setShowConfirm(p => !p)}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {editMsg.text && (
                <div className={`${styles.alert} ${editMsg.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
                  {editMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                  {editMsg.text}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalEditar(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={guardarCambios} disabled={guardando}>
                {guardando ? <><RefreshCw size={14} className={styles.spinner} /> Guardando...</> : <><Save size={14} /> Guardar cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ELIMINAR ── */}
      <Modal
        isOpen={modalEliminar}
        onClose={() => { setModalEliminar(false); setUsuarioAElim(null); }}
        onConfirm={confirmarEliminar}
        title="Eliminar usuario"
        message={`¿Eliminar a "${usuarioAElim?.username}"? Esta acción no se puede deshacer.`}
        confirmText={eliminando ? 'Eliminando...' : 'Sí, eliminar'}
        cancelText="Cancelar"
        type="warning"
        confirmColor="danger"
      />

      {/* ── ALERTA ── */}
      <Modal
        isOpen={alerta.open}
        onClose={() => setAlerta(a => ({ ...a, open: false }))}
        onConfirm={() => setAlerta(a => ({ ...a, open: false }))}
        title={alerta.title}
        message={alerta.message}
        confirmText="Aceptar"
        type={alerta.type}
        confirmColor="primary"
      />
    </div>
  );
}