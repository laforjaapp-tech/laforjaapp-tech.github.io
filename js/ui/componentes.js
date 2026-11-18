// Componentes de interfaz reutilizables. Los campos llevan data-ruta ("personal.edad")
// y leerFormulario() vuelca sus valores en el objeto del atleta.

import { MENSAJE_ALARMA } from '../motor/seguridad.js';
import { SINTOMAS_ALARMA } from '../datos/catalogos.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function leerRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function ponerRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  let o = obj;
  for (const k of partes.slice(0, -1)) o = o[k] ??= {};
  o[partes[partes.length - 1]] = valor;
}

// Grupo de botones seleccionables. opciones: [{ id, etiqueta, exclusivo }]
export function chips({ ruta, opciones, valor, multi = false, numerico = false }) {
  const sel = multi ? (valor || []) : [valor];
  return `<div class="chips" data-ruta="${ruta}" data-multi="${multi ? 1 : 0}" data-num="${numerico ? 1 : 0}">
    ${opciones.map(o => `<button type="button" class="chip${sel.includes(o.id) ? ' activo' : ''}"
      data-valor="${esc(o.id)}"${o.exclusivo ? ' data-exclusivo="1"' : ''}>${esc(o.etiqueta)}</button>`).join('')}
  </div>`;
}

export const siNo = (ruta, valor) => chips({ ruta, valor, opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] });

export function campo({ ruta, etiqueta, valor, tipo = 'text', unidad = '', min, max, paso, ayuda = '', placeholder = '' }) {
  const attrs = [
    min != null ? `min="${min}"` : '', max != null ? `max="${max}"` : '', paso ? `step="${paso}"` : '',
    tipo === 'number' ? 'inputmode="decimal" data-num="1"' : '',
  ].join(' ');
  return `<label class="campo">
    <span class="campo-etiqueta">${esc(etiqueta)}</span>
    <span class="campo-entrada">
      <input type="${tipo === 'number' ? 'text' : tipo}" data-ruta="${ruta}" value="${esc(valor ?? '')}" placeholder="${esc(placeholder)}" ${attrs}>
      ${unidad ? `<span class="unidad">${esc(unidad)}</span>` : ''}
    </span>
    ${ayuda ? `<span class="ayuda">${esc(ayuda)}</span>` : ''}
  </label>`;
}

export function areaTexto({ ruta, etiqueta, valor, placeholder = '' }) {
  return `<label class="campo">
    <span class="campo-etiqueta">${esc(etiqueta)}</span>
    <textarea data-ruta="${ruta}" rows="2" placeholder="${esc(placeholder)}">${esc(valor ?? '')}</textarea>
  </label>`;
}

// Activa los chips de un contenedor. alCambiar(ruta) se llama tras cada clic.
export function activarChips(contenedor, alCambiar = () => {}) {
  contenedor.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b || !contenedor.contains(b)) return;
    const grupo = b.closest('.chips');
    if (grupo.dataset.multi === '1') {
      if (b.dataset.exclusivo) grupo.querySelectorAll('.chip').forEach(c => c !== b && c.classList.remove('activo'));
      else grupo.querySelectorAll('[data-exclusivo]').forEach(c => c.classList.remove('activo'));
      b.classList.toggle('activo');
    } else {
      grupo.querySelectorAll('.chip').forEach(c => c.classList.toggle('activo', c === b));
    }
    alCambiar(grupo.dataset.ruta);
  });
}

export function valorChips(grupo) {
  const conv = v => (grupo.dataset.num === '1' ? Number(v) : v);
  const act = [...grupo.querySelectorAll('.chip.activo')].map(c => conv(c.dataset.valor));
  return grupo.dataset.multi === '1' ? act : (act[0] ?? (grupo.dataset.num === '1' ? null : ''));
}

export function leerFormulario(contenedor, destino) {
  contenedor.querySelectorAll('input[data-ruta], textarea[data-ruta], select[data-ruta]').forEach(el => {
    let v = el.value.trim();
    // Números: "7,5" y "7.5" valen igual (los campos numéricos son de texto para aceptar la coma)
    if (el.type === 'number' || el.dataset.num === '1') { const n = Number(v.replace(/\s/g, '').replace(',', '.')); v = v === '' || !Number.isFinite(n) ? null : n; }
    ponerRuta(destino, el.dataset.ruta, v);
  });
  // Varios grupos de selección múltiple con la misma ruta (p. ej. uno por categoría) se suman, no se pisan
  const valores = new Map();
  contenedor.querySelectorAll('.chips[data-ruta]').forEach(g => {
    const v = valorChips(g), previo = valores.get(g.dataset.ruta);
    valores.set(g.dataset.ruta, Array.isArray(previo) && Array.isArray(v) ? [...previo, ...v] : v);
  });
  valores.forEach((v, ruta) => ponerRuta(destino, ruta, v));
  return destino;
}

export function aviso(texto, tipo = 'info') {
  const el = document.createElement('div');
  el.className = `aviso-flotante ${tipo}`;
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// Botón "Tengo síntomas" → instrucciones de seguridad
export function mostrarAlarma(alCerrar = () => {}) {
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal alarma" role="alertdialog" aria-labelledby="alarma-titulo">
    <h2 id="alarma-titulo">⛔ ${esc(MENSAJE_ALARMA.titulo)}</h2>
    <p>${esc(MENSAJE_ALARMA.texto)}</p>
    <ul>${SINTOMAS_ALARMA.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="urgente">${esc(MENSAJE_ALARMA.urgente)}</p>
    <p>${esc(MENSAJE_ALARMA.leve)}</p>
    <div class="acciones"><button class="btn" data-cerrar>Entendido</button></div>
  </div>`;
  fondo.querySelector('[data-cerrar]').onclick = () => { fondo.remove(); alCerrar(); };
  document.body.appendChild(fondo);
}

export function confirmar(texto) {
  return new Promise(resolver => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal"><p>${esc(texto)}</p>
      <div class="acciones"><button class="btn sec" data-r="0">Cancelar</button><button class="btn" data-r="1">Aceptar</button></div></div>`;
    fondo.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) { fondo.remove(); resolver(b.dataset.r === '1'); }
    });
    document.body.appendChild(fondo);
  });
}
