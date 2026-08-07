import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, Eye, X, AlertCircle, Loader, Edit3,
  Car, Save, Copy, CheckCheck, Plus, CheckCircle, Circle,
  Send, Mail, Trash2, ArrowLeft
} from 'lucide-react';
import styles from './ManifiestoCorreo.module.css';

/* ═══════════════════════════════════════════════
   PDF.JS — carga dinámica desde CDN
═══════════════════════════════════════════════ */
let pdfjsLib = null;
async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  await new Promise((resolve, reject) => {
    if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLib = window.pdfjsLib;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return pdfjsLib;
}

/* ═══════════════════════════════════════════════
   EXTRACCIÓN — devuelve items CON coordenadas
   (antes se perdían al hacer join('|'); ese era
   el origen de los bugs cuando el layout cambia)
═══════════════════════════════════════════════ */
async function extractItems(file) {
  const lib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  const items = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    content.items.forEach(item => {
      const str = item.str.trim();
      if (!str) return;
      const x = item.transform[4];
      const y = vp.height - item.transform[5];
      items.push({
        str,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(item.width || 0),
        cx: Math.round(x + (item.width || 0) / 2),
        page: pageNum,
      });
    });
  }

  items.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  return items;
}

/* Agrupa items en filas por proximidad vertical */
function buildRows(items, tol = 4) {
  const rows = [];
  let cur = [], curY = null, curPage = null;
  for (const it of items) {
    const same = curY !== null && it.page === curPage && Math.abs(it.y - curY) <= tol;
    if (same) cur.push(it);
    else {
      if (cur.length) rows.push(cur);
      cur = [it]; curY = it.y; curPage = it.page;
    }
  }
  if (cur.length) rows.push(cur);
  return rows.map(r => ({
    page: r[0].page,
    y: r[0].y,
    items: r.slice().sort((a, b) => a.x - b.x),
    text: r.map(i => i.str).join(' '),
  }));
}

/* ═══════════════════════════════════════════════
   UTILIDADES
═══════════════════════════════════════════════ */
const clean = s => (s || '').replace(/\s+/g, ' ').trim();

const DEPTOS = 'PUTUMAYO|NARINO|NARIÑO|VALLE|CAUCA|CUNDINAMARCA|ANTIOQUIA|BOLIVAR|SANTANDER|TOLIMA|HUILA|META|CORDOBA|MAGDALENA|CAQUETA|ARAUCA|CASANARE|ATLANTICO|RISARALDA|QUINDIO|CALDAS|BOYACA|CESAR|SUCRE|CHOCO|GUAJIRA|NORTE DE SANTANDER';
const RE_DEPTO = new RegExp(`\\b(${DEPTOS})\\b`, 'i');

/* Palabras que NUNCA son nombre de persona / municipio */
const ETIQ = new RegExp(
  '^(CONDUCTOR|TITULAR|MANIFIESTO|DOCUMENTO|IDENTIFICACION|IDENTIFICACIÓN|DIRECCION|DIRECCIÓN|TELEFONOS|' +
  'TELÉFONOS|CIUDAD|PLACA|MARCA|SEMIREMOLQUE|SEMIRREMOLQUE|CONFIGURACION|CONFIGURACIÓN|POSEEDOR|TENEDOR|' +
  'VEHICULO|VEHÍCULO|LICENCIA|COMPANIA|COMPAÑIA|COMPAÑÍA|SEGUROS|INFORMACION|INFORMACIÓN|MUNICIPIO|ORIGEN|' +
  'DESTINO|FECHA|TIPO|REMESA|NATURALEZA|EMPAQUE|PRODUCTO|CANTIDAD|MEDIDA|UNIDAD|PERMISO|INVIAS|REMITENTE|' +
  'DESTINATARIO|LUGAR|CARGUE|DESCARGUE|POLIZA|PÓLIZA|PREVISORA|COLPATRIA|BOLIVAR|MUNDIAL|HORAS|PACTADAS|' +
  'LLEGADA|SALIDA|FIRMA|HUELLA|CC|AXA|COMERCIALES|GENERALES|VENCIMIENTO|SOAT|VALORES|OBSERVACIONES|TOTAL|' +
  'RETENCION|RETENCIÓN|ANTICIPO|PAGAR|NETO|GENERAL|AUTORIZACION|AUTORIZACIÓN|NIT|TEL|HOJA|NRO|RADICACION|' +
  'RADICACIÓN|ACEPTACION|ACEPTACIÓN|DIGITAL|TRANSPORTE|EMPRESA|DUENO|DUEÑO|PAGO|CARGA|NORMAL|KILOGRAMOS|VARIOS)$',
  'i'
);

const esNombre = s => {
  const c = clean(s);
  if (c.length < 6) return false;
  if (/\d/.test(c)) return false;
  if (!/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$/.test(c)) return false;
  const words = c.split(' ');
  if (words.length < 2 || words.length > 5) return false;
  return !words.some(w => ETIQ.test(w));
};

