// Piezas visuales de la base científica (FASE 5): nivel de evidencia, referencias y "¿Por qué esta combinación?".

import { esc } from './componentes.js';
import { NIVELES, TIPOS_EVIDENCIA, afirmacion, refsDe } from '../datos/evidencia.js';

export const htmlNivel = ev => ev ? `<span class="evid evid-${ev.nivel}" title="${esc(NIVELES[ev.nivel]?.texto || '')}">${ev.icono} ${esc(ev.etiqueta)}</span>` : '';

export function htmlReferencia(r, numero = null) {
  return `<li class="referencia"${numero ? ` id="ref-${r.id}"` : ''}>
    <span class="ref-titulo">${numero ? `<b>[${numero}]</b> ` : ''}${esc(r.titulo)}</span>
    <span class="ref-datos">${esc(r.autores)} (${r.anio}). <em>${esc(r.revista)}</em>.</span>
    <span class="ref-datos">${esc(TIPOS_EVIDENCIA[r.tipo] || '')} · <a href="${esc(r.enlace)}" target="_blank" rel="noopener">DOI ${esc(r.doi)}</a></span>
    <span class="ref-conclusion">${esc(r.conclusion)}</span>
  </li>`;
}

// Una afirmación con su nivel y las fuentes numeradas
export function htmlAfirmacion(id, numeros = {}) {
  const a = afirmacion(id);
  if (!a) return '';
  const citas = a.refs.map(r => numeros[r] ? `<a href="#ref-${r}" class="cita">[${numeros[r]}]</a>` : '').join('');
  return `<li class="afirmacion">${htmlNivel(a)} <span>${esc(a.texto)} ${citas}</span></li>`;
}

// "¿Por qué esta combinación?" de la sesión de hoy (punto 35)
export function htmlPorQueCombinacion(c) {
  if (!c) return '';
  return `<details class="porque-combinacion" open>
    <summary>🔬 ¿Por qué esta combinación?</summary>
    <p class="ayuda">Objetivo de tu plan: <strong>${esc(c.objetivo)}</strong>. Cada bloque tiene una función y un lugar en la sesión:</p>
    <ol class="porque-bloques">${c.bloques.map(b => `<li>
      <strong>${esc(b.titulo)}</strong>${b.evidencia ? ` ${htmlNivel(b.evidencia)}` : ''}
      ${b.funcion ? `<span class="pq-funcion">${esc(b.funcion)}</span>` : ''}
      ${b.porQue ? `<span class="pq-orden">📍 ${esc(b.porQue)}</span>` : ''}
    </li>`).join('')}</ol>
    <p class="ayuda">La evidencia disponible respalda esta estrategia por las razones indicadas; no existe una única combinación "mejor" para todos. Las fuentes están en Mi plan → Evidencia.</p>
  </details>`;
}

export const numerarReferencias = refs => Object.fromEntries(refs.map((r, i) => [r.id, i + 1]));
export { refsDe };
