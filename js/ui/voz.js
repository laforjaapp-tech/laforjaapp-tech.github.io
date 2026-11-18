// Instrucciones habladas en español (síntesis de voz del dispositivo, sin internet).
// Cada frase la dice un miembro del equipo (ui/equipo.js): se ve en pantalla quién habla
// y, si el teléfono tiene voces de hombre y de mujer, cada uno usa la suya.

import { miembro } from './equipo.js';

let activo = true;
let voces = { todas: [], hombre: null, mujer: null };
let hablante = 'fuerza';

// Nombres de voces conocidas del sistema (Windows, Android, iPhone, Chrome)
const MUJER = /ramona|paloma|dalia|karina|belkys|sof[ií]a|elena|camila|salom[eé]|catalina|mar[ií]a|andrea|marta|karla|yolanda|margarita|tania|lorena|valentina|paola|teresa|elvira|ximena|helena|laura|sabina|paulina|m[oó]nica|luc[ií]a|marisol|female|mujer/i;
const HOMBRE = /emilio|alonso|jorge|v[ií]ctor|manuel|tom[aá]s|marcelo|lorenzo|gonzalo|juan|luis|[aá]lvaro|javier|andr[eé]s|carlos|federico|roberto|alex|mario|rodrigo|mateo|sebasti[aá]n|ra[uú]l|pablo|diego|gerardo|jos[eé]|enrique|male|hombre/i;

// Se elige la voz MÁS NATURAL que tenga el aparato: las voces "neuronales" (Microsoft "Natural/Online", Google)
// suenan como una persona; las viejas del sistema suenan robóticas. Acento latino primero (RD, EE. UU., México).
function puntos(v) {
  let p = 0;
  if (/natural|neural|online|premium|enhanced|mejorad/i.test(v.name)) p += 100;
  if (/google/i.test(v.name)) p += 60;
  if (/es[-_]DO/i.test(v.lang)) p += 30; else if (/es[-_](US|419)/i.test(v.lang)) p += 25; else if (/es[-_]MX/i.test(v.lang)) p += 20;
  if (!v.localService) p += 5;   // las voces en línea suelen ser las de mejor calidad
  return p;
}
function elegirVoces() {
  if (!('speechSynthesis' in window)) return;
  const es = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang)).sort((a, b) => puntos(b) - puntos(a));
  const mejor = l => l[0] || null;
  voces = { todas: es, mujer: mejor(es.filter(v => MUJER.test(v.name) && !HOMBRE.test(v.name))), hombre: mejor(es.filter(v => HOMBRE.test(v.name) && !MUJER.test(v.name))) };
  voces.general = mejor(es);
}
if ('speechSynthesis' in window) {
  elegirVoces();
  speechSynthesis.onvoiceschanged = elegirVoces;
}

export const vozDisponible = () => 'speechSynthesis' in window;
// Qué voz usa cada uno (para revisar en pruebas)
export const vocesElegidas = () => ({ mujer: voces.mujer?.name, hombre: voces.hombre?.name, general: voces.general?.name });
export function configurarVoz(on) { activo = on; if (!on && vozDisponible()) speechSynthesis.cancel(); }
export const vozActiva = () => activo;
export function callar() { if (vozDisponible()) speechSynthesis.cancel(); }

// Quién habla a partir de ahora (p. ej. al empezar un bloque de cardio habla Yanelis)
export function cambiarHablante(id) { hablante = id; }

// Globo en pantalla: cara, nombre y lo que dice
let globo = null, tGlobo = null;
function mostrarGlobo(id, texto) {
  if (typeof document === 'undefined') return;
  const m = miembro(id);
  if (!globo) {
    globo = document.createElement('div');
    globo.className = 'globo-voz';
    globo.setAttribute('role', 'status');
    globo.setAttribute('aria-live', 'polite');
    document.body.appendChild(globo);
  }
  globo.style.setProperty('--qh', m.color);
  globo.innerHTML = `<span class="gv-cara" aria-hidden="true">${m.icono}</span><span class="gv-texto"><strong>${m.nombre}</strong> <small>${m.rol} · asistente virtual</small><span class="gv-dice"></span></span>`;
  globo.querySelector('.gv-dice').textContent = texto;
  globo.classList.add('visible');
  clearTimeout(tGlobo);
  tGlobo = setTimeout(() => globo.classList.remove('visible'), Math.max(2600, texto.length * 75));
}

// alEmpezar / alTerminar: para resaltar en pantalla lo que se está leyendo. globo: false si el texto ya se ve en pantalla.
export function hablar(texto, { interrumpir = true, quien = hablante, alEmpezar = null, alTerminar = null, globo = true, velocidad = 1 } = {}) {
  if (!texto) return;
  // Los números de una cuenta atrás no cambian el globo (se vería parpadear)
  const corto = texto.length <= 8;
  if (!corto && globo) mostrarGlobo(quien, texto);
  if (!activo || !vozDisponible()) { alTerminar?.(); return; }
  try {
    if (interrumpir) speechSynthesis.cancel();
    const m = miembro(quien);
    // Habla directo, como una persona (quién habla ya se ve en el globo de la pantalla)
    const u = new SpeechSynthesisUtterance(texto);
    const voz = voces[m.voz] || voces.general || null;
    u.lang = voz?.lang || 'es-ES';
    if (voz) u.voice = voz;
    // Tono natural salvo quien tenga el suyo (Lucas, más grave). Si el aparato no tiene voz de hombre (o de mujer)
    // se ajusta el tono para que suene a hombre o a mujer (el dueño lo exige, aunque suene algo menos natural)
    const tono = m.tono || 1;
    u.pitch = voces[m.voz] ? tono : m.voz === 'hombre' ? Math.max(0.6, tono * 0.8) : m.voz === 'mujer' ? 1.2 : tono;
    u.rate = velocidad * (m.ritmo || 1);
    if (alEmpezar) u.onstart = alEmpezar;
    if (alTerminar) { u.onend = alTerminar; u.onerror = alTerminar; }
    speechSynthesis.speak(u);
  } catch { alTerminar?.(); }
}

export const NUMEROS = { 10: 'Diez segundos', 5: 'Cinco', 4: 'Cuatro', 3: 'Tres', 2: 'Dos', 1: 'Uno' };
