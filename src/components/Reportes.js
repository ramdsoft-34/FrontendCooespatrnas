import React, { useState } from 'react';
import { 
  Calendar,
  Search,
  Building2,
  Users,
  FileText,
  MapPin,
  Phone,
  User,
  CreditCard,
  Download,
  Filter,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import styles from './Reportes.module.css';
import { authFetch } from '../utils/authFetch';

export default function Reportes() {
  const [fecha, setFecha] = useState('');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [bodegaFiltro, setBodegaFiltro] = useState('');

  const obtenerDatos = async () => {
    if (!fecha) {
      alert('Selecciona una fecha');
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch(`https://api.cooespatrans.com/api/bodegas/con-clientes?fecha=${fecha}`);
      const data = await res.json();
      setDatos(data);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFecha('');
    setDatos([]);
    setFiltroTexto('');
    setBodegaFiltro('');
  };

  const exportarDatos = () => {
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    // Aquí iría la lógica de exportación
    alert('Funcionalidad de exportación próximamente');
  };

  const datosFiltrados = datos.filter(item => {
    const coincideBodega = bodegaFiltro === '' || item.bodega._id === bodegaFiltro;
    const coincideTexto = filtroTexto === '' || 
      item.bodega.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      item.clientes.some(cliente => 
        cliente.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        cliente.cedula.includes(filtroTexto) ||
        cliente.telefono.includes(filtroTexto)
      );
    
    return coincideBodega && coincideTexto;
  });

  const totalClientes = datos.reduce((total, item) => total + item.clientes.length, 0);
  const totalBodegas = datos.length;

  if (loading) {
    return (
      <div className={styles.reportes}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportes}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reportes y Análisis</h1>
          <p className={styles.subtitle}>
            Consulta y analiza la información de clientes por bodega y fecha
          </p>
        </div>
        
        {datos.length > 0 && (
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <Building2 size={20} />
              <div>
                <span className={styles.statValue}>{totalBodegas}</span>
                <span className={styles.statLabel}>Bodegas</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Users size={20} />
              <div>
                <span className={styles.statValue}>{totalClientes}</span>
                <span className={styles.statLabel}>Clientes</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles de búsqueda */}
      <div className={styles.searchSection}>
        <div className={styles.searchCard}>
          <div className={styles.searchHeader}>
            <div className={styles.searchTitle}>
              <Calendar size={20} />
              <h3>Filtros de Búsqueda</h3>
            </div>
            {datos.length > 0 && (
              <button onClick={limpiarFiltros} className={styles.clearButton}>
                Limpiar filtros
              </button>
            )}
          </div>
          
          <div className={styles.searchControls}>
            <div className={styles.dateControl}>
              <label className={styles.label}>Fecha de consulta</label>
              <div className={styles.dateWrapper}>
                <Calendar size={16} />
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
            
            <div className={styles.searchActions}>
              <button onClick={obtenerDatos} className={styles.searchButton}>
                <Search size={16} />
                Buscar datos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros adicionales cuando hay datos */}
      {datos.length > 0 && (
        <div className={styles.filtersSection}>
          <div className={styles.filtersCard}>
            <div className={styles.filtersControls}>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por bodega, cliente, cédula o teléfono..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              
              <select
                value={bodegaFiltro}
                onChange={(e) => setBodegaFiltro(e.target.value)}
                className={styles.selectFilter}
              >
                <option value="">Todas las bodegas</option>
                {datos.map(item => (
                  <option key={item.bodega._id} value={item.bodega._id}>
                    {item.bodega.nombre}
                  </option>
                ))}
              </select>
              
              <button onClick={exportarDatos} className={styles.exportButton}>
                <Download size={16} />
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {datosFiltrados.length > 0 ? (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              <FileText size={20} />
              <h3>Resultados de la consulta</h3>
            </div>
            <span className={styles.resultsCount}>
              {datosFiltrados.length} bodega(s) encontrada(s)
            </span>
          </div>
          
          <div className={styles.bodegasContainer}>
            {datosFiltrados.map((item) => (
              <div key={item.bodega._id} className={styles.bodegaCard}>
                <div className={styles.bodegaHeader}>
                  <div className={styles.bodegaInfo}>
                    <div className={styles.bodegaTitle}>
                      <Building2 size={20} />
                      <h3>{item.bodega.nombre}</h3>
                    </div>
                    <div className={styles.bodegaDetails}>
                      <div className={styles.bodegaDetail}>
                        <MapPin size={14} />
                        <span>{item.bodega.direccion}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.bodegaStats}>
                    <div className={styles.bodegaStat}>
                      <Users size={16} />
                      <span>{item.clientes.length} clientes</span>
                    </div>
                  </div>
                </div>

                <div className={styles.clientesTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.tableTitle}>Clientes asignados</div>
                  </div>
                  
                  <div className={styles.tableContainer}>
                    <table className={styles.tabla}>
                      <thead>
                        <tr>
                          <th>
                            <div className={styles.thContent}>
                              <User size={14} />
                              Cliente
                            </div>
                          </th>
                          <th>
                            <div className={styles.thContent}>
                              <CreditCard size={14} />
                              Cédula
                            </div>
                          </th>
                          <th>
                            <div className={styles.thContent}>
                              <MapPin size={14} />
                              Dirección
                            </div>
                          </th>
                          <th>
                            <div className={styles.thContent}>
                              <Phone size={14} />
                              Teléfono
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.clientes.map((cliente) => (
                          <tr key={cliente._id}>
                            <td>
                              <div className={styles.clienteCell}>
                                <div className={styles.clienteAvatar}>
                                  <User size={14} />
                                </div>
                                <span className={styles.clienteNombre}>{cliente.nombre}</span>
                              </div>
                            </td>
                            <td className={styles.cedulaCell}>{cliente.cedula}</td>
                            <td className={styles.direccionCell}>{cliente.direccion}</td>
                            <td className={styles.telefonoCell}>{cliente.telefono}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Estados vacíos
        <div className={styles.emptySection}>
          {!fecha ? (
            <div className={styles.emptyState}>
              <BarChart3 size={48} />
              <h3>Selecciona una fecha</h3>
              <p>Elige una fecha para consultar los reportes de clientes por bodega</p>
            </div>
          ) : datos.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              <FileText size={48} />
              <h3>No hay datos para esta fecha</h3>
              <p>No se encontraron clientes asignados a bodegas para la fecha seleccionada</p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search size={48} />
              <h3>No se encontraron resultados</h3>
              <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
