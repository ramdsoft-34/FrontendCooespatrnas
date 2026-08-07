import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './Modal.module.css';

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar',
  message = '¿Está seguro de realizar esta acción?',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'confirm', // 'confirm', 'alert', 'info', 'warning'
  showCloseButton = true,
  confirmColor = 'primary' // 'primary', 'danger', 'success'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={48} className={styles.iconWarning} />;
      case 'alert':
        return <AlertCircle size={48} className={styles.iconAlert} />;
      case 'success':
        return <CheckCircle size={48} className={styles.iconSuccess} />;
      case 'info':
        return <Info size={48} className={styles.iconInfo} />;
      default:
        return <AlertCircle size={48} className={styles.iconConfirm} />;
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContainer}>
        {showCloseButton && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        )}

        <div className={styles.iconContainer}>
          {getIcon()}
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.buttonGroup}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.confirmButton} ${styles[confirmColor]}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}