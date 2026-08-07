import React, { useState, useEffect } from 'react';
import { Upload, X, Plus, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import styles from './Cargar.module.css';
import * as XLSX from 'xlsx';
import { authFetch } from '../utils/authFetch';

export default function Cargar() {
  const [file, setFile] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalBodegaAbierto, setModalBodegaAbierto] = useState(false);
  const [nuevaBodega, setNuevaBodega] = useState({ nombre: '', direccion: '' });
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setError('');
    setFile(archivo);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setVistaPrevia(jsonData.slice(0, 10));
      } catch (err) {
        setError('Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.');
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(archivo);
  };

  const cancelarArchivo = () => {
    setFile(null);
    setVistaPrevia([]);
    setError('');
    // Reset file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  };

  const cargarBodegas = async () => {
    try {
      const res = await authFetch('https://api.cooespatrans.com/api/cargar/bodegas');
      const data = await res.json();
      setBodegas(data);
    } catch (err) {
      setError('Error al cargar las bodegas');
    }
  };

  const crearBodega = async () => {
    if (!nuevaBodega.nombre.trim() || !nuevaBodega.direccion.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setCargando(true);
    try {
      const res = await authFetch('https://api.cooespatrans.com/api/cargar/bodega', {
        method: 'POST',
        body: JSON.stringify(nuevaBodega)
      });
      const data = await res.json();
      setBodegas([...bodegas, data]);
      setBodegaSeleccionada(data._id);
      setNuevaBodega({ nombre: '', direccion: '' });
      setModalBodegaAbierto(false);
      setError('');
    } catch (err) {
      setError('Error al crear la bodega');
    } finally {
      setCargando(false);
    }
  };

  const subirClientes = async () => {
  if (!bodegaSeleccionada) {
    setError('Debes seleccionar una bodega');
    return;
  }

  setCargando(true);
  setError('');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bodegaId', bodegaSeleccionada);

    const res = await authFetch('https://api.cooespatrans.com/api/cargar/clientes', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      setFile(null);
      setVistaPrevia([]);
      setModalAbierto(false);
      setBodegaSeleccionada('');
      alert(`✅ ${data.cantidadInsertada} clientes cargados exitosamente`);
    } else {
      // Mostrar el error completo del servidor
      console.error('Error del servidor:', data);
      setError(data.mensaje || 'Error al cargar los clientes');
    }
  } catch (err) {
    console.error('Error de red:', err);
    setError('Error de conexión al servidor');
  } finally {
    setCargando(false);
  }
};

  useEffect(() => {
    cargarBodegas();
  }, []);

  return (
    <div className={styles.cargar}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cargar Datos</h1>
        <p className={styles.subtitle}>Sube archivos Excel con información de clientes</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.uploadSection}>
        {!file ? (
          <div className={styles.uploadArea}>
            <Upload size={48} className={styles.uploadIcon} />
            <h3>Selecciona un archivo</h3>
            <p>Formatos soportados: .xlsx, .xls</p>
            <label htmlFor="fileInput" className={styles.uploadButton}>
              Seleccionar archivo
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
          </div>
        ) : (
          <div className={styles.fileSelected}>
            <div className={styles.fileInfo}>
              <FileSpreadsheet size={24} className={styles.fileIcon} />
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
            <button
              onClick={cancelarArchivo}
              className={styles.cancelButton}
              title="Cancelar archivo"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {vistaPrevia.length > 0 && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>Vista previa</h2>
            <span className={styles.recordCount}>
              {vistaPrevia.length} registros (primeros 10)
            </span>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  {Object.keys(vistaPrevia[0]).map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vistaPrevia.map((fila, i) => (
                  <tr key={i}>
                    {Object.values(fila).map((val, j) => (
                      <td key={j}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.previewActions}>
            <button
              onClick={() => setModalAbierto(true)}
              className={styles.loadButton}
            >
              <Check size={20} />
              Cargar datos
            </button>
          </div>
        </div>
      )}

      {/* Modal Principal */}
      {modalAbierto && (
        <div className={styles.modal} onClick={() => setModalAbierto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Asignar a bodega</h2>
              <button
                onClick={() => setModalAbierto(false)}
                className={styles.modalClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Seleccionar bodega existente</label>
                <select
                  value={bodegaSeleccionada}
                  onChange={(e) => setBodegaSeleccionada(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Selecciona una bodega</option>
                  {bodegas.map(b => (
                    <option key={b._id} value={b._id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.divider}>
                <span>o</span>
              </div>

              <button
                onClick={() => setModalBodegaAbierto(true)}
                className={styles.createBodegaButton}
              >
                <Plus size={20} />
                Crear nueva bodega
              </button>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalAbierto(false)}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={subirClientes}
                disabled={!bodegaSeleccionada || cargando}
                className={styles.confirmBtn}
              >
                {cargando ? 'Cargando...' : 'Confirmar carga'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Bodega */}
      {modalBodegaAbierto && (
        <div className={styles.modal} onClick={() => setModalBodegaAbierto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Crear nueva bodega</h2>
              <button
                onClick={() => setModalBodegaAbierto(false)}
                className={styles.modalClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Nombre de la bodega</label>
                <input
                  type="text"
                  placeholder="Ingresa el nombre de la bodega"
                  value={nuevaBodega.nombre}
                  onChange={(e) => setNuevaBodega({ ...nuevaBodega, nombre: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dirección</label>
                <input
                  type="text"
                  placeholder="Ingresa la dirección de la bodega"
                  value={nuevaBodega.direccion}
                  onChange={(e) => setNuevaBodega({ ...nuevaBodega, direccion: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setModalBodegaAbierto(false)}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>
              <button
                onClick={crearBodega}
                disabled={!nuevaBodega.nombre.trim() || !nuevaBodega.direccion.trim() || cargando}
                className={styles.confirmBtn}
              >
                {cargando ? 'Creando...' : 'Crear bodega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
