import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Building2,
  Truck,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown,
  MapPin,
  X,
  Phone,
  Mail,
  User
} from 'lucide-react';
import styles from './Panel.module.css';
import { authFetch } from '../utils/authFetch';

export default function Panel() {
  const [estadisticas, setEstadisticas] = useState({
    totalBodegas: 0,
    totalClientes: 0,
    clientesPendientes: 0,
    clientesAsignados: 0,
    totalViajes: 0,
    viajesActivos: 0,
    viajesCompletados: 0,
    viajesHoy: 0,
    valorFleteTotal: 0,
    valorFleteCompletado: 0
  });

  const [loading, setLoading] = useState(true);
  const [ultimosBodegas, setUltimosBodegas] = useState([]);
  const [ultimosViajes, setUltimosViajes] = useState([]);
  
  // Estados para modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState(''); // 'bodega', 'viaje', 'estadistica'
  const [datosModal, setDatosModal] = useState(null);
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar bodegas
      const resBodegas = await authFetch('https://api.cooespatrans.com/api/cargar/bodegas');
      const bodegas = await resBodegas.json();

      // Cargar clientes
      const resClientes = await authFetch('https://api.cooespatrans.com/api/clientes/');
      const dataClientes = await resClientes.json();
      const clientes = dataClientes.clientes || [];

      // Cargar viajes
      const resViajes = await authFetch('https://api.cooespatrans.com/api/viajes/');
      const viajes = await resViajes.json();

      // Calcular estadísticas
      const clientesPendientes = clientes.filter(c => !c.codigoViaje || c.estadoViaje === 'pendiente').length;
      const clientesAsignados = clientes.filter(c => c.codigoViaje && c.estadoViaje !== 'pendiente').length;
      
      const viajesActivos = viajes.filter(v => v.estado === 'activo' || v.estado === 'aceptado').length;
      const viajesCompletados = viajes.filter(v => v.estado === 'completado').length;
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const viajesHoy = viajes.filter(v => {
        const fechaViaje = new Date(v.fecha);
        fechaViaje.setHours(0, 0, 0, 0);
        return fechaViaje.getTime() === hoy.getTime();
      }).length;

      const valorFleteTotal = viajes.reduce((sum, v) => sum + (Number(v.valorFlete) || 0), 0);
      const valorFleteCompletado = viajes
        .filter(v => v.estado === 'completado')
        .reduce((sum, v) => sum + (Number(v.valorFlete) || 0), 0);

      setEstadisticas({
        totalBodegas: bodegas.length,
        totalClientes: clientes.length,
        clientesPendientes,
        clientesAsignados,
        totalViajes: viajes.length,
        viajesActivos,
        viajesCompletados,
        viajesHoy,
        valorFleteTotal,
        valorFleteCompletado,
        bodegas,
        clientes,
        viajes
      });

      // Últimas bodegas (5 más recientes)
      setUltimosBodegas(bodegas.slice(0, 5));

      // Últimos viajes (5 más recientes)
      setUltimosViajes(viajes.slice(0, 5));

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatearPesos = (valor) => {
    if (!valor) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return '#3b82f6';
      case 'aceptado': return '#f59e0b';
      case 'completado': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Funciones para abrir modales
  const abrirModalBodega = async (bodega) => {
    setTipoModal('bodega');
    setModalAbierto(true);
    setCargandoModal(true);
    
    try {
      // Cargar clientes de la bodega
      const res = await authFetch(`https://api.cooespatrans.com/api/cargar/clientes/bodega/${bodega._id}`);
      const clientes = await res.json();
      
      setDatosModal({
        ...bodega,
        clientes
      });
    } catch (error) {
      console.error('Error cargando detalles:', error);
      setDatosModal(bodega);
    } finally {
      setCargandoModal(false);
    }
  };

  const abrirModalViaje = async (viaje) => {
    setTipoModal('viaje');
    setModalAbierto(true);
    setDatosModal(viaje);
  };

  const abrirModalEstadistica = (tipo) => {
    setTipoModal('estadistica');
    setModalAbierto(true);
    
    let datos = {};
    
    switch(tipo) {
      case 'bodegas':
        datos = {
          titulo: 'Todas las Bodegas',
          tipo: 'bodegas',
          lista: estadisticas.bodegas || []
        };
        break;
      case 'clientes':
        datos = {
          titulo: 'Todos los Clientes',
          tipo: 'clientes',
          lista: estadisticas.clientes || [],
          pendientes: estadisticas.clientesPendientes,
          asignados: estadisticas.clientesAsignados
        };
        break;
      case 'viajes':
        datos = {
          titulo: 'Todos los Viajes',
          tipo: 'viajes',
          lista: estadisticas.viajes || [],
          activos: estadisticas.viajesActivos,
          completados: estadisticas.viajesCompletados
        };
        break;
      case 'fletes':
        datos = {
          titulo: 'Información de Fletes',
          tipo: 'fletes',
          total: estadisticas.valorFleteTotal,
          completado: estadisticas.valorFleteCompletado,
          viajes: estadisticas.viajes || []
        };
        break;
    }
    
    setDatosModal(datos);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTipoModal('');
    setDatosModal(null);
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Control</h1>
        <p className={styles.subtitle}>
          Resumen general de actividades y estadísticas del sistema
        </p>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className={styles.statsGrid}>
        {/* Total Bodegas */}
        <div 
          className={`${styles.statCard} ${styles.cardPurple} ${styles.clickable}`}
          onClick={() => abrirModalEstadistica('bodegas')}
        >
          <div className={styles.statCardContent}>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Total Bodegas</p>
              <h3 className={styles.statValue}>{estadisticas.totalBodegas}</h3>
            </div>
            <div className={styles.statIcon}>
              <Building2 size={24} />
            </div>
          </div>
        </div>

        {/* Total Clientes */}
        <div 
          className={`${styles.statCard} ${styles.cardPink} ${styles.clickable}`}
          onClick={() => abrirModalEstadistica('clientes')}
        >
          <div className={styles.statCardContent}>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Total Clientes</p>
              <h3 className={styles.statValue}>{estadisticas.totalClientes}</h3>
              
            </div>
            <div className={styles.statIcon}>
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Total Viajes */}
        <div 
          className={`${styles.statCard} ${styles.cardBlue} ${styles.clickable}`}
          onClick={() => abrirModalEstadistica('viajes')}
        >
          <div className={styles.statCardContent}>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Total Viajes</p>
              <h3 className={styles.statValue}>{estadisticas.totalViajes}</h3>
              <p className={styles.statSubtext}>{estadisticas.viajesActivos} activos</p>
            </div>
            <div className={styles.statIcon}>
              <Truck size={24} />
            </div>
          </div>
        </div>

        {/* Valor Total Fletes */}
        <div 
          className={`${styles.statCard} ${styles.cardGreen} ${styles.clickable}`}
          onClick={() => abrirModalEstadistica('fletes')}
        >
          <div className={styles.statCardContent}>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Valor Fletes</p>
              <h3 className={styles.statValueMoney}>
                {formatearPesos(estadisticas.valorFleteTotal)}
              </h3>
              <p className={styles.statSubtext}>
                {formatearPesos(estadisticas.valorFleteCompletado)} completados
              </p>
            </div>
            <div className={styles.statIcon}>
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>


      {/* Secciones de actividad reciente */}
      <div className={styles.activityGrid}>
        {/* Últimas Bodegas */}
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <Building2 size={20} className={styles.iconPrimary} />
            <h3 className={styles.activityTitle}>Bodegas</h3>
          </div>
          <div className={styles.activityList}>
            {ultimosBodegas.length > 0 ? ultimosBodegas.map(bodega => (
              <div 
                key={bodega._id} 
                className={`${styles.activityItem} ${styles.clickable}`}
                onClick={() => abrirModalBodega(bodega)}
              >
                <div className={styles.activityItemContent}>
                  <div className={`${styles.activityAvatar} ${styles.avatarBlue}`}>
                    <Building2 size={20} />
                  </div>
                  <div className={styles.activityItemInfo}>
                    <p className={styles.activityItemTitle}>{bodega.nombre}</p>
                    <p className={styles.activityItemSubtitle}>{bodega.direccion}</p>
                  </div>
                </div>
              </div>
            )) : (
              <p className={styles.emptyMessage}>No hay bodegas registradas</p>
            )}
          </div>
        </div>

        {/* Últimos Viajes */}
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <Truck size={20} className={styles.iconPrimary} />
            <h3 className={styles.activityTitle}>Viajes Recientes</h3>
          </div>
          <div className={styles.activityList}>
            {ultimosViajes.length > 0 ? ultimosViajes.map(viaje => (
              <div 
                key={viaje._id} 
                className={`${styles.activityItem} ${styles.clickable}`}
                onClick={() => abrirModalViaje(viaje)}
              >
                <div className={styles.activityItemContent}>
                  <div 
                    className={styles.activityAvatar}
                    style={{ background: getEstadoColor(viaje.estado) }}
                  >
                    <Truck size={20} />
                  </div>
                  <div className={styles.activityItemInfo}>
                    <p className={styles.activityItemTitle}>{viaje.codigo}</p>
                    <p className={styles.activityItemSubtitle}>
                      {viaje.bodega?.nombre} • {viaje.clientes?.length || 0} clientes
                    </p>
                  </div>
                </div>
                <div 
                  className={styles.estadoBadge}
                  style={{ 
                    background: `${getEstadoColor(viaje.estado)}15`,
                    color: getEstadoColor(viaje.estado)
                  }}
                >
                  {viaje.estado}
                </div>
              </div>
            )) : (
              <p className={styles.emptyMessage}>No hay viajes registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {tipoModal === 'bodega' && '🏢 Detalles de Bodega'}
                {tipoModal === 'viaje' && '🚛 Detalles del Viaje'}
                {tipoModal === 'estadistica' && `📊 ${datosModal?.titulo}`}
              </h2>
              <button onClick={cerrarModal} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {cargandoModal ? (
                <div className={styles.loadingModal}>
                  <div className={styles.spinner}></div>
                  <p>Cargando información...</p>
                </div>
              ) : (
                <>
                  {/* MODAL BODEGA */}
                  {tipoModal === 'bodega' && datosModal && (
                    <div className={styles.detallesBodega}>
                      <div className={styles.infoSection}>
                        <h3>Información General</h3>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <Building2 size={16} />
                            <div>
                              <strong>Nombre:</strong>
                              <p>{datosModal.nombre}</p>
                            </div>
                          </div>
                          <div className={styles.infoItem}>
                            <MapPin size={16} />
                            <div>
                              <strong>Dirección:</strong>
                              <p>{datosModal.direccion}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {datosModal.clientes && (
                        <div className={styles.infoSection}>
                          <h3>Clientes Disponibles ({datosModal.clientes.length})</h3>
                          <div className={styles.clientesList}>
                            {datosModal.clientes.slice(0, 10).map(cliente => (
                              <div key={cliente._id} className={styles.clienteItem}>
                                <User size={16} />
                                <div>
                                  <strong>{cliente.nombre}</strong>
                                  <p>{cliente.telefono} • {cliente.direccion}</p>
                                </div>
                              </div>
                            ))}
                            {datosModal.clientes.length > 10 && (
                              <p className={styles.masInfo}>
                                Y {datosModal.clientes.length - 10} clientes más...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODAL VIAJE */}
                  {tipoModal === 'viaje' && datosModal && (
                    <div className={styles.detallesViaje}>
                      <div className={styles.infoSection}>
                        <h3>Información del Viaje</h3>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoItem}>
                            <Truck size={16} />
                            <div>
                              <strong>Código:</strong>
                              <p>{datosModal.codigo}</p>
                            </div>
                          </div>
                          <div className={styles.infoItem}>
                            <div 
                              style={{ 
                                width: '16px', 
                                height: '16px', 
                                borderRadius: '50%',
                                background: getEstadoColor(datosModal.estado)
                              }}
                            />
                            <div>
                              <strong>Estado:</strong>
                              <p style={{ textTransform: 'capitalize' }}>{datosModal.estado}</p>
                            </div>
                          </div>
                          <div className={styles.infoItem}>
                            <Building2 size={16} />
                            <div>
                              <strong>Bodega:</strong>
                              <p>{datosModal.bodega?.nombre}</p>
                            </div>
                          </div>
                          <div className={styles.infoItem}>
                            <Calendar size={16} />
                            <div>
                              <strong>Fecha:</strong>
                              <p>{new Date(datosModal.fecha).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {datosModal.valorFlete && (
                            <div className={styles.infoItem}>
                              <DollarSign size={16} />
                              <div>
                                <strong>Valor Flete:</strong>
                                <p>{formatearPesos(datosModal.valorFlete)}</p>
                              </div>
                            </div>
                          )}
                          {datosModal.choferInfo && (
                            <div className={styles.infoItem}>
                              <User size={16} />
                              <div>
                                <strong>Chofer:</strong>
                                <p>{datosModal.choferInfo.nombre}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {datosModal.clientes && datosModal.clientes.length > 0 && (
                        <div className={styles.infoSection}>
                          <h3>Clientes Asignados ({datosModal.clientes.length})</h3>
                          <div className={styles.clientesList}>
                            {datosModal.clientes.map(cliente => (
                              <div key={cliente._id} className={styles.clienteItem}>
                                <User size={16} />
                                <div>
                                  <strong>{cliente.nombre}</strong>
                                  <p>{cliente.telefono} • {cliente.direccion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MODAL ESTADÍSTICAS */}
                  {tipoModal === 'estadistica' && datosModal && (
                    <div className={styles.detallesEstadistica}>
                      {datosModal.tipo === 'bodegas' && (
                        <div className={styles.listaCompleta}>
                          {datosModal.lista.map(bodega => (
                            <div key={bodega._id} className={styles.itemLista}>
                              <Building2 size={20} />
                              <div>
                                <strong>{bodega.nombre}</strong>
                                <p>{bodega.direccion}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {datosModal.tipo === 'clientes' && (
                        <>
                          <div className={styles.estadisticaResumen}>
                            <div className={styles.resumenItem}>
                              <Package size={20} />
                              <div>
                                <strong>{datosModal.asignados}</strong>
                                <p>Asignados</p>
                              </div>
                            </div>
                            <div className={styles.resumenItem}>
                              <AlertCircle size={20} />
                              <div>
                                <strong>{datosModal.pendientes}</strong>
                                <p>Pendientes</p>
                              </div>
                            </div>
                          </div>
                          <div className={styles.listaCompleta}>
                            {datosModal.lista.slice(0, 20).map(cliente => (
                              <div key={cliente._id} className={styles.itemLista}>
                                <User size={20} />
                                <div>
                                  <strong>{cliente.nombre}</strong>
                                  <p>{cliente.telefono} • {cliente.bodegaId?.nombre || 'Sin bodega'}</p>
                                </div>
                              </div>
                            ))}
                            {datosModal.lista.length > 20 && (
                              <p className={styles.masInfo}>
                                Y {datosModal.lista.length - 20} clientes más...
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {datosModal.tipo === 'viajes' && (
                        <>
                          <div className={styles.estadisticaResumen}>
                            <div className={styles.resumenItem}>
                              <Clock size={20} />
                              <div>
                                <strong>{datosModal.activos}</strong>
                                <p>Activos</p>
                              </div>
                            </div>
                            <div className={styles.resumenItem}>
                              <CheckCircle size={20} />
                              <div>
                                <strong>{datosModal.completados}</strong>
                                <p>Completados</p>
                              </div>
                            </div>
                          </div>
                          <div className={styles.listaCompleta}>
                            {datosModal.lista.map(viaje => (
                              <div key={viaje._id} className={styles.itemLista}>
                                <Truck size={20} />
                                <div>
                                  <strong>{viaje.codigo}</strong>
                                  <p>{viaje.bodega?.nombre} • {viaje.clientes?.length || 0} clientes</p>
                                </div>
                                <div 
                                  className={styles.estadoBadgeSmall}
                                  style={{ 
                                    background: `${getEstadoColor(viaje.estado)}15`,
                                    color: getEstadoColor(viaje.estado)
                                  }}
                                >
                                  {viaje.estado}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {datosModal.tipo === 'fletes' && (
                        <>
                          <div className={styles.estadisticaResumen}>
                            <div className={styles.resumenItem}>
                              <DollarSign size={20} />
                              <div>
                                <strong>{formatearPesos(datosModal.total)}</strong>
                                <p>Total</p>
                              </div>
                            </div>
                            <div className={styles.resumenItem}>
                              <CheckCircle size={20} />
                              <div>
                                <strong>{formatearPesos(datosModal.completado)}</strong>
                                <p>Completado</p>
                              </div>
                            </div>
                          </div>
                          <div className={styles.listaCompleta}>
                            {datosModal.viajes.filter(v => v.valorFlete).map(viaje => (
                              <div key={viaje._id} className={styles.itemLista}>
                                <Truck size={20} />
                                <div>
                                  <strong>{viaje.codigo}</strong>
                                  <p>{formatearPesos(viaje.valorFlete)}</p>
                                </div>
                                <div 
                                  className={styles.estadoBadgeSmall}
                                  style={{ 
                                    background: `${getEstadoColor(viaje.estado)}15`,
                                    color: getEstadoColor(viaje.estado)
                                  }}
                                >
                                  {viaje.estado}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}