/* Devuelve la fila cuyo texto matchea `re` */
const findRow = (rows, re) => rows.find(r => re.test(r.text));

/* Encuentra el item de un encabezado y devuelve el valor
   que esté debajo de él (X solapada, Y mayor y cercana).
   Es robusto a cambios de columnas. */
function valueBelow(rows, headerRe, opts = {}) {
  const { maxRows = 3, xTol = 45, filter = () => true } = opts;

  for (let i = 0; i < rows.length; i++) {
    const hdr = rows[i].items.find(it => headerRe.test(it.str));
    if (!hdr) continue;

    for (let j = i + 1; j <= i + maxRows && j < rows.length; j++) {
      if (rows[j].page !== rows[i].page) break;
      // items de la fila j que se solapan horizontalmente con el header
      const hits = rows[j].items.filter(it =>
        Math.abs(it.cx - hdr.cx) <= xTol || (it.x < hdr.x + hdr.w + 10 && it.x + it.w > hdr.x - 10)
      );
      if (!hits.length) continue;
      const val = clean(hits.map(h => h.str).join(' '));
      if (val && filter(val)) return val;
    }
  }
  return '';
}

/* ═══════════════════════════════════════════════
   PARSER MANIFIESTO RNDC — basado en coordenadas
═══════════════════════════════════════════════ */
function parseManifiesto(items) {
  const rows = buildRows(items);
  const flat = rows.map(r => r.text).join('\n');

  /* ── Número de manifiesto ── */
  let numero = '';
  const mNum = flat.match(/Manifiesto\s*:?\s*([A-Z]\d{6,10})/i);
  if (mNum) numero = mNum[1];
  if (!numero) {
    const alt = flat.match(/\b([MSN]\d{7,9})\b/);
    if (alt) numero = alt[1];
  }

  /* ── Placa (columna PLACA del bloque vehículo, NO semirremolque) ── */
  let placa = valueBelow(rows, /^PLACA$/i, {
    filter: v => /^[A-Z]{3}\s?\d{2,4}[A-Z]?$/.test(v.replace(/\s/g, ' ')),
  }).replace(/\s/g, '');

  if (!placa) {
    // fallback: primera placa que NO esté en la columna de semirremolque
    const semiRow = rows.find(r => /SEMI\s?RE?MOLQUE/i.test(r.text));
    const semiX = semiRow
      ? (semiRow.items.find(i => /SEMI/i.test(i.str))?.cx ?? -999)
      : -999;
    for (const r of rows) {
      for (const it of r.items) {
        const m = it.str.match(/^([A-Z]{3}\d{3,4})$/);
        if (m && Math.abs(it.cx - semiX) > 40) { placa = m[1]; break; }
      }
      if (placa) break;
    }
  }

  /* ── Conductor ──
     El header "CONDUCTOR" está en su propia fila; el nombre va
     justo debajo, en la misma columna X. Los layouts nuevos
     metieron "Vencimiento SOAT" y corrieron las columnas: por eso
     los offsets fijos (i+1 / i+2) dejaron de servir. */
  let conductor = valueBelow(rows, /^CONDUCTOR$/i, { maxRows: 2, xTol: 60, filter: esNombre });

  if (!conductor) {
    const m = flat.match(/Nombre del Conductor\s*:?\s*([A-ZÁÉÍÓÚÑ\s]{6,60})/i);
    if (m && esNombre(m[1])) conductor = clean(m[1]);
  }
  if (!conductor) {
    // último recurso: nombre que precede una cédula (7-10 dígitos),
    // excluyendo el del titular (que suele aparecer primero)
    const re = /\b([A-ZÁÉÍÓÚÑ]{3,}(?:\s+[A-ZÁÉÍÓÚÑ]{3,}){1,3})\s+\d{7,10}\b/g;
    const cands = [];
    let m2;
    while ((m2 = re.exec(flat.replace(/\n/g, ' '))) !== null) {
      if (esNombre(m2[1])) cands.push(clean(m2[1]));
    }
    conductor = cands[1] || cands[0] || '';
  }

  /* ── Origen / Destino ──
     Ambos tienen header propio ("ORIGEN DEL VIAJE" / "DESTINO DEL VIAJE").
     Leemos el valor bajo cada header por coordenada X. */
  const esMunicipio = v =>
    RE_DEPTO.test(v) &&
    !/DESTINO|ORIGEN|MUNICIPIO|VIAJE|INTERMEDIO/i.test(v) &&
    v.split(' ').length >= 2 && v.split(' ').length <= 5;

  let destino = valueBelow(rows, /^DESTINO$/i, { maxRows: 2, xTol: 70, filter: esMunicipio });
  if (!destino) {
    const dRow = findRow(rows, /DESTINO\s+DEL\s+VIAJE/i);
    if (dRow) {
      const hdr = dRow.items.find(i => /DESTINO/i.test(i.str));
      const idx = rows.indexOf(dRow);
      for (let j = idx; j <= idx + 3 && j < rows.length; j++) {
        const hits = rows[j].items.filter(i =>
          !/DESTINO|DEL|VIAJE/i.test(i.str) && Math.abs(i.cx - hdr.cx) <= 80
        );
        const v = clean(hits.map(h => h.str).join(' '));
        if (v && esMunicipio(v)) { destino = v; break; }
      }
    }
  }

  let origen = valueBelow(rows, /^ORIGEN$/i, { maxRows: 2, xTol: 70, filter: esMunicipio });
  if (!origen) {
    const oRow = findRow(rows, /ORIGEN\s+DEL\s+VIAJE/i);
    if (oRow) {
      const hdr = oRow.items.find(i => /ORIGEN/i.test(i.str));
      const idx = rows.indexOf(oRow);
      for (let j = idx; j <= idx + 3 && j < rows.length; j++) {
        const hits = rows[j].items.filter(i =>
          !/ORIGEN|DEL|VIAJE/i.test(i.str) && Math.abs(i.cx - hdr.cx) <= 80
        );
        const v = clean(hits.map(h => h.str).join(' '));
        if (v && esMunicipio(v)) { origen = v; break; }
      }
    }
  }

  /* ── Remitente ── */
  let remitente = 'COLOMBIANA DE COMERCIO';
  const remM = flat.match(
    /\b\d{9,13}\s+((?:COLOMBIANA|DISTRIBUIDORA|DISTRUIDORA)[A-ZÁÉÍÓÚÑa-záéíóúñ&\s]{3,45}?)\s+(?:CRA|CALLE|CARRERA|VARIANTE|AV|AVENIDA|\d)/i
  );
  if (remM) remitente = clean(remM[1]);

  /* ── Producto ── */
  let producto = '';
  const pRow = findRow(rows, /víveres|abarrotes|electrodom|fraccionada/i);
  if (pRow) {
    const hit = pRow.items.find(i => /víveres|abarrotes|electrodom|fraccionada/i.test(i.str));
    if (hit) {
      // recoge los items contiguos que forman la descripción
      const near = pRow.items.filter(i => Math.abs(i.x - hit.x) < 200 && !/^\d+$/.test(i.str));
      producto = clean(near.map(i => i.str).join(' ')).replace(/^\d+\s*/, '');
    }
  }

  return { numero, conductor, placa, destino, origen, remitente, destinatario: remitente, producto };
}

