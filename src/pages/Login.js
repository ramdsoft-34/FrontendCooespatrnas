import React, { useState } from 'react';
import { User, Lock, AlertCircle, Shield, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import styles from './Login.module.css';
import logoEmpresa from '../assets/icono.png';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.username || !formData.password) {
    setError('Por favor complete todos los campos');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // ── 1. Login principal (planillas) ──────────────────────
    const response = await fetch('https://api.cooespatrans.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!data.success) {
      setError(data.message || 'Credenciales incorrectas');
      return;
    }

    // ── 2. Login en surmeet (chat) con el mismo email+password
    try {
      const chatRes = await fetch('https://surmeet.cooespatrans.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });
      const chatData = await chatRes.json();
      if (chatData.success && chatData.token) {
        localStorage.setItem('chat_token', chatData.token);
        localStorage.setItem('chat_user', JSON.stringify(chatData.user));
      }
    } catch {
      // Si falla el login de chat, no bloquea el login principal
      console.warn('Login chat no disponible');
    }

    // ── 3. Guardar y navegar ────────────────────────────────
    onLoginSuccess(data.token, data.user);

  } catch (error) {
    console.error('Error en login:', error);
    setError('Error de conexión. Verifique que el servidor esté funcionando.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className={styles.loginContainer}>
      {/* Panel Izquierdo - Visual */}
      <div className={styles.visualPanel}>
        <div className={styles.visualContent}>
          <div className={styles.logoSection}>
            <div className={styles.logoCircle}>
              <div className={styles.logoInner}>C</div>
            </div>
            <div className={styles.logoText}>
              <h1 className={styles.companyName}>COOESPATRANS</h1>
              <p className={styles.companyTagline}>Transporte de Excelencia</p>
            </div>
          </div>

          <div className={styles.heroSection}>
            <div className={styles.glassCard}>
              <div className={styles.glassCardIcon}>
                <Sparkles />
              </div>
              <h2 className={styles.heroTitle}>
                Sistema de Gestión Inteligente
              </h2>
              <p className={styles.heroDescription}>
                Optimiza tu flota, monitorea en tiempo real y toma decisiones basadas en datos
              </p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>20+</div>
                <div className={styles.statLabel}>Años</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>500+</div>
                <div className={styles.statLabel}>Clientes</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Soporte</div>
              </div>
            </div>

            <div className={styles.featuresCompact}>
              <div className={styles.featureCompact}>
                <CheckCircle2 size={16} />
                <span>Seguimiento GPS en tiempo real</span>
              </div>
              <div className={styles.featureCompact}>
                <CheckCircle2 size={16} />
                <span>Reportes automáticos detallados</span>
              </div>
              <div className={styles.featureCompact}>
                <CheckCircle2 size={16} />
                <span>Gestión completa de conductores</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bgGradient1}></div>
        <div className={styles.bgGradient2}></div>
        <div className={styles.gridPattern}></div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <div className={styles.formLogo}>
              <img src={logoEmpresa} alt="Cooespatrans Logo" className={styles.formLogoImage} />
            </div>
            <h2 className={styles.formTitle}>Bienvenido</h2>
            <p className={styles.formSubtitle}>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {error && (
              <div className={styles.errorAlert}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.inputLabel}>
                Correo Electrónico
              </label>
              <div className={`${styles.inputWrapper} ${focusedField === 'username' ? styles.inputFocused : ''}`}>
                <User className={styles.inputIcon} size={20} />
                <input
                  type="email"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="correo@ejemplo.com"
                  className={styles.input}
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Contraseña
              </label>
              <div className={`${styles.inputWrapper} ${focusedField === 'password' ? styles.inputFocused : ''}`}>
                <Lock className={styles.inputIcon} size={20} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={styles.input}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              {!loading && <ArrowRight size={20} className={styles.buttonArrow} />}
              {loading && <div className={styles.spinner}></div>}
            </button>

            <div className={styles.securityFooter}>
              <Shield size={16} />
              <span>Conexión segura SSL/TLS</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;