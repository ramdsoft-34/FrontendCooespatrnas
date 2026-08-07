// frontend/src/components/Bodegas.js
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Building2, MapPin, Phone, User, Users, Navigation,
  Search, MoreVertical, Plus, Edit, Trash2, X, Save,
  FileText, Clock, DollarSign, UserCheck, AlertCircle,
  RefreshCw, Weight, Check
} from 'lucide-react';
import MapaRutas from './MapaRutas';
import Modal from './Modal';
import styles from './Bodegas.module.css';
import { authFetch } from '../utils/authFetch';

const API_BASE = 'https://api.cooespatrans.com/api';
const BASE_APP_URL = 'https://app.backend.cooespatrans.com';

export default function Bodegas() {
  const [bodegas, setBodegas] = useState([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null);
  // ── Planillas pendientes de la bodega ──────────────────────────────────────
  const [planillas, setPlanillas] = useState([]);
  const [planillaSeleccionada, setPlanillaSeleccionada] = useState(null);
  const [cargandoPlanillas, setCargandoPlanillas] = useState(false);
  const [mostrarModalNuevaPlanilla, setMostrarModalNuevaPlanilla] = useState(false);
  const [nuevaPlanillaInput, setNuevaPlanillaInput] = useState('');
  const [planillaAEliminar, setPlanillaAEliminar] = useState(null);
  const [eliminandoPlanilla, setEliminandoPlanilla] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [filtroClientes, setFiltroClientes] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [codigoViaje, setCodigoViaje] = useState('');
  const [valorFlete, setValorFlete] = useState('');
  const [mostrarModalFlete, setMostrarModalFlete] = useState(false);
  const [mostrarResumenViaje, setMostrarResumenViaje] = useState(false);

  const [choferes, setChoferes] = useState([]);
  const [cargandoChoferes, setCargandoChoferes] = useState(false);
  const [conductorSeleccionado, setConductorSeleccionado] = useState(null);
  const [busquedaConductor, setBusquedaConductor] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [modalBodegaAbierto, setModalBodegaAbierto] = useState(false);
  const [tipoModalBodega, setTipoModalBodega] = useState('');
  const [bodegaSeleccionadaModal, setBodegaSeleccionadaModal] = useState(null);
  const [guardandoBodega, setGuardandoBodega] = useState(false);
  const [menuBodegaAbierto, setMenuBodegaAbierto] = useState(null);

  // ── estados para editar planilla manualmente ──────────────────────
  const [editandoPlanilla, setEditandoPlanilla] = useState(false);
  const [numeroPlanillaInput, setNumeroPlanillaInput] = useState('');
  const [guardandoPlanilla, setGuardandoPlanilla] = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: '', message: '', type: 'info', confirmColor: 'primary'
  });

  const mostrarAlerta = (title, message, type = 'info', confirmColor = 'primary') =>
    setAlertModal({ isOpen: true, title, message, type, confirmColor });
  const cerrarAlerta = () =>
    setAlertModal({ isOpen: false, title: '', message: '', type: 'info', confirmColor: 'primary' });

  const formularioClienteVacio = {
    nunFactura: '', nombre: '', apellido: '', cedula: '', telefono: '',
    email: '', direccion: '', ciudad: '', departamento: '', pago: '',
    tipoFactura: 'contado', valorARecibir: '', plazoDias: '', pesoKg: '',
  };

  const [formularioCliente, setFormularioCliente] = useState(formularioClienteVacio);
  const [formularioBodega, setFormularioBodega] = useState({ nombre: '', direccion: '' });

  useEffect(() => { cargarBodegas(); }, []);

  useEffect(() => {
    const handler = () => setMenuBodegaAbierto(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Helpers de formato ────────────────────────────────────────────────────
  const formatCOP = (valor) => {
    if (!valor && valor !== 0) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Number(valor));
  };

  const formatCOPDetallado = (valor) => {
    if (!valor && valor !== 0) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(valor));
  };

  const parseFlete = (texto) => {
    if (!texto) return 0;
    let val = texto.toString().toLowerCase().replace(/[\$\s,\.]/g, '');
    if (val.includes('millon') || val.includes('millón'))
      return (parseFloat(val.replace(/millon.*|millón.*/g, '')) || 1) * 1000000;
    if (val.endsWith('m')) return (parseFloat(val) || 1) * 1000000;
    if (val.includes('k')) return (parseFloat(val.replace('k', '')) || 1) * 1000;
    return parseFloat(val) || 0;
  };

  const initials = (nombre) => {
    const p = nombre?.split(' ') || [];
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase();
  };

  // ── Planillas de los clientes ─────────────────────────────────────────────
  const obtenerPlanillas = () => {
    const set = new Set(clientes.map(c => c.numeroPlanilla).filter(Boolean));
    return [...set];
  };

  const obtenerCodigoViaje = () => {
    const planillas = obtenerPlanillas();
    return planillas.length > 0 ? planillas[0] : `VJ-${Date.now()}`;
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const calcularTotalesFacturas = () => {
    let totalContado = 0, totalCredito = 0, pesoTotal = 0;
    clientes.forEach(c => {
      const v = Number(c.valorARecibir) || 0;
      if (c.tipoFactura === 'contado') totalContado += v;
      else if (c.tipoFactura === 'credito') totalCredito += v;
      pesoTotal += Number(c.pesoKg) || 0;
    });
    return { totalContado, totalCredito, pesoTotal };
  };

  // ── Bodegas ───────────────────────────────────────────────────────────────
  const cargarBodegas = async () => {
    setCargando(true);
    try {
      const res = await authFetch(`${API_BASE}/bodegas`);
      const data = await res.json();
      setBodegas(data);
    } catch { setError('Error al cargar las bodegas'); }
    finally { setCargando(false); }
  };

  // Eliminar una planilla pendiente (borra sus clientes no asignados).
  const solicitarEliminarPlanilla = (planilla, e) => {
    if (e) e.stopPropagation();
    if (!planilla?.numeroPlanilla) {
      mostrarAlerta('No permitido', 'No se puede eliminar el grupo "Sin planilla".', 'warning', 'primary');
      return;
    }
    setPlanillaAEliminar(planilla);
  };

  const confirmarEliminarPlanilla = async () => {
    if (!planillaAEliminar) return;
    setEliminandoPlanilla(true);
    try {
      const res = await authFetch(
        `${API_BASE}/cargar/planillas/bodega/${bodegaSeleccionada._id}/${encodeURIComponent(planillaAEliminar.numeroPlanilla)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.ok) {
        setPlanillaAEliminar(null);
        mostrarAlerta('¡Éxito!', 'Planilla eliminada correctamente', 'success', 'success');
        await cargarPlanillas(bodegaSeleccionada._id);
      } else {
        mostrarAlerta('Error', data.mensaje || 'Error al eliminar la planilla', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al eliminar la planilla', 'alert', 'danger'); }
    finally { setEliminandoPlanilla(false); }
  };

  // Abrir una bodega → cargar sus planillas pendientes de asignación.
  const verClientesDeBodega = async (bodega) => {
    setBodegaSeleccionada(bodega);
    setPlanillaSeleccionada(null);
    setClientes([]);
    setError('');
    setCodigoViaje('');
    await cargarPlanillas(bodega._id);
  };

  const cargarPlanillas = async (bodegaId) => {
    setCargandoPlanillas(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/cargar/planillas/bodega/${bodegaId}`);
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : []);
    } catch { setError('Error al cargar las planillas'); }
    finally { setCargandoPlanillas(false); }
  };

  // Entrar a una planilla → mostrar únicamente sus clientes.
  const abrirPlanilla = (planilla) => {
    setPlanillaSeleccionada(planilla);
    setClientes(planilla.clientes || []);
    setFiltroClientes('');
    setCodigoViaje('');
    setError('');
  };

  // Volver de la vista de clientes a la lista de planillas de la bodega.
  const volverAPlanillas = async () => {
    setPlanillaSeleccionada(null);
    setClientes([]);
    setFiltroClientes('');
    setCodigoViaje('');
    setValorFlete('');
    setConductorSeleccionado(null);
    setBusquedaConductor('');
    setMostrarModalFlete(false);
    setMostrarResumenViaje(false);
    if (bodegaSeleccionada) await cargarPlanillas(bodegaSeleccionada._id);
  };

  // Crear una nueva planilla (vacía) dentro de la bodega actual.
  const abrirModalNuevaPlanilla = () => {
    setNuevaPlanillaInput('');
    setMostrarModalNuevaPlanilla(true);
  };

  const confirmarNuevaPlanilla = () => {
    const numero = nuevaPlanillaInput.trim();
    if (!numero) {
      mostrarAlerta('Campo requerido', 'Ingresa el número de la planilla', 'warning', 'primary');
      return;
    }
    if (planillas.some(p => p.numeroPlanilla && p.numeroPlanilla.toLowerCase() === numero.toLowerCase())) {
      mostrarAlerta('Planilla existente', `Ya existe una planilla pendiente con el número ${numero}`, 'warning', 'primary');
      return;
    }
    // Planilla nueva y vacía: se selecciona para empezar a agregarle clientes.
    const nueva = {
      numeroPlanilla: numero, sinPlanilla: false, estado: 'pendiente',
      clientes: [], totalClientes: 0, pesoTotal: 0, valorTotal: 0, fecha: new Date().toISOString(),
    };
    setPlanillas(prev => [nueva, ...prev]);
    setMostrarModalNuevaPlanilla(false);
    abrirPlanilla(nueva);
  };

  const volver = () => {
    setBodegaSeleccionada(null);
    setPlanillas([]);
    setPlanillaSeleccionada(null);
    setClientes([]);
    setFiltroClientes('');
    setError('');
    setCodigoViaje('');
    setValorFlete('');
    setConductorSeleccionado(null);
    setBusquedaConductor('');
    setMostrarModalFlete(false);
    setMostrarResumenViaje(false);
    setMostrarModalNuevaPlanilla(false);
    // ── resetear estados de planilla ──
    setEditandoPlanilla(false);
    setNumeroPlanillaInput('');
    setGuardandoPlanilla(false);
    cerrarModal();
  };

  // ── Guardar planilla manualmente ───────────────────────────────────
  const guardarPlanilla = async () => {
    const planillaLimpia = numeroPlanillaInput.trim();
    setGuardandoPlanilla(true);
    try {
      const res = await authFetch(`${API_BASE}/cargar/planilla/${bodegaSeleccionada._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroPlanilla: planillaLimpia || null }),
      });
      if (res.ok) {
        setEditandoPlanilla(false);
        await verClientesDeBodega(bodegaSeleccionada);
      } else {
        const d = await res.json();
        mostrarAlerta('Error', d.mensaje || 'No se pudo actualizar la planilla', 'alert', 'danger');
      }
    } catch {
      mostrarAlerta('Error', 'Error al actualizar la planilla', 'alert', 'danger');
    } finally {
      setGuardandoPlanilla(false);
    }
  };

  const abrirEditarPlanilla = (valorActual = '') => {
    setNumeroPlanillaInput(valorActual);
    setEditandoPlanilla(true);
  };

  const cancelarEditarPlanilla = () => {
    setEditandoPlanilla(false);
    setNumeroPlanillaInput('');
  };

  // ── Conductores ───────────────────────────────────────────────────────────
  const cargarChoferes = async () => {
    setCargandoChoferes(true);
    try {
      // 1. Disponibilidad de viajes (sin viaje activo)
      const resDisp = await authFetch(`${API_BASE}/viajes/choferes/disponibles`);
      const dataDisp = await resDisp.json();
      if (!dataDisp.success) return;
      const listaBase = dataDisp.choferes || [];

      // 2. Perfil completo — mismo endpoint que Conductores.js
      const resPerfiles = await fetch(`${BASE_APP_URL}/chofer/todos`);
      const dataPerfiles = await resPerfiles.json();
      const perfilMap = {};
      (Array.isArray(dataPerfiles) ? dataPerfiles : dataPerfiles.choferes || []).forEach(p => {
        perfilMap[p._id.toString()] = {
          perfilCompleto: !!p.perfilCompleto,
          activo: !!p.activo,
        };
      });

      // 3. Checklist semanal de cada chofer
      const checklistResults = await Promise.allSettled(
        listaBase.map(c =>
          fetch(`${BASE_APP_URL}/api/checklist/semanal/${c._id}`)
            .then(r => r.json())
            .then(d => ({ id: c._id.toString(), activo: d?.success === true && d?.data?.activo === true }))
        )
      );
      const checklistMap = {};
      checklistResults.forEach(r => {
        if (r.status === 'fulfilled') checklistMap[r.value.id] = r.value.activo;
      });

      // 4. Enriquecer: cruzar los tres datos
      const enriquecidos = listaBase.map(c => ({
        ...c,
        perfilCompleto: perfilMap[c._id.toString()]?.perfilCompleto ?? false,
        activo: perfilMap[c._id.toString()]?.activo ?? false,
        checklistActivo: checklistMap[c._id.toString()] ?? false,
      }));

      setChoferes(enriquecidos);
    } catch (err) {
      console.error('Error cargando conductores:', err);
    } finally {
      setCargandoChoferes(false);
    }
  };

  const choferesFiltrados = choferes.filter(c => {
    const t = busquedaConductor.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(t) ||
      c.placa?.toLowerCase().includes(t) ||
      c.telefono?.includes(t)
    );
  });

  // ── Flujo viaje ───────────────────────────────────────────────────────────
  const generarRuta = () => {
    if (clientes.length === 0) {
      mostrarAlerta('Sin clientes', 'No hay clientes disponibles para generar un viaje', 'warning', 'primary');
      return;
    }
    if (!planillaSeleccionada?.numeroPlanilla) {
      mostrarAlerta(
        'Sin número de planilla',
        'Esta planilla no tiene un número asignado. Usa "Agregar planilla" para crear una planilla con número.',
        'warning', 'primary'
      );
      return;
    }
    setConductorSeleccionado(null);
    setBusquedaConductor('');
    setMostrarModalFlete(true);
    cargarChoferes();
  };

  const continuarAResumen = () => {
    const valorNumerico = parseFlete(valorFlete);
    if (!valorFlete || valorNumerico <= 0) {
      mostrarAlerta('Valor inválido', 'Ingresa un valor de flete válido', 'warning', 'primary');
      return;
    }
    if (!conductorSeleccionado) {
      mostrarAlerta('Conductor requerido', 'Selecciona un conductor para continuar', 'warning', 'primary');
      return;
    }
    setMostrarModalFlete(false);
    setMostrarResumenViaje(true);
  };

  const volverAFlete = () => { setMostrarResumenViaje(false); setMostrarModalFlete(true); };

  const cancelarModalFlete = () => {
    setMostrarModalFlete(false);
    setValorFlete('');
    setConductorSeleccionado(null);
    setBusquedaConductor('');
  };

  const cancelarResumenViaje = () => {
    setMostrarResumenViaje(false);
    setValorFlete('');
    setConductorSeleccionado(null);
  }; const ordenEstado = (c) => {
    const realmente = c.disponible && c.perfilCompleto === true && c.checklistActivo === true;
    if (realmente) return 0;                          // Disponible → primero
    if (!c.perfilCompleto) return 2;                  // Sin perfil → último
    if (!c.checklistActivo) return 1;                 // Sin checklist → segundo
    return 1;                                         // En viaje → segundo también
  };

  const choferesMostrados = [...choferesFiltrados].sort((a, b) => ordenEstado(a) - ordenEstado(b));

  const confirmarGenerarViaje = async () => {
    const valorNumerico = parseFlete(valorFlete);
    const codigoPlanilla = planillaSeleccionada?.numeroPlanilla || obtenerCodigoViaje();
    try {
      const res = await authFetch(`${API_BASE}/viajes/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodegaId: bodegaSeleccionada._id,
          clientes: clientes.map(c => c._id),
          valorFlete: valorNumerico,
          numeroPlanilla: codigoPlanilla,
          choferId: conductorSeleccionado._id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAlerta(
          '¡Viaje generado!',
          `Planilla: ${data.codigo} — Asignado a ${conductorSeleccionado.nombre}\nFlete: ${formatCOPDetallado(valorNumerico)}`,
          'success', 'success'
        );
        setCodigoViaje(data.codigo);
        setMostrarResumenViaje(false);
        setValorFlete('');
        setConductorSeleccionado(null);
        // La planilla ya quedó asignada → volver a la lista; desaparece de pendientes.
        await volverAPlanillas();
      } else {
        if (data.codigo) {
          mostrarAlerta('Planilla ya existe', `Ya existe un viaje con la planilla: ${data.codigo}`, 'warning', 'primary');
          setMostrarResumenViaje(false);
          setValorFlete('');
        } else {
          mostrarAlerta('Error', data.mensaje || 'Error al generar el viaje', 'alert', 'danger');
        }
      }
    } catch { mostrarAlerta('Error', 'Error al generar el viaje', 'alert', 'danger'); }
  };

  // ── Clientes CRUD ─────────────────────────────────────────────────────────
  const cerrarModal = () => {
    setModalAbierto(false);
    setTipoModal('');
    setClienteSeleccionado(null);
    setFormularioCliente(formularioClienteVacio);
  };

  const abrirModalCrear = () => { setTipoModal('crear'); setModalAbierto(true); };

  const abrirModalEditar = (cliente) => {
    setTipoModal('editar');
    setClienteSeleccionado(cliente);
    setFormularioCliente({
      nunFactura: cliente.nunFactura || '',
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      cedula: cliente.cedula || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      departamento: cliente.departamento || '',
      pago: cliente.pago || '',
      tipoFactura: cliente.tipoFactura || 'contado',
      valorARecibir: cliente.valorARecibir || '',
      plazoDias: cliente.plazoDias || '',
      pesoKg: cliente.pesoKg || '',
    });
    setModalAbierto(true);
  };

  const abrirModalEliminar = (cliente) => {
    setTipoModal('eliminar');
    setClienteSeleccionado(cliente);
    setModalAbierto(true);
  };

  const crearCliente = async () => {
    if (!formularioCliente.nombre.trim()) {
      mostrarAlerta('Campo requerido', 'El nombre es requerido', 'warning', 'primary'); return;
    }
    if (!formularioCliente.nunFactura.trim()) {
      mostrarAlerta('Campo requerido', 'El número de factura es obligatorio', 'warning', 'primary'); return;
    }
    if (formularioCliente.tipoFactura === 'contado' && !formularioCliente.valorARecibir) {
      mostrarAlerta('Campo requerido', 'Para facturas de contado se requiere el valor a recibir', 'warning', 'primary'); return;
    }
    if (formularioCliente.tipoFactura === 'credito' && !formularioCliente.plazoDias) {
      mostrarAlerta('Campo requerido', 'Para facturas de crédito se requiere el plazo en días', 'warning', 'primary'); return;
    }
    setGuardando(true);
    try {
      const res = await authFetch(`${API_BASE}/clientes/individual`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodegaId: bodegaSeleccionada._id,
          ...formularioCliente,
          // El cliente se asocia a la planilla en la que estamos posicionados.
          numeroPlanilla: planillaSeleccionada?.numeroPlanilla || null,
          valorARecibir: formularioCliente.valorARecibir ? Number(formularioCliente.valorARecibir) : null,
          plazoDias: formularioCliente.plazoDias ? Number(formularioCliente.plazoDias) : null,
          pesoKg: formularioCliente.pesoKg ? Number(formularioCliente.pesoKg) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Cliente creado exitosamente', 'success', 'success');
        cerrarModal();
        await recargarClientesDePlanilla();
      } else {
        mostrarAlerta('Error', data.message || 'Error al crear el cliente', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al crear el cliente', 'alert', 'danger'); }
    finally { setGuardando(false); }
  };

  // Refresca la planilla actual tras crear/editar/eliminar un cliente, manteniendo
  // al admin dentro de la misma planilla.
  const recargarClientesDePlanilla = async () => {
    if (!bodegaSeleccionada) return;
    try {
      const res = await authFetch(`${API_BASE}/cargar/planillas/bodega/${bodegaSeleccionada._id}`);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setPlanillas(lista);
      const claveActual = planillaSeleccionada?.numeroPlanilla ?? null;
      const actualizada = lista.find(p => (p.numeroPlanilla ?? null) === claveActual);
      if (actualizada) {
        setPlanillaSeleccionada(actualizada);
        setClientes(actualizada.clientes || []);
      } else {
        // La planilla quedó vacía o ya no existe → volver a la lista.
        await volverAPlanillas();
      }
    } catch { setError('Error al recargar la planilla'); }
  };

  const actualizarCliente = async () => {
    if (!formularioCliente.nombre.trim()) {
      mostrarAlerta('Campo requerido', 'El nombre es requerido', 'warning', 'primary'); return;
    }
    if (formularioCliente.tipoFactura === 'contado' && !formularioCliente.valorARecibir) {
      mostrarAlerta('Campo requerido', 'Para facturas de contado se requiere el valor a recibir', 'warning', 'primary'); return;
    }
    if (formularioCliente.tipoFactura === 'credito' && !formularioCliente.plazoDias) {
      mostrarAlerta('Campo requerido', 'Para facturas de crédito se requiere el plazo en días', 'warning', 'primary'); return;
    }
    setGuardando(true);
    try {
      const res = await authFetch(`${API_BASE}/clientes/${clienteSeleccionado._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formularioCliente,
          valorARecibir: formularioCliente.valorARecibir ? Number(formularioCliente.valorARecibir) : null,
          plazoDias: formularioCliente.plazoDias ? Number(formularioCliente.plazoDias) : null,
          pesoKg: formularioCliente.pesoKg ? Number(formularioCliente.pesoKg) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Cliente actualizado exitosamente', 'success', 'success');
        cerrarModal();
        await recargarClientesDePlanilla();
      } else {
        mostrarAlerta('Error', data.message || 'Error al actualizar el cliente', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al actualizar el cliente', 'alert', 'danger'); }
    finally { setGuardando(false); }
  };

  const eliminarCliente = async () => {
    setGuardando(true);
    try {
      const res = await authFetch(`${API_BASE}/clientes/${clienteSeleccionado._id}`, { method: 'DELETE' });
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Cliente eliminado exitosamente', 'success', 'success');
        cerrarModal();
        await recargarClientesDePlanilla();
      } else {
        const d = await res.json();
        mostrarAlerta('Error', d.message || 'Error al eliminar', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al eliminar el cliente', 'alert', 'danger'); }
    finally { setGuardando(false); }
  };

  // ── Bodegas CRUD ──────────────────────────────────────────────────────────
  const cerrarModalBodega = () => {
    setModalBodegaAbierto(false);
    setTipoModalBodega('');
    setBodegaSeleccionadaModal(null);
    setFormularioBodega({ nombre: '', direccion: '' });
  };

  const abrirModalCrearBodega = () => { setTipoModalBodega('crear'); setModalBodegaAbierto(true); };

  const abrirModalEditarBodega = (bodega, e) => {
    e.stopPropagation();
    setTipoModalBodega('editar');
    setBodegaSeleccionadaModal(bodega);
    setFormularioBodega({ nombre: bodega.nombre || '', direccion: bodega.direccion || '' });
    setModalBodegaAbierto(true);
    setMenuBodegaAbierto(null);
  };

  const abrirModalEliminarBodega = (bodega, e) => {
    e.stopPropagation();
    setTipoModalBodega('eliminar');
    setBodegaSeleccionadaModal(bodega);
    setModalBodegaAbierto(true);
    setMenuBodegaAbierto(null);
  };

  const crearBodega = async () => {
    if (!formularioBodega.nombre.trim() || !formularioBodega.direccion.trim()) {
      mostrarAlerta('Campos requeridos', 'El nombre y la dirección son requeridos', 'warning', 'primary'); return;
    }
    setGuardandoBodega(true);
    try {
      const res = await authFetch(`${API_BASE}/bodegas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formularioBodega),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Bodega creada exitosamente', 'success', 'success');
        cerrarModalBodega();
        await cargarBodegas();
      } else {
        mostrarAlerta('Error', data.message || 'Error al crear la bodega', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al crear la bodega', 'alert', 'danger'); }
    finally { setGuardandoBodega(false); }
  };

  const actualizarBodega = async () => {
    if (!formularioBodega.nombre.trim() || !formularioBodega.direccion.trim()) {
      mostrarAlerta('Campos requeridos', 'El nombre y la dirección son requeridos', 'warning', 'primary'); return;
    }
    setGuardandoBodega(true);
    try {
      const res = await authFetch(`${API_BASE}/bodegas/${bodegaSeleccionadaModal._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formularioBodega),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Bodega actualizada exitosamente', 'success', 'success');
        cerrarModalBodega();
        await cargarBodegas();
        if (bodegaSeleccionada?._id === bodegaSeleccionadaModal._id) setBodegaSeleccionada(data);
      } else {
        mostrarAlerta('Error', data.message || 'Error al actualizar', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al actualizar la bodega', 'alert', 'danger'); }
    finally { setGuardandoBodega(false); }
  };

  const eliminarBodega = async () => {
    setGuardandoBodega(true);
    try {
      const res = await authFetch(`${API_BASE}/bodegas/${bodegaSeleccionadaModal._id}`, { method: 'DELETE' });
      if (res.ok) {
        mostrarAlerta('¡Éxito!', 'Bodega eliminada exitosamente', 'success', 'success');
        cerrarModalBodega();
        await cargarBodegas();
        if (bodegaSeleccionada?._id === bodegaSeleccionadaModal._id) volver();
      } else {
        const d = await res.json();
        mostrarAlerta('Error', d.message || 'Error al eliminar', 'alert', 'danger');
      }
    } catch { mostrarAlerta('Error', 'Error al eliminar la bodega', 'alert', 'danger'); }
    finally { setGuardandoBodega(false); }
  };

  const toggleMenuBodega = (id, e) => {
    e.stopPropagation();
    setMenuBodegaAbierto(menuBodegaAbierto === id ? null : id);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(filtroClientes.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(filtroClientes.toLowerCase()) ||
    c.telefono?.includes(filtroClientes) ||
    c.direccion?.toLowerCase().includes(filtroClientes.toLowerCase()) ||
    c.cedula?.includes(filtroClientes)
  );

  if (cargando && !bodegaSeleccionada) {
    return (
      <div className={styles.viajes}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Cargando bodegas...</p>
        </div>
      </div>
    );
  }

  // ── Estilos inline del modal de flete (nuevo diseño) ─────────────────────
  const S = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem', backdropFilter: 'blur(2px)',
    },
    modal: {
      background: 'white', borderRadius: 18, width: '100%',
      maxWidth: 680, maxHeight: '92vh', overflow: 'hidden',
      boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column',
      animation: 'modalPop .25s cubic-bezier(.34,1.56,.64,1)',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 24px 14px', borderBottom: '1px solid #f3f4f6',
      background: '#fafafa', flexShrink: 0,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
    stepDot: (active) => ({
      width: 7, height: 7, borderRadius: '50%',
      background: active ? '#639922' : '#e5e7eb',
    }),
    stepText: { fontSize: 12, color: '#9ca3af', fontWeight: 500 },
    divider: { width: 1, height: 14, background: '#e5e7eb' },
    headerTitle: { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 },
    closeBtn: {
      width: 32, height: 32, borderRadius: 8, border: 'none',
      background: 'none', cursor: 'pointer', color: '#9ca3af',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, transition: 'all .15s',
    },
    body: {
      padding: '20px 24px', display: 'flex', flexDirection: 'column',
      gap: 20, overflowY: 'auto', flex: 1,
    },
    planillaStrip: {
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', background: '#ede9fe',
      borderRadius: 10, border: '1px solid #c4b5fd',
    },
    planillaIconWrap: {
      width: 36, height: 36, borderRadius: 8, background: '#c4b5fd',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    planillaLabel: {
      fontSize: 11, color: '#7c3aed', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '.4px'
    },
    planillaNum: { fontSize: 18, fontWeight: 700, color: '#4c1d95', lineHeight: 1.2 },
    planillaSub: { fontSize: 11, color: '#7c3aed', marginLeft: 'auto', fontStyle: 'italic' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    fieldLabel: {
      fontSize: 11, fontWeight: 700, color: '#374151',
      textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6, display: 'block',
    },
    fleteWrap: { position: 'relative' },
    fletePrefix: {
      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
      fontSize: 14, color: '#9ca3af', pointerEvents: 'none',
    },
    fleteInput: {
      width: '100%', padding: '10px 12px 10px 26px',
      border: '1.5px solid #e5e7eb', borderRadius: 9,
      fontSize: 15, fontWeight: 600, color: '#111827',
      outline: 'none', transition: 'border-color .2s',
    },
    fleteConverted: {
      marginTop: 6, padding: '8px 12px', background: '#eff6ff',
      borderRadius: 8, fontSize: 13, color: '#1d4ed8', fontWeight: 600,
      border: '1px solid #bfdbfe',
    },
    sectionLabel: {
      fontSize: 11, fontWeight: 700, color: '#374151',
      textTransform: 'uppercase', letterSpacing: '.4px',
      marginBottom: 8, display: 'block',
    },
    searchBox: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 12px', border: '1.5px solid #e5e7eb',
      borderRadius: 9, background: '#f9fafb', marginBottom: 10,
    },
    searchInput: {
      border: 'none', background: 'transparent', outline: 'none',
      fontSize: 13, color: '#111827', width: '100%',
    },
    conductoresGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 10, maxHeight: 260, overflowY: 'auto',
      paddingRight: 2,
    },
    conductorCard: (sel, ocupado) => ({
      padding: 12, borderRadius: 10, cursor: 'pointer',
      transition: 'all .15s',
      border: sel ? '2px solid #639922' : '1.5px solid #e5e7eb',
      background: sel ? '#f0fdf4' : 'white',
      opacity: ocupado && !sel ? 0.65 : 1,
    }),
    conductorTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
    avatar: (sel, disponible) => ({
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700,
      background: sel ? '#86efac' : disponible ? '#dcfce7' : '#dbeafe',
      color: sel ? '#14532d' : disponible ? '#15803d' : '#1d4ed8',
      border: `1.5px solid ${sel ? '#4ade80' : disponible ? '#86efac' : '#93c5fd'}`,
    }),
    conductorName: {
      fontSize: 13, fontWeight: 700, color: '#111827',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    conductorPlaca: { fontSize: 11, color: '#6b7280', marginTop: 1 },
    conductorBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    statusPill: (disponible) => ({
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
      display: 'flex', alignItems: 'center', gap: 4,
      background: disponible ? '#dcfce7' : '#dbeafe',
      color: disponible ? '#15803d' : '#1d4ed8',
    }),
    statusDot: (disponible) => ({
      width: 5, height: 5, borderRadius: '50%',
      background: disponible ? '#16a34a' : '#2563eb',
    }),
    checkCircle: {
      width: 20, height: 20, borderRadius: '50%',
      background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    selBanner: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: '#f0fdf4',
      borderRadius: 10, border: '1.5px solid #86efac', marginTop: 8,
    },
    selBannerText: { fontSize: 13, color: '#065f46' },
    footer: {
      padding: '14px 24px', borderTop: '1px solid #f3f4f6',
      background: '#fafafa', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
    },
    footerHint: { fontSize: 12, color: '#9ca3af' },
    footerBtns: { display: 'flex', gap: 8 },
    btnCancel: {
      padding: '9px 18px', border: '1.5px solid #d1d5db',
      borderRadius: 9, background: 'white', cursor: 'pointer',
      fontSize: 13, color: '#6b7280', fontWeight: 500,
    },
    btnContinuar: (disabled) => ({
      padding: '9px 20px', border: 'none', borderRadius: 9,
      background: disabled ? '#d1d5db' : '#16a34a',
      color: disabled ? '#9ca3af' : 'white',
      fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .18s',
    }),
  };

  const fleteNumerico = parseFlete(valorFlete);
  const puedeContin = fleteNumerico > 0 && !!conductorSeleccionado;
  const todasLasPlanillas = obtenerPlanillas();
  const codigoPlanilla = obtenerCodigoViaje();

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.viajes}>
      {!bodegaSeleccionada ? (
        // ── Vista bodegas ───────────────────────────────────────────────────
        <div className={styles.bodegasView}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIconWrap}><Building2 size={26} /></div>
              <div>
                <h1 className={styles.title}>Gestión de Viajes</h1>
                <p className={styles.subtitle}>Selecciona una bodega para ver los clientes y planificar rutas</p>
              </div>
            </div>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <Building2 size={14} />
                <span className={styles.statValue}>{bodegas.length}</span>
                <span className={styles.statLabel}>Bodegas</span>
              </div>
              <button onClick={cargarBodegas} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', padding: '.55rem 1rem', background: 'white', color: '#374151', border: '1.5px solid #d1d5db', borderRadius: 9, fontSize: '.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all .18s', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <RefreshCw size={14} /> Actualizar
              </button>
              <button onClick={abrirModalCrearBodega} className={styles.createButton}>
                <Plus size={15} />Nueva Bodega
              </button>
            </div>
          </div>

          {error && <div className={styles.errorMessage}><AlertCircle size={16} /><span>{error}</span></div>}

          <div className={styles.bodegasGrid}>
            {bodegas.map(bodega => (
              <div key={bodega._id} className={styles.bodegaCard} onClick={() => verClientesDeBodega(bodega)}>
                <div className={styles.bodegaHeader}>
                  <Building2 size={22} className={styles.bodegaIcon} />
                  <div style={{ position: 'relative' }}>
                    <button className={styles.menuButton} onClick={e => toggleMenuBodega(bodega._id, e)}>
                      <MoreVertical size={15} />
                    </button>
                    {menuBodegaAbierto === bodega._id && (
                      <div className={styles.dropdownMenu}>
                        <button onClick={e => abrirModalEditarBodega(bodega, e)} className={styles.dropdownItem}>
                          <Edit size={13} />Editar bodega
                        </button>
                        <button onClick={e => abrirModalEliminarBodega(bodega, e)} className={styles.dropdownItemDanger}>
                          <Trash2 size={13} />Eliminar bodega
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.bodegaContent}>
                  <h3 className={styles.bodegaNombre}>{bodega.nombre}</h3>
                  <div className={styles.bodegaDireccion}><MapPin size={13} /><span>{bodega.direccion}</span></div>
                </div>
                <div className={styles.bodegaFooter}>
                  <span className={styles.bodegaClientes}><Users size={13} />Ver clientes</span>
                </div>
              </div>
            ))}
          </div>

          {bodegas.length === 0 && !error && (
            <div className={styles.emptyState}>
              <Building2 size={50} />
              <h3>No hay bodegas disponibles</h3>
              <p>Crea tu primera bodega para comenzar a gestionar viajes</p>
              <button onClick={abrirModalCrearBodega} className={styles.createFirstButton} style={{ marginTop: '1rem' }}>
                <Plus size={15} />Crear primera bodega
              </button>
            </div>
          )}
        </div>

      ) : !planillaSeleccionada ? (
        // ── Vista planillas de la bodega ────────────────────────────────────
        <div className={styles.clientesView}>
          <div className={styles.clientesHeader}>
            <button onClick={volver} className={styles.backButton}>
              <ArrowLeft size={16} />Volver a bodegas
            </button>
            <div className={styles.clientesInfo}>
              <div className={styles.bodegaSelected}>
                <Building2 size={22} />
                <div>
                  <h2 className={styles.bodegaNombreSelected}>{bodegaSeleccionada.nombre}</h2>
                  <span className={styles.bodegaDireccionSelected}>
                    <MapPin size={13} />{bodegaSeleccionada.direccion}
                  </span>
                </div>
              </div>
              <div className={styles.clientesStats}>
                <button onClick={abrirModalNuevaPlanilla} className={styles.createButton}>
                  <Plus size={15} />Agregar planilla
                </button>
                <div className={styles.statCard}>
                  <FileText size={14} />
                  <span className={styles.statValue}>{planillas.length}</span>
                  <span className={styles.statLabel}>Planillas</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.planillasContent}>
            {error && <div className={styles.errorMessage}><AlertCircle size={16} /><span>{error}</span></div>}

            {cargandoPlanillas ? (
              <div className={styles.emptyState}><div className={styles.spinner} /><p>Cargando planillas...</p></div>
            ) : planillas.length === 0 ? (
              <div className={styles.emptyState}>
                <FileText size={50} />
                <h3>No hay planillas pendientes</h3>
                <p>Carga clientes desde el módulo "Cargar" o crea una planilla con el botón "Agregar planilla".</p>
                <button onClick={abrirModalNuevaPlanilla} className={styles.createFirstButton} style={{ marginTop: '1rem' }}>
                  <Plus size={15} />Crear planilla
                </button>
              </div>
            ) : (
              <div className={styles.planillasGrid}>
                {planillas.map((p, idx) => (
                  <div
                    key={p.numeroPlanilla || `sin-${idx}`}
                    className={styles.planillaCard}
                    onClick={() => abrirPlanilla(p)}
                  >
                    <div className={styles.planillaCardHeader}>
                      <FileText size={20} className={styles.bodegaIcon} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={styles.planillaBadge}>Pendiente</span>
                        {p.numeroPlanilla && (
                          <button
                            className={styles.deleteButton}
                            onClick={e => solicitarEliminarPlanilla(p, e)}
                            title="Eliminar planilla"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.planillaCardBody}>
                      <h3 className={styles.planillaNumero}>
                        {p.numeroPlanilla ? `Planilla ${p.numeroPlanilla}` : 'Sin planilla'}
                      </h3>
                      <div className={styles.planillaStatsRow}>
                        <span className={styles.planillaStat}>
                          <Users size={12} />{p.totalClientes} cliente(s)
                        </span>
                        {p.valorTotal > 0 && (
                          <span className={`${styles.planillaStat} ${styles.planillaStatValor}`}>
                            <DollarSign size={12} />{formatCOP(p.valorTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.planillaCardFooter}>
                      <span className={styles.planillaVerLink}>
                        <Navigation size={13} />Ver y asignar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Modal: crear nueva planilla ── */}
          {mostrarModalNuevaPlanilla && (
            <div className={styles.modalOverlay} onClick={() => setMostrarModalNuevaPlanilla(false)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className={styles.modalHeader}>
                  <h3><FileText size={18} style={{ marginRight: 8 }} />Nueva planilla</h3>
                  <button onClick={() => setMostrarModalNuevaPlanilla(false)} className={styles.modalClose}><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>
                  <label className={styles.formLabel}>Número de planilla *</label>
                  <input
                    type="text"
                    value={nuevaPlanillaInput}
                    onChange={e => setNuevaPlanillaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmarNuevaPlanilla(); }}
                    placeholder="Ej: 1024"
                    className={styles.formInput}
                    autoFocus
                  />
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    La planilla quedará pendiente de asignación. Podrás agregarle clientes y luego asignarle un conductor.
                  </p>
                </div>
                <div className={styles.modalFooter}>
                  <button onClick={() => setMostrarModalNuevaPlanilla(false)} className={styles.cancelButton}>Cancelar</button>
                  <button onClick={confirmarNuevaPlanilla} className={styles.saveButton}>
                    <Save size={15} />Crear planilla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal: eliminar planilla ── */}
          {planillaAEliminar && (
            <div className={styles.modalOverlay} onClick={() => !eliminandoPlanilla && setPlanillaAEliminar(null)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                <div className={styles.modalHeader}>
                  <h3>🗑️ Eliminar planilla</h3>
                  <button onClick={() => setPlanillaAEliminar(null)} className={styles.modalClose} disabled={eliminandoPlanilla}><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>
                  <p>
                    Se eliminará la <strong>Planilla {planillaAEliminar.numeroPlanilla}</strong> y
                    sus <strong>{planillaAEliminar.totalClientes} cliente(s)</strong> pendiente(s).
                  </p>
                  <p className={styles.warningText}>Esta acción no se puede deshacer.</p>
                </div>
                <div className={styles.modalFooter}>
                  <button onClick={() => setPlanillaAEliminar(null)} className={styles.cancelButton} disabled={eliminandoPlanilla}>Cancelar</button>
                  <button onClick={confirmarEliminarPlanilla} className={styles.deleteConfirmButton} disabled={eliminandoPlanilla}>
                    {eliminandoPlanilla
                      ? <><div className={styles.spinner} style={{ width: 14, height: 14 }} />Eliminando...</>
                      : <><Trash2 size={14} />Eliminar planilla</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : (
        // ── Vista clientes (dentro de una planilla) ─────────────────────────
        <div className={styles.clientesView}>
          <div className={styles.clientesHeader}>
            <button onClick={volverAPlanillas} className={styles.backButton}>
              <ArrowLeft size={16} />Volver a planillas
            </button>
            <div className={styles.clientesInfo}>
              <div className={styles.bodegaSelected}>
                <Building2 size={22} />
                <div>
                  <h2 className={styles.bodegaNombreSelected}>{bodegaSeleccionada.nombre}</h2>
                  <span className={styles.bodegaDireccionSelected}>
                    <MapPin size={13} />{bodegaSeleccionada.direccion}
                  </span>
                </div>
              </div>
              <div className={styles.clientesStats}>

                {/* ── Planilla actual (solo lectura) ────────────────────── */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#ede9fe', color: '#6d28d9', fontWeight: 700,
                  fontSize: 12, padding: '4px 12px',
                  borderRadius: 20, border: '1px solid #c4b5fd',
                }}>
                  📋 {planillaSeleccionada.numeroPlanilla
                    ? `Planilla ${planillaSeleccionada.numeroPlanilla}`
                    : 'Sin planilla'}
                </span>

                <div className={styles.statCard}>
                  <Users size={14} />
                  <span className={styles.statValue}>{clientes.length}</span>
                  <span className={styles.statLabel}>Clientes</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.clientesContent}>
            <div className={styles.clientesSection}>
              <div className={styles.clientesControls}>
                <div className={styles.searchBox}>
                  <Search size={16} />
                  <input type="text" placeholder="Buscar clientes..." value={filtroClientes}
                    onChange={e => setFiltroClientes(e.target.value)} className={styles.searchInput} />
                </div>
                <div className={styles.clientesActions}>
                  <button onClick={abrirModalCrear} className={styles.createButton}>
                    <Plus size={14} />Nuevo Cliente
                  </button>
                  <button onClick={generarRuta} className={styles.routeButton} disabled={clientes.length === 0}>
                    <Navigation size={14} />
                    {clientes.length === 0 ? 'Sin clientes' : 'Generar viaje'}
                  </button>
                </div>
              </div>

              {codigoViaje && (
                <div className={styles.codigoViajeBox}>
                  ✅ Viaje generado con planilla: <strong>{codigoViaje}</strong>
                  <br />
                  <small style={{ color: '#065f46', opacity: .8 }}>Los clientes ya están asignados al viaje y aparecerán en "Viajes"</small>
                </div>
              )}

              {error && <div className={styles.errorMessage}><AlertCircle size={16} /><span>{error}</span></div>}

              <div className={styles.clientesList}>
                {clientesFiltrados.map(cliente => (
                  <div key={cliente._id} className={styles.clienteCard}>
                    <div className={styles.clienteAvatar}><User size={18} /></div>
                    <div className={styles.clienteInfo}>
                      <h4 className={styles.clienteNombre}>{cliente.nombre} {cliente.apellido}</h4>
                      <div className={styles.clienteDetails}>
                        {cliente.telefono && <div className={styles.clienteDetail}><Phone size={12} /><span>{cliente.telefono}</span></div>}
                        {cliente.direccion && <div className={styles.clienteDetail}><MapPin size={12} /><span>{cliente.direccion}</span></div>}
                        {cliente.nunFactura && <div className={styles.clienteDetail}><FileText size={12} /><span>Factura: {cliente.nunFactura}</span></div>}
                        {cliente.numeroPlanilla && (
                          <div className={styles.clienteDetail} style={{ color: '#6d28d9', fontSize: 11 }}>
                            <FileText size={11} /><span>Planilla: {cliente.numeroPlanilla}</span>
                          </div>
                        )}
                        {cliente.tipoFactura === 'contado' && cliente.valorARecibir && (
                          <div className={styles.clienteDetail} style={{ color: '#059669', fontWeight: 700 }}>
                            <DollarSign size={12} /><span>Contado: {formatCOPDetallado(cliente.valorARecibir)}</span>
                          </div>
                        )}
                        {cliente.tipoFactura === 'credito' && (
                          <div className={styles.clienteDetail} style={{ color: '#d97706', fontWeight: 700 }}>
                            <Clock size={12} />
                            <span>Crédito: {cliente.plazoDias} días</span>
                            {cliente.valorARecibir && <span style={{ marginLeft: '.4rem' }}>({formatCOPDetallado(cliente.valorARecibir)})</span>}
                          </div>
                        )}
                        {cliente.pesoKg && (
                          <div className={styles.clienteDetail} style={{ color: '#9ca3af', fontSize: 11 }}>
                            <Weight size={11} /><span>{cliente.pesoKg} Kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.clienteActions}>
                      <button className={styles.editButton} onClick={() => abrirModalEditar(cliente)} title="Editar"><Edit size={14} /></button>
                      <button className={styles.deleteButton} onClick={() => abrirModalEliminar(cliente)} title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {clientesFiltrados.length === 0 && filtroClientes && (
                <div className={styles.emptySearch}><Search size={44} /><h3>No se encontraron clientes</h3><p>Intenta con otros términos</p></div>
              )}
              {clientes.length === 0 && !filtroClientes && !codigoViaje && (
                <div className={styles.emptyState}><Users size={44} /><h3>No hay clientes disponibles</h3><p>Esta bodega no tiene clientes disponibles</p></div>
              )}
              {clientes.length === 0 && codigoViaje && (
                <div className={styles.emptyState}>
                  <Navigation size={44} />
                  <h3>Viaje generado exitosamente</h3>
                  <p>Todos los clientes han sido asignados al viaje <strong>{codigoViaje}</strong></p>
                </div>
              )}
            </div>

            <div className={styles.mapSection}>
              <MapaRutas bodega={bodegaSeleccionada} clientes={clientesFiltrados.length > 0 ? clientesFiltrados : clientes}
                codigoViaje={codigoViaje} />

            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Datos del Viaje — NUEVO DISEÑO ════ */}
      {mostrarModalFlete && (
        <div style={S.overlay}>
          <div style={S.modal}>

            {/* Header */}
            <div style={S.header}>
              <div style={S.headerLeft}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={S.stepDot(true)} />
                  <div style={S.stepDot(true)} />
                  <div style={S.stepDot(false)} />
                  <span style={S.stepText}>Paso 1 de 2</span>
                </div>
                <div style={S.divider} />
                <h3 style={S.headerTitle}>Datos del viaje</h3>
              </div>
              <button style={S.closeBtn} onClick={cancelarModalFlete}>✕</button>
            </div>

            {/* Body */}
            <div style={S.body}>

              {/* Planilla — solo lectura */}
              <div style={S.planillaStrip}>
                <div style={S.planillaIconWrap}>
                  <FileText size={18} color="#4c1d95" />
                </div>
                <div>
                  <div style={S.planillaLabel}>Número de planilla</div>
                  <div style={S.planillaNum}>
                    {todasLasPlanillas.length > 0
                      ? todasLasPlanillas.join(' · ')
                      : <span style={{ color: '#9ca3af', fontSize: 14 }}>Sin planilla asignada</span>
                    }
                  </div>
                </div>
                <div style={S.planillaSub}>Del Excel o ingresada manualmente</div>
              </div>

              {/* Flete */}
              <div>
                <label style={S.fieldLabel}>Valor del flete (COP) *</label>
                <div style={S.fleteWrap}>
                  <span style={S.fletePrefix}>$</span>
                  <input
                    type="text"
                    value={valorFlete}
                    onChange={e => setValorFlete(e.target.value)}
                    placeholder='50.000 · 1 millón · 1.5m'
                    style={S.fleteInput}
                    onFocus={e => e.target.style.borderColor = '#639922'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                {fleteNumerico > 0 && (
                  <div style={S.fleteConverted}>
                    Equivale a: <strong>{formatCOP(fleteNumerico)}</strong>
                  </div>
                )}
              </div>

              {/* Conductores */}
              <div>
                <label style={S.sectionLabel}>
                  Conductor asignado *
                  {cargandoChoferes && <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', marginLeft: 8 }}>Cargando...</span>}
                </label>

                {/* Búsqueda */}
                <div style={S.searchBox}>
                  <Search size={14} color="#9ca3af" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o placa..."
                    value={busquedaConductor}
                    onChange={e => setBusquedaConductor(e.target.value)}
                    style={S.searchInput}
                  />
                  {busquedaConductor && (
                    <button onClick={() => setBusquedaConductor('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Grilla de conductores */}
                {cargandoChoferes ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                    <div className={styles.spinner} style={{ margin: '0 auto 8px' }} />
                    Cargando conductores...
                  </div>
                ) : choferesFiltrados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                    {busquedaConductor ? 'Sin resultados para esa búsqueda' : 'No hay conductores disponibles'}
                  </div>
                ) : (
                  <div style={S.conductoresGrid}>
                    {choferesMostrados.map(c => {
                      const sel = conductorSeleccionado?._id === c._id;
                      const realmente = c.disponible && c.perfilCompleto === true && c.checklistActivo === true;

                      // 🆕 Determinar estado y colores
                      const estado = realmente
                        ? 'disponible'
                        : !c.disponible
                          ? 'en_viaje'
                          : !c.perfilCompleto
                            ? 'sin_perfil'
                            : 'sin_checklist';

                      const estadoConfig = {
                        disponible: { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', label: 'Disponible' },
                        en_viaje: { bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb', label: `En viaje${c.viajeActual?.codigoViaje ? ` · ${c.viajeActual.codigoViaje}` : ''}` },
                        sin_perfil: { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', label: 'Perfil incompleto' },
                        sin_checklist: { bg: '#fef3c7', color: '#d97706', dot: '#f59e0b', label: 'Sin checklist' },
                      }[estado];

                      const avatarConfig = {
                        disponible: { bg: sel ? '#86efac' : '#dcfce7', color: sel ? '#14532d' : '#15803d', border: sel ? '#4ade80' : '#86efac' },
                        en_viaje: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
                        sin_perfil: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
                        sin_checklist: { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
                      }[estado];

                      return (
                        <div
                          key={c._id}
                          style={S.conductorCard(sel, !realmente)}
                          onClick={() => setConductorSeleccionado(sel ? null : c)}
                        >
                          <div style={S.conductorTop}>
                            {/* 🆕 Avatar con color por estado */}
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700,
                              background: avatarConfig.bg,
                              color: avatarConfig.color,
                              border: `1.5px solid ${avatarConfig.border}`,
                            }}>
                              {((c.nombre?.split(' ')[0]?.[0] || '?') + (c.nombre?.split(' ')[1]?.[0] || '')).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={S.conductorName}>{c.nombre}</div>
                              {c.placa && <div style={S.conductorPlaca}>{c.placa}</div>}
                            </div>
                          </div>

                          <div style={S.conductorBottom}>
                            {/* 🆕 Pill con color por estado */}
                            <div style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: estadoConfig.bg,
                              color: estadoConfig.color,
                            }}>
                              <div style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: estadoConfig.dot,
                              }} />
                              {estadoConfig.label}
                            </div>

                            {sel && (
                              <div style={S.checkCircle}>
                                <Check size={11} color="white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Banner de confirmación */}
                {conductorSeleccionado && (
                  <div style={S.selBanner}>
                    <UserCheck size={16} color="#16a34a" />
                    <div style={S.selBannerText}>
                      <strong>{conductorSeleccionado.nombre}</strong>
                      {conductorSeleccionado.placa && <span style={{ color: '#6b7280', marginLeft: 6 }}>· {conductorSeleccionado.placa}</span>}
                      {!conductorSeleccionado.disponible && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                          ⚠ Ya tiene un viaje activo
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={S.footer}>
              <span style={S.footerHint}>
                {!conductorSeleccionado && fleteNumerico <= 0
                  ? 'Ingresa el flete y selecciona un conductor'
                  : !conductorSeleccionado
                    ? 'Selecciona un conductor para continuar'
                    : fleteNumerico <= 0
                      ? 'Ingresa el valor del flete'
                      : `${conductorSeleccionado.nombre} · ${formatCOP(fleteNumerico)}`
                }
              </span>
              <div style={S.footerBtns}>
                <button style={S.btnCancel} onClick={cancelarModalFlete}>Cancelar</button>
                <button style={S.btnContinuar(!puedeContin)} onClick={continuarAResumen} disabled={!puedeContin}>
                  Ver resumen →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Resumen del Viaje ════ */}
      {mostrarResumenViaje && (() => {
        const { totalContado, totalCredito, pesoTotal } = calcularTotalesFacturas();
        const valorFleteNumerico = parseFlete(valorFlete);
        return (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: 600 }}>
              <div className={styles.modalHeader}>
                <h3>📊 Resumen del Viaje</h3>
                <button onClick={cancelarResumenViaje} className={styles.closeButton}><X size={18} /></button>
              </div>
              <div className={styles.modalContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* Planilla */}
                  <div style={{ padding: '1rem', background: '#ede9fe', borderRadius: 10, border: '1.5px solid #c4b5fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 4 }}>
                      <FileText size={16} color="#6d28d9" />
                      <strong style={{ color: '#6d28d9', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                        {todasLasPlanillas.length > 1 ? 'Planillas del Viaje' : 'Número de Planilla'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: '1.5rem' }}>
                      {todasLasPlanillas.map((p, idx) => (
                        <div key={p}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#4c1d95' }}>{p}</span>
                          {idx === 0 && todasLasPlanillas.length > 1 && (
                            <span style={{ fontSize: 10, color: '#7c3aed', marginLeft: 4 }}>(código principal)</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <small style={{ color: '#7c3aed', fontSize: '.72rem', marginLeft: '1.5rem', display: 'block', marginTop: 4 }}>
                      Código del viaje: <strong>{codigoPlanilla}</strong>
                    </small>
                  </div>

                  {/* Conductor */}
                  {conductorSeleccionado && (
                    <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #6ee7b7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 4 }}>
                        <UserCheck size={16} color="#10b981" />
                        <strong style={{ color: '#059669', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.5px' }}>Conductor Asignado</strong>
                      </div>
                      <div style={{ marginLeft: '1.5rem' }}>
                        <p style={{ fontWeight: 700, color: '#065f46', fontSize: '.975rem', margin: '0 0 2px' }}>{conductorSeleccionado.nombre}</p>
                        {conductorSeleccionado.placa && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Placa: {conductorSeleccionado.placa}</p>}
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: conductorSeleccionado.disponible ? '#dcfce7' : '#dbeafe', color: conductorSeleccionado.disponible ? '#15803d' : '#1d4ed8', border: `1px solid ${conductorSeleccionado.disponible ? '#86efac' : '#93c5fd'}` }}>
                          {conductorSeleccionado.disponible ? '● Disponible' : `● En viaje ${conductorSeleccionado.viajeActual?.codigoViaje || ''}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Totales */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                    <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: 10, border: '1.5px solid #6ee7b7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: 4 }}>
                        <DollarSign size={14} color="#10b981" />
                        <strong style={{ color: '#059669', fontSize: '.75rem', textTransform: 'uppercase' }}>Facturas Contado</strong>
                      </div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#047857', margin: 0 }}>{formatCOPDetallado(totalContado)}</p>
                      <small style={{ color: '#6b7280', fontSize: '.7rem' }}>El chofer debe recibir este valor</small>
                    </div>
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: 10, border: '1.5px solid #fcd34d' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: 4 }}>
                        <Clock size={14} color="#f59e0b" />
                        <strong style={{ color: '#d97706', fontSize: '.75rem', textTransform: 'uppercase' }}>Facturas Crédito</strong>
                      </div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309', margin: 0 }}>{formatCOPDetallado(totalCredito)}</p>
                      <small style={{ color: '#6b7280', fontSize: '.7rem' }}>No se recibe pago inmediato</small>
                    </div>
                    <div style={{ padding: '1rem', background: '#f5f3ff', borderRadius: 10, border: '1.5px solid #c4b5fd', gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: 4 }}>
                        <Weight size={14} color="#7c3aed" />
                        <strong style={{ color: '#7c3aed', fontSize: '.75rem', textTransform: 'uppercase' }}>Peso Total Acumulado</strong>
                      </div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#6d28d9', margin: 0 }}>{pesoTotal.toFixed(2)} Kg</p>
                    </div>
                  </div>

                  {/* Flete */}
                  <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: 10, border: '1.5px solid #93c5fd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: 4 }}>
                      <Navigation size={15} color="#3b82f6" />
                      <strong style={{ color: '#2563eb', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.5px' }}>Valor del Flete</strong>
                    </div>
                    <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0 1.5rem' }}>{formatCOPDetallado(valorFleteNumerico)}</p>
                  </div>

                  {/* Total a recibir */}
                  <div style={{ padding: '1.1rem', background: '#f0fdf4', borderRadius: 10, border: '2px solid #22c55e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 6 }}>
                      <DollarSign size={20} color="#22c55e" />
                      <strong style={{ fontSize: '.925rem', color: '#16a34a' }}>Total que el Chofer Debe Recibir</strong>
                    </div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', margin: '0 0 2px 1.75rem' }}>{formatCOPDetallado(totalContado)}</p>
                    <small style={{ color: '#6b7280', marginLeft: '1.75rem', display: 'block' }}>(Solo facturas de contado)</small>
                  </div>

                  {/* Cantidad clientes */}
                  <div style={{ padding: '.75rem 1rem', background: '#f9fafb', borderRadius: 9, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <Users size={15} color="#9ca3af" />
                      <span style={{ color: '#6b7280', fontWeight: 500, fontSize: '.875rem' }}>Total de clientes en el viaje:</span>
                    </div>
                    <strong style={{ fontSize: '1rem', color: '#111827' }}>{clientes.length}</strong>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={volverAFlete} className={styles.cancelButton}>← Volver atrás</button>
                <button onClick={confirmarGenerarViaje} className={styles.saveButton} style={{ background: '#22c55e' }}>
                  <Navigation size={15} />Confirmar y Generar Viaje
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ MODAL: Clientes ════ */}
      {modalAbierto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {tipoModal === 'crear' && '➕ Crear Cliente'}
                {tipoModal === 'editar' && '✏️ Editar Cliente'}
                {tipoModal === 'eliminar' && '🗑️ Eliminar Cliente'}
              </h3>
              <button onClick={cerrarModal} className={styles.closeButton}><X size={18} /></button>
            </div>
            <div className={styles.modalContent}>
              {tipoModal === 'eliminar' ? (
                <div className={styles.deleteConfirmation}>
                  <p>¿Estás seguro de que quieres eliminar este cliente?</p>
                  <div className={styles.clienteToDelete}>
                    <strong>{clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}</strong>
                    <small>{clienteSeleccionado?.telefono} • {clienteSeleccionado?.direccion}</small>
                  </div>
                  <p className={styles.warningText}>Esta acción no se puede deshacer.</p>
                </div>
              ) : (
                <div className={styles.formulario}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Núm. Factura *</label>
                      <input type="text" value={formularioCliente.nunFactura}
                        onChange={e => setFormularioCliente(p => ({ ...p, nunFactura: e.target.value }))}
                        placeholder="Número de factura" required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Cédula / NIT</label>
                      <input type="text" value={formularioCliente.cedula}
                        onChange={e => setFormularioCliente(p => ({ ...p, cedula: e.target.value }))}
                        placeholder="Número de cédula o NIT" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Nombre *</label>
                      <input type="text" value={formularioCliente.nombre}
                        onChange={e => setFormularioCliente(p => ({ ...p, nombre: e.target.value }))}
                        placeholder="Nombre del cliente" required />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Apellido</label>
                      <input type="text" value={formularioCliente.apellido}
                        onChange={e => setFormularioCliente(p => ({ ...p, apellido: e.target.value }))}
                        placeholder="Apellido del cliente" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Teléfono</label>
                      <input type="tel" value={formularioCliente.telefono}
                        onChange={e => setFormularioCliente(p => ({ ...p, telefono: e.target.value }))}
                        placeholder="Número de teléfono" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email</label>
                      <input type="email" value={formularioCliente.email}
                        onChange={e => setFormularioCliente(p => ({ ...p, email: e.target.value }))}
                        placeholder="Correo electrónico" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Dirección</label>
                    <input type="text" value={formularioCliente.direccion}
                      onChange={e => setFormularioCliente(p => ({ ...p, direccion: e.target.value }))}
                      placeholder="Dirección completa" />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Ciudad</label>
                      <input type="text" value={formularioCliente.ciudad}
                        onChange={e => setFormularioCliente(p => ({ ...p, ciudad: e.target.value }))}
                        placeholder="Ciudad" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Departamento</label>
                      <input type="text" value={formularioCliente.departamento}
                        onChange={e => setFormularioCliente(p => ({ ...p, departamento: e.target.value }))}
                        placeholder="Departamento" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Forma de Pago</label>
                      <select value={formularioCliente.pago}
                        onChange={e => setFormularioCliente(p => ({ ...p, pago: e.target.value }))}>
                        <option value="">Seleccionar método</option>
                        <option value="EFE">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CONTRAENTREGA">Contraentrega</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Tipo de Factura *</label>
                      <select
                        value={formularioCliente.tipoFactura}
                        onChange={e => setFormularioCliente(p => ({
                          ...p,
                          tipoFactura: e.target.value,
                          valorARecibir: e.target.value === 'credito' ? '' : p.valorARecibir,
                          plazoDias: e.target.value === 'contado' ? '' : p.plazoDias,
                        }))}
                        style={{ fontWeight: 700, color: formularioCliente.tipoFactura === 'contado' ? '#059669' : '#d97706' }}>
                        <option value="contado">💵 Contado</option>
                        <option value="credito">⏱️ Crédito</option>
                      </select>
                    </div>
                  </div>
                  {formularioCliente.tipoFactura === 'contado' ? (
                    <div className={styles.formGroup}>
                      <label>Valor a Recibir (COP) *</label>
                      <input type="number" value={formularioCliente.valorARecibir}
                        onChange={e => setFormularioCliente(p => ({ ...p, valorARecibir: e.target.value }))}
                        placeholder="0.00" min="0" step="0.01" required
                        style={{ borderColor: '#6ee7b7', fontWeight: 700 }} />
                      <small style={{ color: '#059669', fontWeight: 600, fontSize: '.775rem' }}>💵 El chofer debe recibir este valor</small>
                      {formularioCliente.valorARecibir && (
                        <div style={{ marginTop: '.4rem', padding: '.5rem .875rem', background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 8 }}>
                          <strong style={{ color: '#059669', fontSize: '.875rem' }}>{formatCOPDetallado(formularioCliente.valorARecibir)}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>Plazo en Días *</label>
                        <input type="number" value={formularioCliente.plazoDias}
                          onChange={e => setFormularioCliente(p => ({ ...p, plazoDias: e.target.value }))}
                          placeholder="30" min="1" required style={{ borderColor: '#fcd34d', fontWeight: 700 }} />
                        <small style={{ color: '#d97706', fontWeight: 600, fontSize: '.775rem' }}>⏱️ Número de días para el pago</small>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Valor de la Factura (Referencia)</label>
                        <input type="number" value={formularioCliente.valorARecibir}
                          onChange={e => setFormularioCliente(p => ({ ...p, valorARecibir: e.target.value }))}
                          placeholder="0.00" min="0" step="0.01" style={{ borderColor: '#fcd34d' }} />
                        <small style={{ color: '#9ca3af', fontSize: '.775rem' }}>Opcional</small>
                      </div>
                    </div>
                  )}
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Peso (Kg)</label>
                      <input type="number" value={formularioCliente.pesoKg}
                        onChange={e => setFormularioCliente(p => ({ ...p, pesoKg: e.target.value }))}
                        placeholder="0.00" min="0" step="0.01" />
                      <small style={{ color: '#9ca3af', fontSize: '.775rem' }}>Opcional</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={cerrarModal} className={styles.cancelButton}>Cancelar</button>
              <button
                onClick={tipoModal === 'crear' ? crearCliente : tipoModal === 'editar' ? actualizarCliente : eliminarCliente}
                className={tipoModal === 'eliminar' ? styles.deleteConfirmButton : styles.saveButton}
                disabled={guardando}
              >
                {guardando
                  ? <><div className={styles.spinner}></div>Guardando...</>
                  : <>
                    {tipoModal === 'crear' && <><Save size={14} />Crear Cliente</>}
                    {tipoModal === 'editar' && <><Save size={14} />Guardar Cambios</>}
                    {tipoModal === 'eliminar' && <><Trash2 size={14} />Eliminar Cliente</>}
                  </>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: Bodegas ════ */}
      {modalBodegaAbierto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {tipoModalBodega === 'crear' && '🏢 Crear Bodega'}
                {tipoModalBodega === 'editar' && '✏️ Editar Bodega'}
                {tipoModalBodega === 'eliminar' && '🗑️ Eliminar Bodega'}
              </h3>
              <button onClick={cerrarModalBodega} className={styles.closeButton}><X size={18} /></button>
            </div>
            <div className={styles.modalContent}>
              {tipoModalBodega === 'eliminar' ? (
                <div className={styles.deleteConfirmation}>
                  <p>¿Estás seguro de que quieres eliminar esta bodega?</p>
                  <div className={styles.clienteToDelete}>
                    <strong>{bodegaSeleccionadaModal?.nombre}</strong>
                    <small>{bodegaSeleccionadaModal?.direccion}</small>
                  </div>
                  <p className={styles.warningText}>Esta acción no se puede deshacer. Solo se puede eliminar si no tiene clientes asociados.</p>
                </div>
              ) : (
                <div className={styles.formulario}>
                  <div className={styles.formGroup}>
                    <label>Nombre de la Bodega *</label>
                    <input type="text" value={formularioBodega.nombre}
                      onChange={e => setFormularioBodega(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre de la bodega" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Dirección *</label>
                    <input type="text" value={formularioBodega.direccion}
                      onChange={e => setFormularioBodega(p => ({ ...p, direccion: e.target.value }))}
                      placeholder="Dirección completa" required />
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={cerrarModalBodega} className={styles.cancelButton}>Cancelar</button>
              <button
                onClick={tipoModalBodega === 'crear' ? crearBodega : tipoModalBodega === 'editar' ? actualizarBodega : eliminarBodega}
                className={tipoModalBodega === 'eliminar' ? styles.deleteConfirmButton : styles.saveButton}
                disabled={guardandoBodega}
              >
                {guardandoBodega
                  ? <><div className={styles.spinner}></div>Guardando...</>
                  : <>
                    {tipoModalBodega === 'crear' && <><Save size={14} />Crear Bodega</>}
                    {tipoModalBodega === 'editar' && <><Save size={14} />Guardar Cambios</>}
                    {tipoModalBodega === 'eliminar' && <><Trash2 size={14} />Eliminar Bodega</>}
                  </>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ ALERTAS ════ */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={cerrarAlerta}
        onConfirm={cerrarAlerta}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Aceptar"
        type={alertModal.type}
        confirmColor={alertModal.confirmColor}
        showCloseButton={true}
      />
    </div>
  );
}