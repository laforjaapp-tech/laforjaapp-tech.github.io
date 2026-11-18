// TU EQUIPO LA FORJA: quién te habla en cada momento.
// Son asistentes virtuales de la app (no son profesionales reales ni sustituyen a tu médico).
// Cada uno tiene su nombre, su cara, su color y su forma de hablar (voz más grave o más aguda).

import { esc } from './componentes.js';

export const EQUIPO = {
  fuerza: { nombre: 'Marcos', rol: 'Entrenador de fuerza', icono: '🏋️', color: '#ff6a13', voz: 'hombre' },
  cardio: { nombre: 'Yanelis', rol: 'Entrenadora de cardio y deporte', icono: '🏃‍♀️', color: '#e5397f', voz: 'mujer' },
  resistencia: { nombre: 'Ramón', rol: 'Preparador de resistencia', icono: '🎖️', color: '#5b8c3a', voz: 'hombre' },
  movilidad: { nombre: 'Thamar', rol: 'Guía de movilidad y cuidado de lesiones', icono: '🧘‍♀️', color: '#2b9ac9', voz: 'mujer' },
  nutricion: { nombre: 'Sofía', rol: 'Nutrióloga', icono: '👩‍⚕️', color: '#2f9e5b', voz: 'mujer' },
  descanso: { nombre: 'Luis', rol: 'Coach de descanso y hábitos', icono: '🌙', color: '#7b61d1', voz: 'hombre' },
};
export const AVISO_EQUIPO = 'Tu equipo son asistentes virtuales de LA FORJA: te guían y te acompañan, pero no sustituyen a tu médico ni a un profesional de la salud.';

// Qué miembro del equipo lleva cada disciplina de la sesión
const POR_DISCIPLINA = {
  fuerza: 'fuerza', calistenia: 'fuerza', core: 'fuerza',
  cardio: 'cardio', hiit: 'cardio', acondicionamiento: 'cardio', boxeo: 'cardio', agilidad: 'cardio', parkour: 'cardio',
  militar: 'resistencia',
  calentamiento: 'movilidad', movilidad: 'movilidad', enfriamiento: 'movilidad',
};
export const quienDisciplina = clave => POR_DISCIPLINA[clave] || 'fuerza';

// La guía de movilidad, que además hace las preguntas: Thamar, o Lucas para quien prefiere voz de hombre.
// Cada persona la elige en la bienvenida o en su Perfil (se guarda en este aparato).
// ritmo: hablan un poco más rápido que el resto, más fluido (pedido del dueño).
const GUIAS = {
  thamar: { nombre: 'Thamar', icono: '🧘‍♀️', voz: 'mujer', ritmo: 1.12 },
  lucas: { nombre: 'Lucas', icono: '🧘‍♂️', voz: 'hombre', tono: 0.8, ritmo: 1.12 },   // tono más grave: el dueño la pidió más varonil
};
const CLAVE_GUIA = 'la-forja-guia';
export function guiaElegida() { try { const g = localStorage.getItem(CLAVE_GUIA); return GUIAS[g] ? g : 'thamar'; } catch { return 'thamar'; } }
function guardarGuia(id) { try { localStorage.setItem(CLAVE_GUIA, id); } catch { /* sin almacenamiento */ } }

export const miembro = id => (id === 'movilidad' ? { ...EQUIPO.movilidad, ...GUIAS[guiaElegida()] } : EQUIPO[id] || EQUIPO.fuerza);

// Selector "¿Quién te guía?": al tocar uno se guarda y se oye su voz (escuchar la pone quien llama, para no depender de voz.js aquí)
export function htmlElegirGuia() {
  const g = guiaElegida();
  return `<div class="chips" role="group" aria-label="Quién te guía">${Object.entries(GUIAS).map(([id, x]) =>
    `<button type="button" class="chip${id === g ? ' activo' : ''}" data-guia="${id}" aria-pressed="${id === g}">${x.icono} ${esc(x.nombre)} · voz de ${x.voz}</button>`).join('')}</div>`;
}
export function activarElegirGuia(cont, alCambiar = () => {}) {
  cont.querySelectorAll('[data-guia]').forEach(b => b.onclick = () => {
    guardarGuia(b.dataset.guia);
    cont.querySelectorAll('[data-guia]').forEach(x => { const on = x === b; x.classList.toggle('activo', on); x.setAttribute('aria-pressed', on); });
    alCambiar(b.dataset.guia);
  });
}
export const presentacion = id => { const m = miembro(id); return `${m.dicho || m.nombre}, ${m.rol.toLowerCase()}`; };

// Firma visible: "👩‍⚕️ Sofía · Nutrióloga · asistente virtual"
export function htmlQuien(id, { texto = '', compacto = false } = {}) {
  const m = miembro(id);
  return `<div class="quien-habla${compacto ? ' compacto' : ''}" style="--qh:${m.color}">
    <span class="qh-cara" aria-hidden="true">${m.icono}</span>
    <span class="qh-texto"><strong>${esc(m.nombre)}</strong> <small>${esc(m.rol)} · asistente virtual</small>${texto ? `<span class="qh-dice">${esc(texto)}</span>` : ''}</span>
  </div>`;
}

// "Conoce a tu equipo" (Perfil y bienvenida)
export function htmlEquipo() {
  return `<div class="equipo">${Object.entries(EQUIPO).map(([id]) => htmlQuien(id, { texto: QUE_HACE[id] })).join('')}</div>
    <p class="ayuda">${esc(AVISO_EQUIPO)}</p>`;
}
const QUE_HACE = {
  fuerza: 'Te guía en pesas, peso corporal y abdomen.',
  cardio: 'Te acompaña en caminatas, cardio, intervalos y boxeo.',
  resistencia: 'Lleva los circuitos de resistencia tipo militar.',
  movilidad: 'Calentamiento, estiramientos y cuidado de tus molestias.',
  nutricion: 'Tu menú, tus cambios de comida, el agua y la lista de compras.',
  descanso: 'Tu sueño, tu recuperación y tus hábitos del día.',
};
