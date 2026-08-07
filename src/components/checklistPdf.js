
const ENCABEZADO_URL = `${window.location.origin}/checklist_encabezado.png`;
const MARCA_AGUA_URL = `${window.location.origin}/checklist_marca_agua.jpg`;

const ETIQUETAS = {
  documentos: {
    licenciaConduccion: 'Licencia de conducción',
    licenciaTransito: 'Licencia de tránsito',
    tarjetaOperacion: 'Tarjeta de operación',
    seguroSOAT: 'Seguro SOAT',
    revisionTecnica: 'Revisión técnico-mecánica',
    revisionPreventiva: 'Revisión preventiva',
    polizaResponsabilidad: 'Póliza de responsabilidad',
    formatoFUEC: 'Formato FUEC',
    soporteInspeccion: 'Soporte de inspección',
    soporteLimpieza: 'Soporte de limpieza',
  },
  equipos: {
    cinturonesPito: 'Cinturones y pito',
    luces: 'Luces',
    cajaHerramientas: 'Caja de herramientas',
    gatoConos: 'Gato y conos',
    extintor: 'Extintor',
    sistemaElectrico: 'Sistema eléctrico',
    sistemasBaterias: 'Sistema de baterías',
  },
  vehiculo: {
    espejosRetrovisores: 'Espejos retrovisores',
    direccion: 'Dirección',
    inspeccionMotor: 'Inspección del motor',
    tanqueCombustible: 'Tanque de combustible',
    vidriosPanoramicos: 'Vidrios panorámicos',
    limpiaparabrisas: 'Limpiaparabrisas',
    frenosServicio: 'Frenos de servicio',
    llantasEstado: 'Estado de llantas',
  },
};

const ICONOS_SECCION = {
  Documentos: '&#128196;', // 📄
  Equipos: '&#128295;',    // 🔧
  'Vehículo': '&#128663;', // 🚗
};