async function extractManifiestoData(file) {
  const items = await extractItems(file);
  const data = parseManifiesto(items);
  if (!data.placa && !data.conductor && !data.numero) return null;
  return data;
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getParking(destino, parkingMode, parkingManual) {
  if (/pasto/i.test(destino || '')) return 'PASTO ALKOSTO';
  return parkingMode === 'privado' ? 'PARQUEADERO PRIVADO' : parkingManual;
}

function buildEmailBody({ conductor, placa, destino, parqueadero }) {
  const hoy = fechaHoy();
  const parking = parqueadero || 'PARQUEADERO PRIVADO';
  return `Buenas tardes,

Señores:
COLOMBIANA DE COMERCIO

Fecha: ${hoy}

Por medio del presente, la Cooperativa de Transporte España "COOESPATRANS" solicita autorización para la salida del siguiente vehículo:

  • Placa:      ${placa || ''}
  • Conductor:  ${conductor || ''}
  • Destino:    ${destino || ''}

El vehículo realizará la salida de Corbeta con destino a ${parking}; el día siguiente continuará con la ruta asignada, bajo la plena responsabilidad de COOESPATRANS.

Agradecemos su atención y quedamos atentos a cualquier novedad.

Cordialmente,
COOESPATRANS`;
}

/* ═══════════════════════════════════════════════
   GRUPOS DE CORREO — localStorage
═══════════════════════════════════════════════ */
const GROUPS_KEY = 'cooespatrans_email_groups';

function loadGroups() {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); }
  catch { return []; }
}

function persistGroupsToStorage(groups) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

