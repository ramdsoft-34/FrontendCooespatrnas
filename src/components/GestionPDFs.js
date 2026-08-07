// frontend/src/components/GestionPDFs.js
import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Download, Loader2, XCircle, Eye } from 'lucide-react';
import styles from './GestionPDFs.module.css';

export default function GestionPDFs({ viajeId, codigoViaje }) {
  const [pdfs, setPdfs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('Manifiesto');

  useEffect(() => {
    cargarPDFs();
  }, [codigoViaje]);

  const cargarPDFs = async () => {
    setCargando(true);
    try {
      const res = await fetch(`https://api.cooespatrans.com/api/pdfs/${codigoViaje}/pdfs`);
      const data = await res.json();
      
      if (data.success) {
        setPdfs(data.pdfs || []);
      }
    } catch (err) {
      console.error('Error al cargar PDFs:', err);
      setError('Error al cargar documentos');
    } finally {
      setCargando(false);
    }
  };

  const subirPDF = async (archivo) => {
    if (!archivo) return;

    // Validar que sea PDF
    if (archivo.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      return;
    }

    // Validar tamaño (máx 10MB)
    if (archivo.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10MB');
      return;
    }

    setSubiendo(true);
    setProgreso(0);
    setError('');

    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('pdf', archivo);
      formData.append('tipoDocumento', tipoDocumento);
      formData.append('subidoPor', 'Admin');

      // Subir al backend con seguimiento de progreso
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const porcentaje = (e.loaded / e.total) * 100;
          setProgreso(porcentaje);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          
          if (data.success) {
            await cargarPDFs();
            setProgreso(0);
            setTipoDocumento('Manifiesto');
            alert('✅ PDF subido exitosamente');
          } else {
            setError(data.error || 'Error al subir PDF');
          }
        } else {
          setError('Error al subir archivo al servidor');
        }
        setSubiendo(false);
      });

      xhr.addEventListener('error', () => {
        setError('Error de conexión al subir el archivo');
        setSubiendo(false);
      });

      xhr.open('POST', `https://api.cooespatrans.com/api/pdfs/${codigoViaje}/upload`);
      xhr.send(formData);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al procesar el archivo');
      setSubiendo(false);
    }
  };

  const eliminarPDF = async (pdf) => {
    if (!window.confirm(`¿Eliminar "${pdf.nombre}"?`)) return;

    try {
      const res = await fetch(`https://api.cooespatrans.com/api/pdfs/${codigoViaje}/pdfs/${pdf._id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        await cargarPDFs();
        alert('✅ PDF eliminado exitosamente');
      } else {
        alert('❌ Error al eliminar: ' + data.error);
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('❌ Error al eliminar el archivo');
    }
  };

  const descargarPDF = (url, nombre) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const verPDF = (url) => {
    window.open(url, '_blank');
  };

  const formatearTamanio = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <FileText size={24} />
          <h3>Documentos PDF</h3>
          <span className={styles.badge}>{pdfs.length}</span>
        </div>
      </div>

      {/* Zona de subida */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadControls}>
          <select 
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            className={styles.selectTipo}
            disabled={subiendo}
          >
            <option value="Manifiesto">Manifiesto</option>
            <option value="otro">Otro</option>
          </select>

          <label className={`${styles.uploadButton} ${subiendo ? styles.disabled : ''}`}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => subirPDF(e.target.files[0])}
              disabled={subiendo}
              style={{ display: 'none' }}
            />
            {subiendo ? (
              <>
                <Loader2 size={18} className={styles.spin} />
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Subir PDF</span>
              </>
            )}
          </label>
        </div>

        {subiendo && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progreso}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>{Math.round(progreso)}%</span>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Lista de PDFs */}
      <div className={styles.pdfsList}>
        {cargando ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spin} />
            <p>Cargando documentos...</p>
          </div>
        ) : pdfs.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={48} />
            <p>No hay documentos PDF</p>
            <small>Sube el primer documento usando el botón de arriba</small>
          </div>
        ) : (
          pdfs.map((pdf) => (
            <div key={pdf._id} className={styles.pdfCard}>
              <div className={styles.pdfIcon}>
                <FileText size={24} />
              </div>
              
              <div className={styles.pdfInfo}>
                <h4>{pdf.nombre}</h4>
                <div className={styles.pdfMeta}>
                  <span className={styles.tipoBadge}>{pdf.tipoDocumento}</span>
                  <span>{formatearTamanio(pdf.tamanio)}</span>
                  <span>{formatearFecha(pdf.fechaSubida)}</span>
                </div>
              </div>

              <div className={styles.pdfActions}>
                <button
                  onClick={() => verPDF(pdf.url)}
                  className={styles.actionBtn}
                  title="Ver PDF"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => descargarPDF(pdf.url, pdf.nombre)}
                  className={styles.actionBtn}
                  title="Descargar"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => eliminarPDF(pdf)}
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}