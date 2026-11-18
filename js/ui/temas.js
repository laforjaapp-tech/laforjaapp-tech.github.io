// ESTILOS VISUALES QUE ELIGE CADA PERSONA (Perfil → Apariencia y al empezar).
// Los colores y las letras de cada estilo están en css/estilos.css (:root[data-tema="…"]).
// La elección es de este teléfono: se guarda en el navegador y se aplica antes de pintar (ver index.html).

import { esc } from './componentes.js';

export const TEMAS = [
  { id: 'forja', nombre: 'Forja clásico', texto: 'Negro y fuego', muestra: ['#09090b', '#ff6a13', '#ffae42'] },
  { id: 'neon', nombre: 'Energía Neón', texto: 'Negro con verde lima eléctrico', muestra: ['#0E0F12', '#C6FF00', '#00E5FF'] },
  { id: 'salud', nombre: 'Fresco Salud', texto: 'Blanco y verde esmeralda', muestra: ['#F5F8F7', '#00A86B', '#FF8A3D'] },
  { id: 'vibrante', nombre: 'Degradado Vibrante', texto: 'Morado, rosa y naranja', muestra: ['#0B0B1A', '#FF2E93', '#8C3CFF'] },
  { id: 'dominicano', nombre: 'Orgullo Dominicano', texto: 'Azul, rojo y blanco', muestra: ['#FFFFFF', '#002D62', '#CE1126'] },
  { id: 'caribe', nombre: 'Sol Caribe', texto: 'Arena, turquesa y sol', muestra: ['#FFF7EC', '#0A7C85', '#FFB547'] },
  { id: 'tropical', nombre: 'Noche Tropical', texto: 'Morado noche, coral y menta', muestra: ['#1B1033', '#FF7A59', '#3DDCC8'] },
  { id: 'estadio', nombre: 'Estadio', texto: 'Azul marino y amarillo', muestra: ['#0A1A3F', '#FFD60A', '#4CC9F0'] },
];
const CLAVE = 'la-forja-tema';

// Estilo con el que arranca la app (el dueño lo eligió: blanco). Antes de existir esta opción la app guardaba
// 'forja' sin que nadie lo eligiera; por eso solo cuenta lo que la persona tocó (marca CLAVE_ELEGIDO).
export const TEMA_INICIAL = 'salud';
const CLAVE_ELEGIDO = 'la-forja-tema-elegido';
export function temaGuardado() {
  try {
    const t = localStorage.getItem(CLAVE);
    return t && TEMAS.some(x => x.id === t) && localStorage.getItem(CLAVE_ELEGIDO) ? t : TEMA_INICIAL;
  } catch { return TEMA_INICIAL; }
}

export function aplicarTema(id) {
  const tema = TEMAS.some(t => t.id === id) ? id : 'forja';
  if (tema === 'forja') delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = tema;
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--fondo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo || '#09090b');
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento: dura hasta cerrar */ }
  return tema;
}

// Tarjetas para elegir: cada una se pinta con los colores de su propio estilo
export function htmlSelectorTemas(actual = temaGuardado()) {
  return `<div class="selector-temas" role="radiogroup" aria-label="Estilo de la app">${TEMAS.map(t => {
    const [fondo, acento, acento2] = t.muestra;
    return `<button type="button" class="tema-opcion${t.id === actual ? ' activo' : ''}" data-tema-id="${t.id}" role="radio" aria-checked="${t.id === actual}"
      style="--m-fondo:${fondo};--m-acento:${acento};--m-acento2:${acento2}">
      <span class="tm-muestra" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="tm-nombre">${esc(t.nombre)}</span>
      <span class="tm-texto">${esc(t.texto)}</span>
    </button>`;
  }).join('')}</div>`;
}

export function activarSelectorTemas(cont, alElegir = () => {}) {
  cont.querySelectorAll('[data-tema-id]').forEach(b => b.addEventListener('click', () => {
    const id = aplicarTema(b.dataset.temaId);
    try { localStorage.setItem(CLAVE_ELEGIDO, '1'); } catch { /* sin almacenamiento */ }
    cont.querySelectorAll('[data-tema-id]').forEach(x => { const on = x.dataset.temaId === id; x.classList.toggle('activo', on); x.setAttribute('aria-checked', on); });
    alElegir(id);
  }));
}