/* ═══════════════════════════════════════════════
   API — ENVÍO DE CORREO
═══════════════════════════════════════════════ */
async function sendEmailViaApi({ to, subject, text }) {
  const token = localStorage.getItem('token') || '';
  const toUnique = [...new Set(to.map(e => e.trim().toLowerCase()))];
  const res = await fetch('https://api.cooespatrans.com/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      from: 'ricardomelo.cooespatrans@gmail.com',
      to: toUnique,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  return await res.json();
}

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════ */
export default function ManifiestoCorreo() {
  /* ── Manifiestos ── */
  const [manifiestos, setManifiestos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [parkingMode, setParkingMode] = useState('privado');
  const [parkingManual, setParkingManual] = useState('');
  const [copied, setCopied] = useState(false);
  const [showParking, setShowParking] = useState(false);

  /* ── Paso actual ── */
  const [step, setStep] = useState('manifiestos');

  /* ── Grupos de correo ── */
  const [emailGroups, setEmailGroups] = useState(loadGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupEmails, setEditGroupEmails] = useState('');

  /* ── Envío ── */
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState({});

  const fileInputRef = useRef(null);
  const addMoreRef = useRef(null);

  /* ── Derivados ── */
  const verifiedManifiestos = manifiestos.filter(m => m.verified && m.status === 'ok');

  /* ────────────────────────────────────────────
     HANDLERS — ARCHIVOS
  ──────────────────────────────────────────── */
  const handleDragOver = useCallback(e => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) processFiles(files);
  }, [parkingMode, parkingManual]);

  const processFiles = async (files) => {
    const nuevos = files.map(file => ({
      id: Date.now() + Math.random(),
      file, name: file.name, status: 'procesando',
      data: null, pdfUrl: URL.createObjectURL(file),
      emailBody: '', emailSubject: '', verified: false,
    }));
    setManifiestos(prev => [...prev, ...nuevos]);
    setSelectedId(nuevos[0].id);

    for (const item of nuevos) {
      try {
        const data = await extractManifiestoData(item.file);
        const parking = getParking(data?.destino, parkingMode, parkingManual);
        const emailBody = buildEmailBody({ ...(data || {}), parqueadero: parking });
        const emailSubject = `Solicitud de Salida ${data?.conductor || ''}`.trim();
        setManifiestos(prev => prev.map(m =>
          m.id === item.id ? { ...m, status: data ? 'ok' : 'error', data, emailBody, emailSubject } : m
        ));
      } catch {
        setManifiestos(prev => prev.map(m =>
          m.id === item.id ? { ...m, status: 'error' } : m
        ));
      }
    }
  };

  const handleFileChange = e => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    if (files.length) processFiles(files);
    e.target.value = '';
  };

  /* ────────────────────────────────────────────
     HANDLERS — MANIFIESTOS
  ──────────────────────────────────────────── */
  const selected = manifiestos.find(m => m.id === selectedId);

  const toggleVerified = (id) => {
    setManifiestos(prev => prev.map(m => m.id === id ? { ...m, verified: !m.verified } : m));
    const currentIndex = manifiestos.findIndex(m => m.id === id);
    const next = manifiestos[currentIndex + 1];
    if (next) setSelectedId(next.id);
  };

  const updateManifesto = (id, patch) =>
    setManifiestos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  /* Permite corregir a mano un campo mal extraído y regenera el correo */
  const updateCampo = (id, campo, valor) => {
    setManifiestos(prev => prev.map(m => {
      if (m.id !== id) return m;
      const data = { ...(m.data || {}), [campo]: valor };
      const parking = getParking(data.destino, parkingMode, parkingManual);
      return {
        ...m,
        data,
        emailBody: buildEmailBody({ ...data, parqueadero: parking }),
        emailSubject: `Solicitud de Salida ${data.conductor || ''}`.trim(),
      };
    }));
  };

  const removeManifesto = id => {
    setManifiestos(prev => {
      const next = prev.filter(m => m.id !== id);
      if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
      return next;
    });
  };

  const applyParkingToAll = () => {
    setManifiestos(prev => prev.map(m => ({
      ...m,
      emailBody: m.data ? buildEmailBody({
        ...m.data,
        parqueadero: getParking(m.data.destino, parkingMode, parkingManual),
      }) : m.emailBody,
    })));
  };

  const regenerateEmail = m => {
    const parking = getParking(m.data?.destino, parkingMode, parkingManual);
    updateManifesto(m.id, {
      emailBody: buildEmailBody({ ...m.data, parqueadero: parking }),
      emailSubject: `Solicitud de Salida ${m.data?.conductor || ''}`.trim(),
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ────────────────────────────────────────────
     HANDLERS — GRUPOS DE CORREO
  ──────────────────────────────────────────── */
  const persistGroups = (groups) => {
    setEmailGroups(groups);
    persistGroupsToStorage(groups);
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const emails = newGroupEmails.split(/[\n,]/).map(e => e.trim()).filter(e => e.includes('@'));
    if (!emails.length) return;
    const newGroup = { id: Date.now().toString(), name: newGroupName.trim(), emails };
    const updated = [...emailGroups, newGroup];
    persistGroups(updated);
    setSelectedGroupId(newGroup.id);
    setNewGroupName(''); setNewGroupEmails(''); setShowNewGroup(false);
  };

  const deleteGroup = (id) => {
    persistGroups(emailGroups.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  const startEdit = (group) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupEmails(group.emails.join('\n'));
  };

  const saveEdit = () => {
    const emails = editGroupEmails.split(/[\n,]/).map(e => e.trim()).filter(e => e.includes('@'));
    persistGroups(emailGroups.map(g =>
      g.id === editingGroupId ? { ...g, name: editGroupName.trim(), emails } : g
    ));
    setEditingGroupId(null);
  };

  /* ────────────────────────────────────────────
     HANDLER — ENVIAR CORREOS
  ──────────────────────────────────────────── */
  const handleSendAll = async () => {
    const group = emailGroups.find(g => g.id === selectedGroupId);
    if (!group || !group.emails.length) return;

    setSending(true);
    const results = {};
    verifiedManifiestos.forEach(m => { results[m.id] = 'pending'; });
    setSendResults({ ...results });

    for (const m of verifiedManifiestos) {
      results[m.id] = 'sending';
      setSendResults({ ...results });
      try {
        await sendEmailViaApi({
          to: group.emails,
          subject: m.emailSubject || `Solicitud de Salida ${m.data?.conductor || ''}`,
          text: m.emailBody,
        });
        results[m.id] = 'ok';
      } catch {
        results[m.id] = 'error';
      }
      setSendResults({ ...results });
    }
    setSending(false);
  };

  const retryFailed = async () => {
    const group = emailGroups.find(g => g.id === selectedGroupId);
    if (!group) return;
    const failedIds = Object.entries(sendResults).filter(([, v]) => v === 'error').map(([k]) => k);
    const toRetry = verifiedManifiestos.filter(m => failedIds.includes(String(m.id)));
    if (!toRetry.length) return;

    setSending(true);
    const results = { ...sendResults };
    for (const m of toRetry) {
      results[m.id] = 'sending';
      setSendResults({ ...results });
      try {
        await sendEmailViaApi({
          to: group.emails,
          subject: m.emailSubject || `Solicitud de Salida ${m.data?.conductor || ''}`,
          text: m.emailBody,
        });
        results[m.id] = 'ok';
      } catch {
        results[m.id] = 'error';
      }
      setSendResults({ ...results });
    }
    setSending(false);
  };

  const enterSendStep = () => {
    setSendResults({});
    if (emailGroups.length === 1) setSelectedGroupId(emailGroups[0].id);
    setStep('enviar');
  };

  /* ────────────────────────────────────────────
     HELPERS UI
  ──────────────────────────────────────────── */
  const sendBadge = (id) => {
    const r = sendResults[id];
    if (!r || r === 'pending') return null;
    const map = {
      sending: { bg: '#fef9c3', color: '#854d0e', label: 'Enviando...' },
      ok:      { bg: '#dcfce7', color: '#15803d', label: '✓ Enviado' },
      error:   { bg: '#fef2f2', color: '#b91c1c', label: '✗ Error' },
    };
    const s = map[r];
    return (
      <span style={{
        background: s.bg, color: s.color,
        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      }}>{s.label}</span>
    );
  };

  const hasSendResults = Object.keys(sendResults).length > 0;
  const allSentOk = hasSendResults && Object.values(sendResults).every(v => v === 'ok');
  const hasErrors = hasSendResults && Object.values(sendResults).some(v => v === 'error');

  /* Estilo compartido de los mini-inputs de corrección */
  const miniLabel = {
    fontSize: 10, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', display: 'block', marginBottom: 3,
    letterSpacing: '0.05em',
  };

  /* ════════════════════════════════════════════
     RENDER — PASO 0: sin manifiestos
  ════════════════════════════════════════════ */
  if (manifiestos.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.iconWrap}><FileText size={20} /></div>
          <div>
            <h2 className={styles.title}>Manifiestos & Correos — COOESPATRANS</h2>
            <p className={styles.subtitle}>Sube manifiestos PDF · Extrae datos · Verifica · Envía correos</p>
          </div>
        </div>
        <div className={styles.uploadScreen}>
          <div className={styles.uploadScreenCard}>
            <div className={styles.uploadScreenIcon}><Upload size={28} /></div>
            <h3 className={styles.uploadScreenTitle}>Sube tus manifiestos PDF</h3>
            <p className={styles.uploadScreenSub}>Puedes subir uno o varios archivos a la vez</p>
            <div
              className={`${styles.uploadZoneBig} ${dragging ? styles.dragging : ''}`}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} style={{ display: 'none' }} />
              <Upload size={22} />
              <span>Arrastra los PDFs aquí o haz clic para seleccionar</span>
            </div>
            <div className={styles.parkingSection} style={{ marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <p className={styles.parkingLabel}><Car size={12} /> Lugar de salida de Corbeta</p>
              <div className={styles.parkingSelector}>
                <label className={`${styles.parkingOption} ${parkingMode === 'privado' ? styles.parkingSelected : ''}`}>
                  <input type="radio" name="parking" style={{ display: 'none' }} checked={parkingMode === 'privado'} onChange={() => setParkingMode('privado')} />
                  PARQUEADERO PRIVADO
                </label>
                <label className={`${styles.parkingOption} ${parkingMode === 'manual' ? styles.parkingSelected : ''}`}>
                  <input type="radio" name="parking" style={{ display: 'none' }} checked={parkingMode === 'manual'} onChange={() => setParkingMode('manual')} />
                  Escribir manualmente
                </label>
              </div>
              {parkingMode === 'manual' && (
                <input className={styles.input} placeholder="Ej: PARQUEADERO CENTRAL" value={parkingManual} onChange={e => setParkingManual(e.target.value)} style={{ marginTop: 8 }} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RENDER — PASO 2: ENVIAR CORREOS
  ════════════════════════════════════════════ */
  if (step === 'enviar') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <button className={styles.btnSecondary} onClick={() => setStep('manifiestos')} style={{ marginRight: 4 }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div className={styles.iconWrap} style={{ background: '#7c3aed' }}><Mail size={20} /></div>
          <div>
            <h2 className={styles.title}>Enviar correos — COOESPATRANS</h2>
            <p className={styles.subtitle}>
              {verifiedManifiestos.length} manifiesto{verifiedManifiestos.length !== 1 ? 's' : ''} verificado{verifiedManifiestos.length !== 1 ? 's' : ''} listos para enviar
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {hasErrors && !sending && (
              <button className={styles.btnSecondary} onClick={retryFailed}>
                <Send size={13} /> Reintentar fallidos
              </button>
            )}
            {!allSentOk && (
              <button
                className={styles.btnPrimary}
                style={{ background: '#7c3aed', opacity: (!selectedGroupId || sending) ? 0.5 : 1 }}
                disabled={!selectedGroupId || sending}
                onClick={handleSendAll}
              >
                {sending ? <Loader size={13} className={styles.spinner} /> : <Send size={13} />}
                {sending ? 'Enviando...' : 'Enviar correos'}
              </button>
            )}
            {allSentOk && (
              <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Todos enviados
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' }}>
          {/* ── Grupos de correo ── */}
          <div className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p className={styles.cardTitle} style={{ margin: 0 }}>
                <Mail size={14} /> Grupos de correo
              </p>
              <button className={styles.btnSecondary} style={{ padding: '5px 10px' }} onClick={() => { setShowNewGroup(v => !v); setEditingGroupId(null); }}>
                <Plus size={12} /> Nuevo
              </button>
            </div>

            {showNewGroup && (
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px' }}>Nuevo grupo</p>
                <input className={styles.input} placeholder="Nombre del grupo" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} style={{ marginBottom: 8 }} />
                <textarea
                  className={styles.textarea}
                  placeholder={"Correos (uno por línea o separados por coma):\ncorreo1@ejemplo.com\ncorreo2@ejemplo.com"}
                  value={newGroupEmails}
                  onChange={e => setNewGroupEmails(e.target.value)}
                  style={{ minHeight: 90, marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={styles.btnPrimary} style={{ flex: 1 }} onClick={addGroup}><Save size={12} /> Guardar</button>
                  <button className={styles.btnSecondary} onClick={() => setShowNewGroup(false)}><X size={12} /></button>
                </div>
              </div>
            )}

            {emailGroups.length === 0 && !showNewGroup && (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                No hay grupos guardados.<br />Crea uno con el botón "Nuevo".
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emailGroups.map(group => (
                <div key={group.id}>
                  {editingGroupId === group.id ? (
                    <div style={{ background: '#eff6ff', border: '1.5px solid #2563eb', borderRadius: 10, padding: 12 }}>
                      <input className={styles.input} value={editGroupName} onChange={e => setEditGroupName(e.target.value)} style={{ marginBottom: 8 }} />
                      <textarea
                        className={styles.textarea}
                        value={editGroupEmails}
                        onChange={e => setEditGroupEmails(e.target.value)}
                        style={{ minHeight: 80, marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={styles.btnPrimary} style={{ flex: 1 }} onClick={saveEdit}><Save size={12} /> Guardar</button>
                        <button className={styles.btnSecondary} onClick={() => setEditingGroupId(null)}><X size={12} /></button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setSelectedGroupId(group.id)}
                      style={{
                        border: `1.5px solid ${selectedGroupId === group.id ? '#7c3aed' : '#e2e8f0'}`,
                        background: selectedGroupId === group.id ? '#f5f3ff' : '#f8fafc',
                        borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${selectedGroupId === group.id ? '#7c3aed' : '#cbd5e1'}`,
                            background: selectedGroupId === group.id ? '#7c3aed' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selectedGroupId === group.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: selectedGroupId === group.id ? '#6d28d9' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{group.emails.length} correo{group.emails.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button className={styles.btnDanger} onClick={e => { e.stopPropagation(); startEdit(group); }} title="Editar">
                            <Edit3 size={12} />
                          </button>
                          <button className={styles.btnDanger} onClick={e => { e.stopPropagation(); deleteGroup(group.id); }} title="Eliminar">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {selectedGroupId === group.id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd6fe' }}>
                          {group.emails.map((email, i) => (
                            <p key={i} style={{ margin: '2px 0', fontSize: 11, color: '#6d28d9', fontFamily: 'monospace' }}>{email}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Lista de manifiestos a enviar ── */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>
              <FileText size={14} /> Manifiestos a enviar ({verifiedManifiestos.length})
            </p>

            {!selectedGroupId && (
              <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: 14 }}>
                <AlertCircle size={14} /> Selecciona un grupo de correo para continuar.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verifiedManifiestos.map(m => (
                <div key={m.id} style={{
                  border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 16px',
                  background: sendResults[m.id] === 'ok' ? '#f0fdf4' : sendResults[m.id] === 'error' ? '#fef2f2' : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 6 }}>
                        {m.data?.numero || m.name}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{m.data?.placa}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.data?.conductor}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                      Destino: {m.data?.destino}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7c3aed', fontStyle: 'italic' }}>
                      Asunto: {m.emailSubject || `Solicitud de Salida ${m.data?.conductor}`}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {sendResults[m.id] === 'sending'
                      ? <Loader size={18} className={styles.spinner} style={{ color: '#eab308' }} />
                      : sendBadge(m.id) || (
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pendiente</span>
                      )
                    }
                  </div>
                </div>
              ))}
            </div>

            {allSentOk && (
              <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ marginTop: 14 }}>
                <CheckCircle size={14} /> Todos los correos fueron enviados exitosamente.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RENDER — PASO 1: MANIFIESTOS
  ════════════════════════════════════════════ */
  return (
    <div className={styles.wrapper}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconWrap}><FileText size={20} /></div>
        <div>
          <h2 className={styles.title}>Manifiestos & Correos — COOESPATRANS</h2>
          <p className={styles.subtitle}>Sube manifiestos PDF · Extrae datos automáticamente · Genera el cuerpo del correo</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {verifiedManifiestos.length > 0 && (
            <button className={styles.btnPrimary} style={{ background: '#7c3aed' }} onClick={enterSendStep}>
              <Send size={13} /> Enviar correos
            </button>
          )}
        </div>
      </div>

      {/* Barra de selección */}
      <div className={styles.selectorBar}>
        <div className={styles.selectorTabs}>
          {manifiestos.map(m => (
            <button
              key={m.id}
              className={`${styles.selectorTab} ${selectedId === m.id ? styles.selectorTabActive : ''}`}
              onClick={() => setSelectedId(m.id)}
            >
              <span className={`${styles.tabDot} ${m.status === 'ok' ? styles.tabDotOk : m.status === 'error' ? styles.tabDotErr : styles.tabDotProc}`} />
              {m.verified && <CheckCircle size={11} style={{ color: '#7c3aed', flexShrink: 0 }} />}
              <span className={styles.tabLabel}>{m.data?.numero || m.name}</span>
              {m.status === 'procesando' && <Loader size={11} className={styles.spinner} />}
              <span className={styles.tabClose} onClick={e => { e.stopPropagation(); removeManifesto(m.id); }} title="Eliminar">
                <X size={11} />
              </span>
            </button>
          ))}
        </div>

        <div className={styles.selectorActions}>
          <div style={{ position: 'relative' }}>
            <button
              className={`${styles.btnSecondary} ${showParking ? styles.btnSecondaryActive : ''}`}
              onClick={() => setShowParking(v => !v)}
            >
              <Car size={13} /> Parqueadero
            </button>
            {showParking && (
              <div className={styles.parkingDropdown}>
                <p className={styles.parkingLabel} style={{ marginBottom: 8 }}><Car size={11} /> Lugar de salida de Corbeta</p>
                <div className={styles.parkingSelector}>
                  <label className={`${styles.parkingOption} ${parkingMode === 'privado' ? styles.parkingSelected : ''}`}>
                    <input type="radio" name="parking2" style={{ display: 'none' }} checked={parkingMode === 'privado'} onChange={() => setParkingMode('privado')} />
                    PARQUEADERO PRIVADO
                  </label>
                  <label className={`${styles.parkingOption} ${parkingMode === 'manual' ? styles.parkingSelected : ''}`}>
                    <input type="radio" name="parking2" style={{ display: 'none' }} checked={parkingMode === 'manual'} onChange={() => setParkingMode('manual')} />
                    Manual
                  </label>
                </div>
                {parkingMode === 'manual' && (
                  <input className={styles.input} placeholder="Ej: PARQUEADERO CENTRAL" value={parkingManual} onChange={e => setParkingManual(e.target.value)} style={{ margin: '8px 0' }} />
                )}
                <button className={styles.btnSecondary} style={{ width: '100%', marginTop: 4 }} onClick={() => { applyParkingToAll(); setShowParking(false); }}>
                  <Save size={12} /> Aplicar a todos
                </button>
              </div>
            )}
          </div>
          <button className={styles.btnPrimary} onClick={() => addMoreRef.current?.click()}>
            <Plus size={13} /> Agregar PDF
          </button>
          <input ref={addMoreRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Vista principal */}
      {selected && (
        <div className={styles.viewerGrid}>

          {/* Vista previa PDF */}
          <div className={styles.previewBox}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>
                <Eye size={14} />
                Vista previa — {selected.data?.numero || selected.name}
              </span>
            </div>
            <div className={styles.previewBodyFull}>
              {selected.status === 'procesando' ? (
                <div className={styles.previewEmpty}>
                  <Loader size={24} className={styles.spinner} />
                  <span>Extrayendo datos...</span>
                </div>
              ) : (
                <iframe src={selected.pdfUrl} className={styles.previewPdfFrame} title="Vista previa PDF" />
              )}
            </div>
          </div>

          {/* Panel correo */}
          <div className={styles.emailPanel}>
            {selected.status === 'ok' && (
              <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className={styles.emailHeader}>
                  <p className={styles.cardTitle} style={{ margin: 0 }}>
                    <FileText size={14} /> Correo
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.btnSecondary} onClick={() => regenerateEmail(selected)}>
                      <Edit3 size={12} /> Regenerar
                    </button>
                    <button
                      className={copied ? styles.btnPrimary : styles.btnSecondary}
                      style={{ transition: 'all 0.2s' }}
                      onClick={() => copyToClipboard(selected.emailBody)}
                    >
                      {copied ? <><CheckCheck size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                    </button>
                  </div>
                </div>

                {/* ── Datos extraídos: editables, regeneran el correo ── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 10, padding: 10, marginBottom: 10,
                }}>
                  <div>
                    <label style={miniLabel}>Placa</label>
                    <input
                      className={styles.input}
                      value={selected.data?.placa || ''}
                      onChange={e => updateCampo(selected.id, 'placa', e.target.value.toUpperCase())}
                      style={{
                        fontWeight: 600,
                        borderColor: selected.data?.placa ? undefined : '#fca5a5',
                      }}
                    />
                  </div>
                  <div>
                    <label style={miniLabel}>Conductor</label>
                    <input
                      className={styles.input}
                      value={selected.data?.conductor || ''}
                      onChange={e => updateCampo(selected.id, 'conductor', e.target.value.toUpperCase())}
                      style={{
                        fontWeight: 600,
                        borderColor: selected.data?.conductor ? undefined : '#fca5a5',
                      }}
                    />
                  </div>
                  <div>
                    <label style={miniLabel}>Destino</label>
                    <input
                      className={styles.input}
                      value={selected.data?.destino || ''}
                      onChange={e => updateCampo(selected.id, 'destino', e.target.value.toUpperCase())}
                      style={{
                        fontWeight: 600,
                        borderColor: selected.data?.destino ? undefined : '#fca5a5',
                      }}
                    />
                  </div>
                </div>

                {(!selected.data?.conductor || !selected.data?.destino || !selected.data?.placa) && (
                  <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: 10, fontSize: 12 }}>
                    <AlertCircle size={13} /> Faltan datos por extraer. Corrígelos arriba antes de verificar.
                  </div>
                )}

                {/* ── Asunto editable ── */}
                <div style={{ marginBottom: 10 }}>
                  <label style={miniLabel}>Asunto</label>
                  <input
                    className={styles.input}
                    value={selected.emailSubject || ''}
                    onChange={e => updateManifesto(selected.id, { emailSubject: e.target.value })}
                    placeholder="Asunto del correo"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* ── Cuerpo editable ── */}
                <label style={miniLabel}>Cuerpo</label>
                <textarea
                  className={styles.textarea}
                  style={{ flex: 1, minHeight: 0, resize: 'none' }}
                  value={selected.emailBody || ''}
                  onChange={e => updateManifesto(selected.id, { emailBody: e.target.value })}
                />

                {/* Botón verificar */}
                <button
                  onClick={() => toggleVerified(selected.id)}
                  style={{
                    marginTop: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.2s',
                    background: selected.verified ? '#7c3aed' : '#f1f5f9',
                    color: selected.verified ? '#fff' : '#475569',
                  }}
                >
                  {selected.verified
                    ? <><CheckCircle size={15} /> Verificado — clic para desmarcar</>
                    : <><Circle size={15} /> Marcar como verificado</>
                  }
                </button>
              </div>
            )}

            {selected.status === 'error' && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertCircle size={15} />
                No se pudieron extraer los datos de este PDF. Verifica que sea un manifiesto RNDC válido.
              </div>
            )}

            {selected.status === 'procesando' && (
              <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10, color: '#64748b' }}>
                <Loader size={22} className={styles.spinner} />
                <span style={{ fontSize: 13 }}>Generando correo...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}