const seccionHTML = (titulo, obj, etiquetas) => {
  if (!obj) return '';
  const filas = Object.entries(etiquetas).map(([k, label]) => {
    const ok = obj[k] === true;
    return `<tr>
      <td class="col-item">${label}</td>
      <td class="col-valor">
        <span class="pill ${ok ? 'pill-ok' : 'pill-no'}">${ok ? 'Sí' : 'No'}</span>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="seccion-titulo">
      <span class="seccion-icono">${ICONOS_SECCION[titulo] || ''}</span>
      <span>${titulo}</span>
    </div>
    <table class="seccion-tabla">
      <tbody>${filas}</tbody>
    </table>`;
};

export const descargarChecklistPDF = async (conductor, checklistDetalle, mostrarAlerta) => {
  const BASE_URL = 'https://app.backend.cooespatrans.com';
  const URL_HISTORIAL = (id) => `${BASE_URL}/api/checklist/historial/${id}`;

  const DOC_KEYS = Object.keys(ETIQUETAS.documentos);
  const EQ_KEYS = Object.keys(ETIQUETAS.equipos);
  const VEH_KEYS = Object.keys(ETIQUETAS.vehiculo);
  const pick = (src, keys) => {
    const o = {}; keys.forEach(k => { if (src && src[k] !== undefined) o[k] = src[k]; }); return o;
  };
  const normalizar = (c) => {
    if (!c) return null;
    const items = c.checklist?.items || null;
    return {
      fechaCreacion: c.fechaCreacion || c.ultimaFecha || null,
      fechaVencimientoRevisionTecnica:
        c.fechaVencimientoRevisionTecnica || c.checklist?.fechaVencimientoRevisionTecnica || null,
      completo: c.completo === true,
      documentos: c.documentos || (items ? pick(items, DOC_KEYS) : {}),
      equipos: c.equipos || (items ? pick(items, EQ_KEYS) : {}),
      vehiculo: c.vehiculo || (items ? pick(items, VEH_KEYS) : {}),
      firma: c.firma || null,
    };
  };

  // Formatea fecha/hora exacta con segundos (DD/MM/AAAA -- HH:MM:SS)
  const fmtFechaHora = (f) => {
    if (!f) return '—';
    const d = new Date(f);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} -- ` +
      `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  // Formatea fecha para usar en el nombre del archivo (AAAA-MM-DD)
  const fmtFechaArchivo = (f) => {
    if (!f) return 'sin-fecha';
    const d = new Date(f);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // Hash de seguridad SHA-256 sobre los datos clave de la firma.
  const calcularHash = async (firma, conductor) => {
    try {
      const base = [
        conductor?.nombre || '',
        conductor?.cedula || conductor?.identificacion || '',
        firma?.dispositivoId || '',
        firma?.ip || '',
        firma?.fechaFirma || '',
        firma?.imagenBase64 || '',
      ].join('|');
      const buf = new TextEncoder().encode(base);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      return 'no-disponible';
    }
  };

  // Texto legal (tratamiento de datos + veracidad). Va UNA sola vez, antes de
  // los datos del conductor.
  const legalHTML = () => `
    <div class="legal">
      <div class="legal-fila">
        <div class="legal-num">1.</div>
        <div class="legal-cuerpo">
          <p class="legal-titulo">Tratamiento de Datos Personales:</p>
          <p class="legal-texto">Autorizo a la Cooperativa de Transportes España para el tratamiento de mis datos personales aquí consignados, conforme a la Ley 1581 de 2012, con la finalidad de gestionar el control de seguridad vial, la operación del servicio de carga y el cumplimiento legal.</p>
        </div>
      </div>
      <div class="legal-fila">
        <div class="legal-num">2.</div>
        <div class="legal-cuerpo">
          <p class="legal-titulo">Veracidad de la Información:</p>
          <p class="legal-texto">Manifiesto expresamente que soy el tenedor legítimo o conductor autorizado del vehículo de servicio público de carga aquí reportado, siendo responsable de su custodia y de informar inmediatamente cualquier falla que ponga en riesgo la seguridad vial, y declaro bajo la gravedad de juramento que la información registrada sobre el estado del vehículo (mecánico, eléctrico, de seguridad y documentación) es veraz, exacta y corresponde a la verificación física real realizada al automotor antes de iniciar la ruta.</p>
        </div>
      </div>
    </div>`;

  // Bloque de firma digital. Va UNA sola vez, al final del documento, con la
  // firma del checklist mostrado (su hora, dispositivo y hash).
  const firmaHTML = async (c, conductor) => {
    const f = c?.firma;
    if (!f) return ''; // checklist sin firma electrónica: no se muestra bloque

    const nombre = conductor?.nombre || '—';
    const cedula = conductor?.cedula || conductor?.identificacion || f?.cedula || '—';
    const hash = await calcularHash(f, conductor);
    const imagen = f.imagenBase64
      ? `<img class="firma-img" src="${f.imagenBase64}" alt="Firma del conductor" />`
      : '';

    return `
    <div class="firma-cert-card">
      <div class="firma-cert-head">
        <div class="firma-cert-head-icon">&#128274;</div>
        <div class="firma-cert-head-text">
          <p class="firma-cert-title">Firma Digital</p>
          <p class="firma-cert-sub">Art. 7 Ley 527 de 1999 &middot; Colombia</p>
        </div>
        <div class="firma-cert-badge">Verificada</div>
      </div>

      <div class="firma-cert-body">
        <div class="firma-cert-firma">
          ${imagen || '<div class="firma-img-vacia">Sin imagen de firma</div>'}
          <div class="firma-cert-firma-linea"></div>
          <p class="firma-cert-firma-nombre">${nombre}</p>
          <p class="firma-cert-firma-calidad">Tenedor / Conductor Autorizado</p>
        </div>

        <div class="firma-cert-datos">
          <div class="firma-cert-dato">
            <span class="firma-cert-dato-label">Documento</span>
            <span class="firma-cert-dato-valor">C.C. ${cedula}</span>
          </div>
          <div class="firma-cert-dato">
            <span class="firma-cert-dato-label">Fecha y hora</span>
            <span class="firma-cert-dato-valor">${fmtFechaHora(f.fechaFirma)}</span>
          </div>
          <div class="firma-cert-dato firma-cert-dato-full">
            <span class="firma-cert-dato-label">ID Dispositivo</span>
            <span class="firma-cert-dato-valor mono">${f.dispositivoId || '—'}</span>
          </div>
          <div class="firma-cert-dato firma-cert-dato-full">
            <span class="firma-cert-dato-label">Hash de seguridad (SHA-256)</span>
            <span class="firma-cert-dato-valor mono hash">${hash}</span>
          </div>
        </div>
      </div>

      <div class="firma-cert-foot">
        Aceptado electrónicamente mediante la pulsación del botón de envío en la aplicación oficial de la <strong>COOPERATIVA DE TRANSPORTES ESPAÑA</strong>.
      </div>
    </div>`;
  };

  // Estilos completos del documento. Se inyectan dentro del contenedor oculto
  // que se captura con html2canvas para generar el PDF.
  const estilosHTML = () => `
    <style>
      * { box-sizing:border-box; }

      body {
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
        color: #1F2937;
        margin: 0;
        background: #FBFBF9;
        font-size: 11px;
        line-height: 1.35;
      }

      .marca-agua {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 900px;
        transform: translate(-50%, -50%) rotate(-16deg);
        opacity: 0.09;
        z-index: 0;
        pointer-events: none;
        filter: grayscale(100%);
      }

      .hoja {
        position: relative;
        z-index: 1;
        padding: 8mm 14mm;
      }

      .letterhead {
        text-align: center;
        padding-bottom: 4px;
        margin-bottom: 2px;
      }
      .letterhead img {
        max-width: 100%;
        max-height: 60px;
        width: auto;
        height: auto;
        display: block;
        margin: 0 auto;
      }

      .doc-title-block {
        text-align: center;
        border-top: 1px solid #DDE3EA;
        border-bottom: 3px solid #0A2540;
        padding: 6px 0 8px;
        margin-bottom: 10px;
      }
      .doc-eyebrow {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        color: #3A6EA5;
        margin: 0 0 5px;
      }
      .doc-title {
        font-family: 'Libre Baskerville', Georgia, serif;
        font-size: 18px;
        font-weight: 700;
        color: #0A2540;
        margin: 0 0 6px;
      }
      .doc-rule {
        width: 50px;
        height: 3px;
        background: #A9812F;
        margin: 0 auto;
      }

      .ficha {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px 24px;
        background: #ffffff;
        border: 1px solid #DDE3EA;
        border-left: 5px solid #0A2540;
        border-radius: 6px;
        padding: 8px 18px;
        margin-bottom: 10px;
      }
      .ficha-titulo {
        grid-column: 1 / -1;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #0A2540;
        margin: 0 0 2px;
      }
      .ficha-item { display: flex; flex-direction: column; }
      .ficha-item .label {
        font-size: 9px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748B;
        margin-bottom: 1px;
      }
      .ficha-item .valor {
        font-size: 11.5px;
        font-weight: 600;
        color: #1F2937;
      }

      .expediente {
        position: relative;
        background: #ffffff;
        border: 1px solid #DDE3EA;
        border-radius: 8px;
        padding: 10px 18px 8px;
        margin-bottom: 12px;
      }

      .sello {
        position: absolute;
        top: 10px;
        right: 18px;
        border: 2px double #1B7F4C;
        color: #1B7F4C;
        font-family: 'Libre Baskerville', Georgia, serif;
        font-weight: 700;
        font-size: 9.5px;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        text-align: center;
        padding: 5px 11px;
        border-radius: 40% / 50%;
        transform: rotate(-7deg);
      }
      .sello-pendiente { border-color: #B23A2E; color: #B23A2E; }

      .expediente-header {
        border-bottom: 2px solid #0A2540;
        padding-bottom: 5px;
        margin-bottom: 6px;
        padding-right: 120px;
      }
      .expediente-title {
        font-family: 'Libre Baskerville', Georgia, serif;
        font-size: 13px;
        font-weight: 700;
        color: #0A2540;
        margin: 0;
      }
      .expediente-sub {
        font-size: 9.5px;
        color: #64748B;
        margin: 1px 0 0;
      }

      .expediente-meta {
        display: flex;
        gap: 28px;
        margin-bottom: 6px;
      }
      .meta-item { display: flex; flex-direction: column; }
      .meta-label {
        font-size: 8.5px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748B;
        margin-bottom: 1px;
      }
      .meta-valor { font-size: 11px; font-weight: 600; color: #1F2937; }

      .secciones-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2px;
      }

      .seccion-titulo {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 7px 0 3px;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: #0A2540;
      }
      .seccion-icono { font-size: 11px; line-height: 1; }

      table.seccion-tabla {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
      }
      table.seccion-tabla tr:nth-child(even) td { background: #F5F8FB; }
      table.seccion-tabla td {
        padding: 3px 9px;
        border-bottom: 1px solid #DDE3EA;
      }
      td.col-item { color: #1F2937; }
      td.col-valor { text-align: right; width: 80px; }

      .pill {
        display: inline-block;
        min-width: 38px;
        text-align: center;
        padding: 1.5px 9px;
        border-radius: 20px;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .pill-ok { background: #E7F5EC; color: #1B7F4C; }
      .pill-no { background: #FBEAE8; color: #B23A2E; }

      .legal {
        margin-bottom: 10px;
        border: 1px solid #DDE3EA;
        border-radius: 6px;
        overflow: hidden;
      }
      .legal-fila {
        display: flex;
        border-bottom: 1px solid #DDE3EA;
      }
      .legal-fila:last-child { border-bottom: none; }
      .legal-num {
        flex: 0 0 26px;
        text-align: center;
        font-weight: 700;
        color: #0A2540;
        padding: 6px 4px;
        border-right: 1px solid #DDE3EA;
        background: #F5F8FB;
      }
      .legal-cuerpo { padding: 6px 10px; }
      .legal-titulo {
        margin: 0 0 2px;
        font-weight: 700;
        font-style: italic;
        font-size: 10px;
        color: #0A2540;
      }
      .legal-texto {
        margin: 0;
        font-size: 9.5px;
        text-align: justify;
        color: #1F2937;
        line-height: 1.4;
      }

      .firma-cert-card {
        margin-top: 12px;
        border: 1px solid #DDE3EA;
        border-radius: 10px;
        overflow: hidden;
        background: #ffffff;
      }

      .firma-cert-head {
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, #0A2540 0%, #123A5E 100%);
        padding: 8px 14px;
      }
      .firma-cert-head-icon {
        font-size: 15px;
        line-height: 1;
        color: #ffffff;
      }
      .firma-cert-head-text { flex: 1; }
      .firma-cert-title {
        margin: 0;
        font-family: 'Libre Baskerville', Georgia, serif;
        font-size: 12.5px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
      }
      .firma-cert-sub {
        margin: 1px 0 0;
        font-size: 8px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #AFC6DE;
      }
      .firma-cert-badge {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: #1B7F4C;
        background: #E7F5EC;
        border: 1px solid #1B7F4C;
        border-radius: 20px;
        padding: 3px 10px;
      }

      .firma-cert-body {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 0;
      }
      .firma-cert-firma {
        text-align: center;
        padding: 12px 14px;
        border-right: 1px solid #DDE3EA;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .firma-img {
        max-height: 74px;
        max-width: 170px;
        object-fit: contain;
        display: block;
        margin: 0 auto 4px;
      }
      .firma-img-vacia {
        font-size: 9px;
        color: #64748B;
        font-style: italic;
        padding: 20px 0 6px;
      }
      .firma-cert-firma-linea {
        width: 150px;
        height: 1px;
        background: #1F2937;
        margin: 0 auto 5px;
      }
      .firma-cert-firma-nombre {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        color: #0A2540;
      }
      .firma-cert-firma-calidad {
        margin: 1px 0 0;
        font-size: 8.5px;
        color: #64748B;
      }

      .firma-cert-datos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
      }
      .firma-cert-dato {
        padding: 8px 14px;
        border-bottom: 1px solid #DDE3EA;
        border-right: 1px solid #DDE3EA;
        display: flex;
        flex-direction: column;
      }
      .firma-cert-dato:nth-child(2n) { border-right: none; }
      .firma-cert-dato-full { grid-column: 1 / -1; border-right: none; }
      .firma-cert-dato-full:last-child { border-bottom: none; }
      .firma-cert-dato-label {
        font-size: 7.5px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #64748B;
        margin-bottom: 2px;
      }
      .firma-cert-dato-valor {
        font-size: 10px;
        font-weight: 600;
        color: #1F2937;
        word-break: break-word;
      }
      .firma-cert-dato-valor.mono {
        font-family: 'Courier New', Courier, monospace;
        font-weight: 700;
      }
      .firma-cert-dato-valor.hash {
        font-size: 8.5px;
        font-weight: 400;
        color: #3A6EA5;
        word-break: break-all;
        letter-spacing: 0.2px;
      }

      .firma-cert-foot {
        background: #FBFBF9;
        border-top: 1px solid #DDE3EA;
        padding: 7px 14px;
        font-size: 8.5px;
        color: #64748B;
        line-height: 1.4;
        text-align: center;
      }
      .firma-cert-foot strong { color: #0A2540; }
    </style>`;

  try {
    // Consulta del historial de checklists del conductor.
    let crudos = [];
    try {
      const res = await fetch(URL_HISTORIAL(conductor._id));
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) crudos = data.data;
      }
    } catch (_) { }
    if (crudos.length === 0 && checklistDetalle) crudos = [checklistDetalle];

    const historial = crudos.map(normalizar).filter(Boolean);
    if (historial.length === 0) {
      mostrarAlerta?.('Sin checklists', 'Este conductor no tiene checklists registrados.', 'info');
      return;
    }

    // Solo el checklist MÁS RECIENTE. El historial ya viene ordenado del más
    // nuevo al más antiguo desde el backend; tomamos el primero.
    const c = historial[0];

    const fmt = (f) => f ? new Date(f).toLocaleDateString('es-CO',
      { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

    // Un único expediente (el más reciente).
    const bloqueChecklist = `
  <section class="expediente">
    <div class="sello ${c.completo ? 'sello-ok' : 'sello-pendiente'}">
      ${c.completo ? 'Vehículo apto' : 'Revisión pendiente'}
    </div>

    <div class="expediente-header">
      <div>
        <p class="expediente-title">Checklist</p>
        <p class="expediente-sub">Registro de inspección semanal de vehículo</p>
      </div>
    </div>

    <div class="expediente-meta">
      <div class="meta-item">
        <span class="meta-label">Fecha de inspección</span>
        <span class="meta-valor">${fmt(c.fechaCreacion)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Vence revisión técnico-mecánica</span>
        <span class="meta-valor">${fmt(c.fechaVencimientoRevisionTecnica)}</span>
      </div>
    </div>

    <div class="secciones-grid">
      ${seccionHTML('Documentos', c.documentos, ETIQUETAS.documentos)}
      ${seccionHTML('Equipos', c.equipos, ETIQUETAS.equipos)}
      ${seccionHTML('Vehículo', c.vehiculo, ETIQUETAS.vehiculo)}
    </div>
  </section>`;

    // Texto legal (una vez, antes de los datos del conductor) y firma (una vez,
    // al final del documento).
    const legal = legalHTML();
    const firma = await firmaHTML(c, conductor);

    // ── Configuración de página (carta) y márgenes ──────────────────────
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;       // margen izquierdo/derecho
    const marginTop = 8;      // margen superior
    const footerHeight = 16;  // espacio reservado abajo para el pie de página
    const contentWidthMm = pageWidth - marginX * 2;
    const contentAreaMm = pageHeight - marginTop - footerHeight;

    // Contenedor oculto fuera de la pantalla: aquí se renderiza todo el HTML
    // que luego se captura con html2canvas. Su ancho ya coincide con el
    // ancho útil de contenido (ancho de página menos márgenes), para que la
    // imagen capturada encaje directamente sin reescalados raros.
    const wrapperOculto = document.createElement('div');
    wrapperOculto.style.position = 'fixed';
    wrapperOculto.style.top = '0';
    wrapperOculto.style.left = '0';
    wrapperOculto.style.width = '0';
    wrapperOculto.style.height = '0';
    wrapperOculto.style.overflow = 'hidden';
    const contenedor = document.createElement('div');
    contenedor.style.width = `${contentWidthMm}mm`;
    contenedor.innerHTML = `
      ${estilosHTML()}
      <div class="hoja">
        <img class="marca-agua" src="${MARCA_AGUA_URL}" alt="" />
        <div class="letterhead">
          <img src="${ENCABEZADO_URL}" alt="COOESPATRANS" />
        </div>

        <div class="doc-title-block">
          <p class="doc-eyebrow">Sistema SurTrack &middot; Gestión de flota</p>
          <p class="doc-title">Historial de Checklist Vehicular</p>
          <div class="doc-rule"></div>
        </div>

        ${legal}

        <div class="ficha">
          <p class="ficha-titulo">Datos del conductor</p>
          <div class="ficha-item">
            <span class="label">Conductor</span>
            <span class="valor">${conductor.nombre || '—'}</span>
          </div>
          <div class="ficha-item">
            <span class="label">Documento</span>
            <span class="valor">${conductor.cedula || conductor.identificacion || '—'}</span>
          </div>
          <div class="ficha-item">
            <span class="label">Placa del vehículo</span>
            <span class="valor">${conductor.vehiculo?.placa || '—'}</span>
          </div>
        </div>

        ${bloqueChecklist}

        ${firma}
      </div>`;
    wrapperOculto.appendChild(contenedor);
    document.body.appendChild(wrapperOculto);

    // Espera a que todas las <img> del contenedor terminen de cargar
    const imgs = Array.from(contenedor.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    // Pequeño respiro extra para que el navegador termine el layout/reflow
    await new Promise(resolve => setTimeout(resolve, 100));

    // Nombre del archivo: conductor + placa + fecha del checklist más reciente.
    const nombreArchivo =
      `Checklist - ${conductor.nombre || 'Conductor'} - ${conductor.vehiculo?.placa || 'SinPlaca'} - ${fmtFechaArchivo(c.fechaCreacion)}.pdf`;

    // Captura el contenido completo (todas las secciones, una sola imagen alta).
    const canvas = await html2canvas(contenedor, { scale: 2, useCORS: true });
    const pxPerMm = canvas.width / contentWidthMm;
    const contentAreaPx = contentAreaMm * pxPerMm;
    const scalePx = canvas.width / contenedor.offsetWidth;

    // Detecta los elementos que NO deben cortarse entre páginas (filas de
    // tabla, tarjetas, bloques de datos) y calcula su posición en píxeles
    // dentro de la imagen capturada.
    const contRect = contenedor.getBoundingClientRect();
    const selectorNoCorte =
      'tr, .firma-cert-card, .legal-fila, .ficha, .expediente-header, ' +
      '.expediente-meta, .doc-title-block, .letterhead, .seccion-titulo, .sello';
    const intervalos = Array.from(contenedor.querySelectorAll(selectorNoCorte))
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          top: (r.top - contRect.top) * scalePx,
          bottom: (r.bottom - contRect.top) * scalePx,
        };
      })
      .filter(iv => iv.bottom > iv.top);

    // Calcula los cortes de página: avanza de a "una página de alto", pero
    // si el corte cae dentro de un elemento no-cortable, lo retrocede hasta
    // el borde superior de ese elemento (así nunca parte una fila a la mitad).
    let cursor = 0;
    const paginas = [];
    while (cursor < canvas.height - 1) {
      let corte = Math.min(cursor + contentAreaPx, canvas.height);
      if (corte < canvas.height) {
        let corteAjustado = corte;
        for (const iv of intervalos) {
          if (iv.top < corte && iv.bottom > corte && iv.top > cursor) {
            corteAjustado = Math.min(corteAjustado, iv.top);
          }
        }
        // Evita bucles infinitos si un elemento es más alto que una página
        corte = corteAjustado > cursor ? corteAjustado : Math.min(cursor + contentAreaPx, canvas.height);
      }
      paginas.push({ top: cursor, bottom: corte });
      cursor = corte;
    }

    // Dibuja el pie de página (línea + texto) en la posición fija de cada hoja.
    const dibujarFooter = () => {
      const footerText =
        'cooespatrans@hotmail.com · Carrera 67 Casa 4 Terrazas de Briceño · ' +
        'Tel. 7312413 · Cel. 3147070775 - 3002001460 - 3216256970 · Pasto';
      const lineaY = pageHeight - footerHeight + 4;
      pdf.setDrawColor(10, 37, 64);
      pdf.setLineWidth(0.3);
      pdf.line(marginX, lineaY, pageWidth - marginX, lineaY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(footerText, pageWidth / 2, lineaY + 5, {
        align: 'center',
        maxWidth: pageWidth - marginX * 2,
      });
    };

    // Recorta cada segmento del canvas grande y lo agrega como una página.
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;

    paginas.forEach((pg, idx) => {
      if (idx > 0) pdf.addPage();
      const alturaPx = pg.bottom - pg.top;
      tempCanvas.height = alturaPx;
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, pg.top, canvas.width, alturaPx, 0, 0, canvas.width, alturaPx);
      const imgData = tempCanvas.toDataURL('image/jpeg', 0.98);
      const alturaMm = alturaPx / pxPerMm;
      pdf.addImage(imgData, 'JPEG', marginX, marginTop, contentWidthMm, alturaMm);
      dibujarFooter();
    });

    pdf.setProperties({ title: nombreArchivo.replace(/\.pdf$/i, '') });
    const blob = pdf.output('blob');

    document.body.removeChild(wrapperOculto);


    const archivoPDF = new File([blob], nombreArchivo, { type: 'application/pdf' });
    const url = URL.createObjectURL(archivoPDF);

    // Abre el PDF en una pestaña nueva para que el usuario pueda verlo.
    window.open(url, '_blank');

    // Fuerza además una descarga con el nombre correcto garantizado (no
    // depende del botón "Guardar" del visor de PDF, que en Chrome a veces
    // ignora el nombre real del archivo).
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.href = url;
    enlaceDescarga.download = nombreArchivo;
    document.body.appendChild(enlaceDescarga);
    enlaceDescarga.click();
    document.body.removeChild(enlaceDescarga);

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error(e);
    mostrarAlerta?.('Error', 'No se pudo generar el PDF del checklist.', 'error');
  }
};