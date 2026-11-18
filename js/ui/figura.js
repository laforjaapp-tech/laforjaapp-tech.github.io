// ILUSTRACIONES DE EJERCICIOS
// Figura humana anatómica dibujada en SVG dentro de la app (sin imágenes ni internet).
// Se mueve de la posición inicial a la final y resalta los músculos que trabaja el ejercicio:
// principales en rojo fuego y secundarios en ámbar. Las posturas de cada ejercicio están en datos/poses.js.
//
// Ángulos (grados, absolutos en pantalla): 0 = hacia abajo, 90 = hacia delante (derecha), 180 = arriba, -90 = atrás.
// Vista "lado": la persona mira a la derecha; C = brazo/pierna cercanos, L = lejanos.
// Vista "frente": la persona mira al espectador; D = su lado derecho (izquierda de la pantalla), I = su lado izquierdo.

import { POSES } from '../datos/poses.js';
import { ejercicioPorId, NOMBRES_GRUPO } from '../datos/ejercicios.js';

const RAD = Math.PI / 180;
const NS = 'http://www.w3.org/2000/svg';

// ---------- Vectores ----------
const suma = (a, b) => [a[0] + b[0], a[1] + b[1]];
const resta = (a, b) => [a[0] - b[0], a[1] - b[1]];
const por = (a, k) => [a[0] * k, a[1] * k];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const medio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const dir = ang => [Math.sin(ang * RAD), Math.cos(ang * RAD)];
const angulo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) / RAD;
// Lado anterior de cada segmento (el signo cambia entre lo que cuelga y lo que sube)
const antMiembro = ang => [Math.cos(ang * RAD), -Math.sin(ang * RAD)];
const antTronco = ang => [-Math.cos(ang * RAD), Math.sin(ang * RAD)];
const fmt = p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const suave = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const lerp = (a, b, f) => a + (b - a) * f;

// ---------- Medidas del cuerpo (unidades del dibujo; de pie mide ≈ 155) ----------
const M = { tronco: 50, cuello: 7, brazo: 28, antebrazo: 25, mano: 8.5, muslo: 39, pierna: 37 };

// Perfiles de anchura: [u (0 = articulación de origen, 1 = articulación final), ancho delante, ancho detrás]
const PERFIL = {
  lado: {
    tronco: [[-0.24, 3, 4], [-0.16, 8, 10.5], [-0.02, 10.5, 13.5], [0.14, 11, 12.5], [0.32, 11.5, 10], [0.5, 11.5, 10.5], [0.68, 12.5, 11.5], [0.84, 12.2, 11.5], [0.96, 9.5, 10.5], [1.05, 5.5, 7]],
    cuello: [[-0.1, 3.6, 4.6], [0.5, 3.4, 4], [1.1, 3.8, 4.3]],
    muslo: [[-0.13, 2.5, 3], [-0.06, 6.2, 7], [0.05, 8.5, 9.2], [0.25, 8.8, 8.5], [0.55, 7.8, 7], [0.82, 6.2, 5.6], [1, 5.6, 5], [1.08, 4.5, 4]],
    pierna: [[-0.06, 4.6, 4.8], [0.05, 4.8, 5.8], [0.22, 4.6, 7.2], [0.42, 4.2, 6.6], [0.7, 3.3, 4.3], [0.9, 2.9, 3.2], [1, 2.9, 3], [1.05, 2.6, 2.6]],
    brazo: [[-0.16, 4, 4], [-0.06, 6.3, 6.5], [0.12, 6.2, 6], [0.32, 5.2, 5.4], [0.55, 5.2, 4.8], [0.85, 4, 3.9], [1, 3.6, 3.6], [1.06, 3, 3]],
    antebrazo: [[-0.04, 3.4, 3.4], [0.1, 3.9, 3.8], [0.3, 4.2, 4], [0.65, 3.2, 3.1], [0.95, 2.4, 2.4], [1.02, 2.2, 2.2]],
    mano: [[-0.05, 2.4, 2.4], [0.3, 3.4, 3.2], [0.75, 3.3, 3.1], [1, 2.2, 2.2]],
  },
  frente: {
    tronco: [[-0.2, 12.5, 12.5], [-0.06, 15, 15], [0.08, 15.2, 15.2], [0.28, 13.4, 13.4], [0.45, 13.6, 13.6], [0.66, 16, 16], [0.84, 17.5, 17.5], [0.95, 16, 16], [1.03, 9, 9], [1.06, 5, 5]],
    cuello: [[-0.1, 5, 5], [0.5, 4.4, 4.4], [1.1, 4.6, 4.6]],
    muslo: [[-0.12, 3, 3], [-0.05, 7, 7], [0.06, 8.8, 8.8], [0.3, 8.4, 8.4], [0.62, 6.8, 6.8], [0.88, 5.4, 5.4], [1, 5, 5], [1.07, 4.2, 4.2]],
    pierna: [[-0.04, 4.8, 4.8], [0.1, 5.3, 5.3], [0.28, 5.7, 5.7], [0.52, 4.8, 4.8], [0.8, 3.4, 3.4], [1, 3, 3], [1.04, 2.7, 2.7]],
    brazo: [[-0.16, 4.5, 4.5], [-0.06, 6.6, 6.6], [0.14, 6.4, 6.4], [0.36, 5.2, 5.2], [0.6, 4.8, 4.8], [0.88, 3.9, 3.9], [1, 3.6, 3.6], [1.06, 3, 3]],
    antebrazo: [[-0.04, 3.4, 3.4], [0.12, 4.1, 4.1], [0.32, 4.1, 4.1], [0.66, 3.1, 3.1], [0.95, 2.4, 2.4], [1.02, 2.2, 2.2]],
    mano: [[-0.05, 2.4, 2.4], [0.3, 3.3, 3.3], [0.75, 3.2, 3.2], [1, 2.2, 2.2]],
  },
};

// Extremidades algo más musculosas que el perfil base
for (const v of Object.values(PERFIL)) for (const k of ['muslo', 'pierna', 'brazo', 'antebrazo']) v[k] = v[k].map(([u, a, b]) => [u, a * 1.1, b * 1.1]);

// Figura de MUJER atlética: hombros y brazos más estrechos, cintura marcada, cadera y glúteos más anchos.
// Pecho de forma suave, sin detalles (como un maniquí deportivo).
const escalar = (perfil, fn) => perfil.map(([u, a, b]) => { const [ka, kb] = fn(u); return [u, a * ka, b * kb]; });
const campana = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));
const PERFIL_MUJER = {
  lado: {
    ...PERFIL.lado,
    tronco: escalar(PERFIL.lado.tronco, u => [1 - 0.1 * campana(u, 0.42, 0.14) + 0.16 * campana(u, 0.74, 0.08), 1 + 0.2 * campana(u, -0.02, 0.12) - 0.08 * campana(u, 0.45, 0.15) - 0.06 * campana(u, 0.8, 0.12)]),
    brazo: escalar(PERFIL.lado.brazo, () => [0.86, 0.86]), antebrazo: escalar(PERFIL.lado.antebrazo, () => [0.88, 0.88]),
    muslo: escalar(PERFIL.lado.muslo, u => [0.97, 1 + 0.06 * campana(u, 0.1, 0.2)]), pierna: escalar(PERFIL.lado.pierna, () => [0.93, 0.93]),
    cuello: escalar(PERFIL.lado.cuello, () => [0.88, 0.88]),
  },
  frente: {
    ...PERFIL.frente,
    tronco: escalar(PERFIL.frente.tronco, u => { const k = 1 + 0.17 * campana(u, 0.0, 0.13) - 0.17 * campana(u, 0.4, 0.13) - 0.1 * campana(u, 0.88, 0.1); return [k, k]; }),
    brazo: escalar(PERFIL.frente.brazo, () => [0.86, 0.86]), antebrazo: escalar(PERFIL.frente.antebrazo, () => [0.88, 0.88]),
    muslo: escalar(PERFIL.frente.muslo, u => [1 + 0.06 * campana(u, 0.05, 0.2), 1 + 0.06 * campana(u, 0.05, 0.2)]), pierna: escalar(PERFIL.frente.pierna, () => [0.93, 0.93]),
    cuello: escalar(PERFIL.frente.cuello, () => [0.86, 0.86]),
  },
};
const PERFILES = { hombre: PERFIL, mujer: PERFIL_MUJER };
// Anchura de hombros y caderas (vista de frente)
const ANCHOS = { hombre: { hombro: 15.5, cadera: 8.2 }, mujer: { hombro: 13.6, cadera: 9 } };

// Qué figura se dibuja: la del sexo de la persona (se puede cambiar en Perfil)
let sexoFigura = 'hombre';
export function ponerSexoFigura(sexo) { sexoFigura = sexo === 'mujer' ? 'mujer' : 'hombre'; }
export const sexoDeFigura = () => sexoFigura;

// Foto de la persona en la cara del modelo (se queda en el teléfono: viene del atleta guardado)
let fotoCara = null;
export function ponerFotoFigura(url) { fotoCara = url || null; }
export const fotoDeFigura = () => fotoCara;

// Ritmo de las demostraciones: la persona lo ajusta (🐢 / 🐇) y vale para todas
const RITMOS = [0.6, 0.8, 1, 1.25, 1.5];
const leerLocal = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const ponerLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
let ritmo = RITMOS.includes(Number(leerLocal('la-forja-ritmo', 1))) ? Number(leerLocal('la-forja-ritmo', 1)) : 1;
// En pausa (entrenamiento pausado) las figuras se quedan quietas y no cuentan
let enPausa = false;
export function pausarFiguras(v) { enPausa = !!v; }
export const ritmoFigura = () => (enPausa ? 0 : ritmo);
const NOMBRE_RITMO = { 0.6: 'Muy lento', 0.8: 'Lento', 1: 'Normal', 1.25: 'Rápido', 1.5: 'Muy rápido' };
function cambiarRitmo(paso) {
  ritmo = RITMOS[Math.max(0, Math.min(RITMOS.length - 1, RITMOS.indexOf(ritmo) + paso))];
  ponerLocal('la-forja-ritmo', ritmo);
  return ritmo;
}
// Persona 3D realista (si el aparato puede) o el dibujo. Se elige en Perfil → Apariencia.
export const usar3D = () => leerLocal('la-forja-figura-3d', '1') !== '0';
export function ponerUsar3D(on) { ponerLocal('la-forja-figura-3d', on ? '1' : '0'); }

// Cabeza y pies: puntos locales (x = hacia delante/lateral, y = a lo largo del eje)
const CABEZA = {
  lado: [[-3.6, -1], [-6.2, 3.5], [-8, 9.5], [-7.8, 15.5], [-5, 20], [0, 22.2], [4.8, 20.6], [7.6, 16.5], [8.4, 12.2], [9.8, 9.6], [8.6, 8.3], [8.5, 6.4], [8, 4.6], [6.6, 2], [3.6, 0.6], [1.2, 0.4]],
  frente: [[-4.2, -0.5], [-6.4, 3.5], [-7.6, 9], [-7.8, 14.5], [-6.4, 19.2], [-3.4, 21.8], [0, 22.4], [3.4, 21.8], [6.4, 19.2], [7.8, 14.5], [7.6, 9], [6.4, 3.5], [4.2, -0.5]],
};
const PELO = {
  hombre: {
    lado: [[-8.3, 9.5], [-8.6, 15.5], [-5.6, 20.9], [0, 23.2], [5.2, 21.5], [8, 17], [6.2, 17.9], [1.5, 19.8], [-3.8, 18], [-6.4, 12.5]],
    frente: [[-8.1, 10], [-8.3, 15], [-6.9, 19.9], [-3.5, 22.7], [0, 23.3], [3.5, 22.7], [6.9, 19.9], [8.3, 15], [8.1, 10], [7, 14], [5, 18.4], [0, 19.8], [-5, 18.4], [-7, 14]],
  },
  mujer: {
    // Cabello recogido en cola: se ve por detrás de la cabeza
    lado: [[-8.7, 6], [-9.1, 12], [-8.9, 16.6], [-5.7, 21.1], [0, 23.4], [5.2, 21.6], [8.1, 17.2], [6.1, 18.2], [1.2, 20], [-4.2, 18], [-6.2, 12], [-6.6, 7]],
    cola: [[-7.6, 18.6], [-11.6, 18.4], [-14.2, 14.6], [-14.6, 9], [-13, 4.6], [-11.4, 5.4], [-12.2, 9.8], [-11.4, 14.2], [-8.6, 15.6]],
    frente: [[-8.9, 5], [-9.1, 12], [-8.4, 16.8], [-6.9, 20.2], [-3.5, 22.9], [0, 23.5], [3.5, 22.9], [6.9, 20.2], [8.4, 16.8], [9.1, 12], [8.9, 5], [7.5, 6], [7.3, 14], [5, 18.6], [0, 19.9], [-5, 18.6], [-7.3, 14], [-7.5, 6]],
  },
};
const OREJA = { lado: [[-1.2, 8], [0.6, 8.6], [0.8, 12.4], [-0.6, 13.2], [-1.8, 11]] };
const PIE = {
  lado: [[-2.8, 2.6], [2.5, 2.2], [9, -0.6], [14.2, -2.4], [14.6, -4], [13, -4.8], [-3.5, -4.8], [-5.2, -3.6], [-5, -0.5]],
  frente: [[-3.2, -1.5], [3.2, -1.5], [4.2, 2.5], [4.6, 4.6], [-4.6, 4.6], [-4.2, 2.5]],
};

// Músculos: u = tramo del segmento, v = de -1 (detrás) a 1 (delante); "lado" indica qué borde abraza el contorno.
// En la vista de frente están escritos para el lado derecho; el izquierdo se refleja. espejo = también al otro lado.
const MUSCULOS = {
  lado: {
    tronco: [
      { g: 'espalda', u: [0.26, 0.97], v: [-0.97, -0.28], lado: 'atras' },
      { g: 'espalda', u: [0.0, 0.46], v: [-0.97, -0.6], lado: 'atras' },
      { g: 'gluteos', u: [-0.2, 0.22], v: [-0.97, -0.05], lado: 'atras' },
      { g: 'core', u: [0.14, 0.62], v: [-0.3, 0.32], lado: 'centro' },
      { g: 'core', u: [0.08, 0.66], v: [0.32, 0.97], lado: 'delante', cortes: [0.3, 0.45] },
      { g: 'pecho', u: [0.63, 0.95], v: [0.0, 0.97], lado: 'delante' },
    ],
    muslo: [{ g: 'isquiotibiales', u: [0.1, 0.94], v: [-0.96, 0.02], lado: 'atras' }, { g: 'cuadriceps', u: [0.04, 0.96], v: [-0.2, 0.96], lado: 'delante' }],
    pierna: [{ g: null, u: [0.08, 0.8], v: [0.3, 0.95], lado: 'delante' }, { g: 'pantorrillas', u: [0.02, 0.66], v: [-0.97, 0.08], lado: 'atras' }],
    brazo: [{ g: 'triceps', u: [0.24, 0.92], v: [-0.96, -0.02], lado: 'atras' }, { g: 'biceps', u: [0.32, 0.9], v: [0.02, 0.96], lado: 'delante' }, { g: 'hombros', u: [-0.16, 0.42], v: [-0.97, 0.97], lado: 'centro' }],
    antebrazo: [{ g: null, u: [0.02, 0.7], v: [-0.85, 0.85], lado: 'centro' }],
  },
  frente: {
    tronco: [
      { g: 'gluteos', u: [-0.14, 0.14], v: [-0.99, -0.76], lado: 'atras', espejo: true },
      { g: 'espalda', u: [0.56, 0.86], v: [-0.99, -0.82], lado: 'atras', espejo: true },
      { g: 'espalda', u: [0.92, 1.05], v: [-0.9, -0.3], lado: 'centro', espejo: true },
      { g: 'core', u: [0.16, 0.6], v: [-0.97, -0.46], lado: 'centro', espejo: true },
      { g: 'core', u: [0.1, 0.64], v: [-0.42, 0.42], lado: 'centro', cortes: [0.28, 0.4, 0.52], linea: true },
      { g: 'pecho', u: [0.64, 0.93], v: [-0.94, -0.04], lado: 'centro', espejo: true },
    ],
    muslo: [{ g: null, u: [0.04, 0.55], v: [0.45, 0.97], lado: 'delante' }, { g: 'cuadriceps', u: [0.05, 0.95], v: [-0.9, 0.5], lado: 'centro' }],
    pierna: [{ g: null, u: [0.08, 0.78], v: [-0.4, 0.25], lado: 'centro' }, { g: 'pantorrillas', u: [0.06, 0.55], v: [-0.98, -0.5], lado: 'atras' }, { g: 'pantorrillas', u: [0.06, 0.6], v: [0.5, 0.98], lado: 'delante' }],
    brazo: [{ g: 'triceps', u: [0.22, 0.88], v: [-0.97, -0.55], lado: 'atras' }, { g: 'biceps', u: [0.3, 0.9], v: [-0.55, 0.6], lado: 'centro' }, { g: 'hombros', u: [-0.16, 0.42], v: [-0.97, 0.97], lado: 'centro' }],
    antebrazo: [{ g: null, u: [0.02, 0.7], v: [-0.85, 0.85], lado: 'centro' }],
  },
};
const reflejar = m => ({ ...m, v: [-m.v[1], -m.v[0]], lado: m.lado === 'delante' ? 'atras' : m.lado === 'atras' ? 'delante' : 'centro' });

// ---------- Curvas ----------
function curva(pts, cerrada = true) {
  const n = pts.length;
  if (n < 2) return '';
  const p = i => cerrada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${fmt(pts[0])}`;
  const fin = cerrada ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    d += `C${fmt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${fmt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${fmt(p2)}`;
  }
  return cerrada ? d + 'Z' : d;
}

function ancho(perfil, u) {
  if (u <= perfil[0][0]) return [perfil[0][1], perfil[0][2]];
  for (let i = 1; i < perfil.length; i++) {
    const [u1, f1, b1] = perfil[i];
    if (u <= u1) { const [u0, f0, b0] = perfil[i - 1]; const k = (u - u0) / (u1 - u0); return [lerp(f0, f1, k), lerp(b0, b1, k)]; }
  }
  const l = perfil[perfil.length - 1]; return [l[1], l[2]];
}

// Segmento recto entre dos articulaciones → función (u, v) → punto
function mapaSegmento(p0, p1, perfil, ant = antMiembro) {
  const L = dist(p0, p1) || 0.001, ang = angulo(p0, p1), d = dir(ang), a = ant(ang);
  return (u, v) => {
    const [fr, bk] = ancho(perfil, u), w = v >= 0 ? v * fr : v * bk;
    return [p0[0] + d[0] * u * L + a[0] * w, p0[1] + d[1] * u * L + a[1] * w];
  };
}

// Tronco con columna flexible: el ángulo pasa de t1 (pelvis) a t2 (pecho) de forma suave
function mapaTronco(origen, t1, t2, L, perfil, vientre, vista) {
  const angU = u => t1 + (t2 - t1) * suave((u - 0.2) / 0.6);
  const paso = 0.05, desde = -0.3, hasta = 1.15;
  const n0 = Math.round(-desde / paso), muestras = [];
  muestras[n0] = origen;
  for (let i = n0 + 1; i * paso + desde <= hasta + 1e-9; i++) muestras[i] = suma(muestras[i - 1], por(dir(angU(desde + (i - 0.5) * paso)), paso * L));
  for (let i = n0 - 1; i >= 0; i--) muestras[i] = resta(muestras[i + 1], por(dir(angU(desde + (i + 0.5) * paso)), paso * L));
  const centro = u => {
    const x = (u - desde) / paso, i = Math.max(0, Math.min(muestras.length - 2, Math.floor(x))), k = x - i;
    return [lerp(muestras[i][0], muestras[i + 1][0], k), lerp(muestras[i][1], muestras[i + 1][1], k)];
  };
  const anchoV = u => {
    const [fr, bk] = ancho(perfil, u), panza = vientre * Math.exp(-(((u - 0.33) / 0.17) ** 2));
    return vista === 'lado' ? [fr + panza, bk] : [fr + panza * 0.5, bk + panza * 0.5];
  };
  const mapa = (u, v) => { const [fr, bk] = anchoV(u), a = antTronco(angU(u)), w = v >= 0 ? v * fr : v * bk; return suma(centro(u), por(a, w)); };
  return { mapa, centro, angU };
}

// ---------- Esqueleto (cinemática directa) ----------
function esqueleto(vista, p) {
  const k = n => p['k' + n] ?? 1;
  const t1 = p.t ?? 180, t2 = p.t2 ?? t1;
  const tronco = mapaTronco([0, 0], t1, t2, M.tronco * (p.kt ?? 1), PERFILES[sexoFigura][vista].tronco, p.vientre || 0, vista);
  const AN = ANCHOS[sexoFigura];
  const J = { vista, tronco, t1, t2, cadera: [0, 0] };
  const rel = p.rel ? t2 - 180 : 0;
  const miembros = vista === 'lado' ? ['C', 'L'] : ['D', 'I'];
  const aTop = antTronco(tronco.angU(0.9)), aBase = antTronco(t1);
  J.brazos = {}; J.piernas = {};
  for (const s of miembros) {
    const lat = s === 'D' ? -1 : 1;
    const hombro = vista === 'lado' ? suma(tronco.centro(0.92), por(aTop, -0.8)) : suma(suma(tronco.centro(0.9), por(aTop, AN.hombro * lat)), por(dir(tronco.angU(0.9)), -1));
    const cadera = vista === 'lado' ? [0, 0] : por(aBase, AN.cadera * lat);
    const kb = s.toLowerCase();
    const angB = (p['b' + kb] ?? 0) + rel, angA = (p['a' + kb] ?? 0) + rel;
    const codo = suma(hombro, por(dir(angB), M.brazo * k('b' + kb)));
    const muneca = suma(codo, por(dir(angA), M.antebrazo * k('a' + kb)));
    J.brazos[s] = { raiz: hombro, medio: codo, fin: muneca, mano: p['h' + kb] != null ? p['h' + kb] + rel : null };
    const rodilla = suma(cadera, por(dir(p['m' + kb] ?? 0), M.muslo * k('m' + kb)));
    const tobillo = suma(rodilla, por(dir(p['p' + kb] ?? 0), M.pierna * k('p' + kb)));
    J.piernas[s] = { raiz: cadera, medio: rodilla, fin: tobillo, pie: p['f' + kb] ?? 90 };
  }
  J.cuello = vista === 'lado' ? suma(tronco.centro(1.0), por(antTronco(t2), -1.2)) : tronco.centro(1.0);
  J.th = t2 + (p.c ?? 0);
  J.cabeza = suma(J.cuello, por(dir(J.th), M.cuello));
  return J;
}

const PUNTOS = {
  cadera: J => J.cadera, cuello: J => J.cuello, cabeza: J => J.cabeza,
  hombros: J => promedio(Object.values(J.brazos).map(b => b.raiz)),
  manos: J => promedio(Object.values(J.brazos).map(b => b.fin)),
  pies: J => promedio(Object.values(J.piernas).map(b => b.fin)),
  rodillas: J => promedio(Object.values(J.piernas).map(b => b.medio)),
};
const promedio = l => por(l.reduce(suma, [0, 0]), 1 / l.length);
const angMano = b => b.mano ?? angulo(b.medio, b.fin);
const punoDe = b => suma(b.fin, por(dir(angMano(b)), M.mano * 0.55));   // centro del puño (donde va la mancuerna)
function punto(J, nombre) {
  if (PUNTOS[nombre]) return PUNTOS[nombre](J);
  const m = /^(mano|pie|codo|rodilla|hombro)([CLDI])$/.exec(nombre);
  if (!m) return J.cadera;
  const b = J.brazos[m[2]], q = J.piernas[m[2]];
  return { mano: b?.fin, codo: b?.medio, hombro: b?.raiz, pie: q?.fin, rodilla: q?.medio }[m[1]] || J.cadera;
}
// Extremos que se mantienen fijos (manos en el suelo, pies apoyados…)
function extremos(nombre) {
  if (nombre === 'manos') return [['brazos', 'C'], ['brazos', 'L'], ['brazos', 'D'], ['brazos', 'I']];
  if (nombre === 'pies') return [['piernas', 'C'], ['piernas', 'L'], ['piernas', 'D'], ['piernas', 'I']];
  const m = /^(mano|pie)([CLDI])$/.exec(nombre);
  return m ? [[m[1] === 'mano' ? 'brazos' : 'piernas', m[2]]] : [];
}

function mover(J, d) {
  const T = q => suma(q, d);
  const Jn = { ...J, cadera: T(J.cadera), cuello: T(J.cuello), cabeza: T(J.cabeza), brazos: {}, piernas: {} };
  const mapa0 = J.tronco;
  Jn.tronco = { ...mapa0, mapa: (u, v) => T(mapa0.mapa(u, v)), centro: u => T(mapa0.centro(u)) };
  for (const g of ['brazos', 'piernas']) for (const [s, x] of Object.entries(J[g])) Jn[g][s] = { ...x, raiz: T(x.raiz), medio: T(x.medio), fin: T(x.fin) };
  return Jn;
}

// Dos huesos: lleva el extremo al objetivo manteniendo el sentido del codo o la rodilla
function ik(x, objetivo) {
  const L1 = dist(x.raiz, x.medio), L2 = dist(x.medio, x.fin);
  const v = resta(objetivo, x.raiz), d0 = Math.hypot(...v) || 0.001;
  const d = Math.min(Math.max(d0, Math.abs(L1 - L2) + 0.01), L1 + L2 - 0.01);
  const u = por(v, 1 / d0), perp = [-u[1], u[0]];
  const m = resta(x.medio, x.raiz), lado = Math.sign(u[0] * m[1] - u[1] * m[0]) || 1;
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  return { ...x, medio: suma(suma(x.raiz, por(u, a)), por(perp, h * lado)), fin: suma(x.raiz, por(u, d)) };
}

// ---------- Geometría (contornos y músculos) ----------
function lente(mapa, m, n = 9) {
  const [u0, u1] = m.u, [vl, vh] = m.v, c = (vl + vh) / 2;
  const borde = (t, alto) => {
    const s = Math.pow(Math.sin(Math.PI * t), 0.75);
    if (m.lado === 'delante') return alto ? vh : vh - (vh - vl) * s;
    if (m.lado === 'atras') return alto ? vl + (vh - vl) * s : vl;
    return alto ? c + (vh - c) * s : c - (c - vl) * s;
  };
  const uT = t => u0 + (u1 - u0) * t, pts = [];
  for (let i = 0; i <= n; i++) pts.push(mapa(uT(i / n), borde(i / n, true)));
  for (let i = n - 1; i >= 1; i--) pts.push(mapa(uT(i / n), borde(i / n, false)));
  const fibras = [0.35, 0.68].map(f => { const l = []; for (let i = 1; i < n; i++) { const t = i / n; l.push(mapa(uT(t), lerp(borde(t, false), borde(t, true), f))); } return l; });
  for (const uc of m.cortes || []) fibras.push([mapa(uc, lerp(vl, vh, 0.08)), mapa(uc, lerp(vl, vh, 0.92))]);
  if (m.linea) fibras.push([mapa(u0 + 0.02, c), mapa(u1 - 0.02, c)]);
  return { pts, fibras };
}

function contorno(mapa, perfil) {
  const us = [...new Set([...perfil.map(x => x[0]), 0.2, 0.35, 0.5, 0.65, 0.8])].filter(u => u >= perfil[0][0] && u <= perfil[perfil.length - 1][0]).sort((a, b) => a - b);
  // Punta redondeada en cada extremo: un punto más allá del eje, a media anchura de distancia
  const punta = (u, haciaFuera) => {
    const c = mapa(u, 0), e = resta(c, mapa(u - haciaFuera * 0.02, 0)), l = Math.hypot(...e) || 1;
    const w = (dist(mapa(u, 1), c) + dist(mapa(u, -1), c)) / 2;
    return suma(c, por(e, (w * 0.75) / l));
  };
  const u0 = us[0], u1 = us[us.length - 1];
  return [...us.map(u => mapa(u, 1)), punta(u1, 1), ...us.slice().reverse().map(u => mapa(u, -1)), punta(u0, -1)];
}

function local(base, angEje, antFn, pts) {
  const d = dir(angEje), a = antFn(angEje);
  return pts.map(([x, y]) => [base[0] + a[0] * x + d[0] * y, base[1] + a[1] * x + d[1] * y]);
}

// Partes del cuerpo en orden de dibujo (lo lejano primero). Sin músculos basta para encuadrar y apoyar en el suelo.
function geometria(J, conMusculos = true) {
  const v = J.vista, P = PERFILES[sexoFigura][v], MU = MUSCULOS[v], partes = [];
  const parte = (id, capa, mapa, perfil, musc = [], espejo = false) => {
    const lista = [];
    for (const m of conMusculos ? musc : []) { const mm = espejo ? reflejar(m) : m; lista.push({ g: mm.g, ...lente(mapa, mm) }); if (m.espejo) lista.push({ g: m.g, ...lente(mapa, reflejar(m)) }); }
    partes.push({ id, capa, contorno: contorno(mapa, perfil), musculos: lista });
  };
  // Antebrazo y mano primero; el brazo encima para que el deltoides y el codo se vean bien
  const brazo = (s, capa) => {
    const b = J.brazos[s], esp = s === 'I';
    parte('antebrazo' + s, capa, mapaSegmento(b.medio, b.fin, P.antebrazo), P.antebrazo, MU.antebrazo, esp);
    parte('mano' + s, capa, mapaSegmento(b.fin, suma(b.fin, por(dir(angMano(b)), M.mano)), P.mano), P.mano);
    parte('brazo' + s, capa, mapaSegmento(b.raiz, b.medio, P.brazo), P.brazo, MU.brazo, esp);
  };
  const pierna = (s, capa) => {
    const q = J.piernas[s], esp = s === 'I';
    const pie = v === 'lado' ? local(q.fin, q.pie, antMiembro, PIE.lado.map(([x, y]) => [y, x]))
      : local(q.fin, angulo(q.medio, q.fin), antMiembro, PIE.frente.map(([x, y]) => [esp ? -x : x, y]));
    partes.push({ id: 'pie' + s, capa, contorno: pie, musculos: [] });
    parte('pierna' + s, capa, mapaSegmento(q.medio, q.fin, P.pierna), P.pierna, MU.pierna, esp);
    parte('muslo' + s, capa, mapaSegmento(q.raiz, q.medio, P.muslo), P.muslo, MU.muslo, esp);
  };
  const troncoYCabeza = () => {
    const mt = J.tronco.mapa;
    parte('tronco', 'cuerpo', mt, P.tronco, MU.tronco);
    parte('cuello', 'cuerpo', mapaSegmento(J.cuello, J.cabeza, P.cuello, antTronco), P.cuello);
    const cab = local(J.cabeza, J.th + 180, antMiembro, CABEZA[v].map(([x, y]) => [x, -y]));
    const oreja = v === 'lado' ? [{ g: null, pts: local(J.cabeza, J.th + 180, antMiembro, OREJA.lado.map(([x, y]) => [x, -y])), fibras: [] }] : [];
    const enCabeza = pts => local(J.cabeza, J.th + 180, antMiembro, pts.map(([x, y]) => [x, -y]));
    const pelo = PELO[sexoFigura];
    if (pelo.cola && v === 'lado') partes.push({ id: 'pelo-cola', capa: 'cuerpo', pelo: true, contorno: enCabeza(pelo.cola), musculos: [] });
    partes.push({ id: 'cabeza', capa: 'cuerpo', contorno: cab, musculos: oreja });
    partes.push({ id: 'pelo', capa: 'cuerpo', pelo: true, contorno: enCabeza(pelo[v]), musculos: [] });
  };
  if (v === 'lado') {
    brazo('L', 'lejos'); pierna('L', 'lejos');
    troncoYCabeza();
    pierna('C', 'cuerpo'); brazo('C', 'cuerpo');
  } else {
    pierna('D', 'cuerpo'); pierna('I', 'cuerpo');
    troncoYCabeza();
    brazo('D', 'cuerpo'); brazo('I', 'cuerpo');
  }
  return partes;
}

const masBajo = partes => Math.max(...partes.flatMap(p => p.contorno.map(q => q[1])));

// ---------- Línea de tiempo ----------
function lineaTiempo(spec) {
  const n = spec.poses.length;
  const trans = { rapido: 0.42, paso: 0.62, lento: 1.8 }[spec.ritmo] ?? 1.05;
  const pausa = { rapido: 0.04, paso: 0.03, lento: 0.7 }[spec.ritmo] ?? 0.45;
  const tramos = [];   // { de, a, dur } (de === a → pausa)
  if (n === 1) tramos.push({ de: 0, a: 0, dur: 3 });
  else if (spec.modo === 'ciclo') for (let i = 0; i < n; i++) tramos.push({ de: i, a: (i + 1) % n, dur: trans * (spec.tiempos?.[i] ?? 1) });
  else {
    const ida = [...Array(n).keys()], orden = spec.modo === 'reinicio' ? ida : [...ida, ...ida.slice(1, -1).reverse()];
    orden.forEach((k, i) => {
      tramos.push({ de: k, a: k, dur: pausa * (spec.pausas?.[k] ?? 1) });
      const sig = orden[i + 1] ?? (spec.modo === 'reinicio' ? null : orden[0]);
      if (sig != null) tramos.push({ de: k, a: sig, dur: trans * (spec.tiempos?.[i] ?? 1) });
    });
    if (spec.modo === 'reinicio') tramos.push({ de: n - 1, a: n - 1, dur: pausa * 1.5 });
  }
  const total = tramos.reduce((s, t) => s + t.dur, 0);
  return { total, en(seg) {
    let x = seg % total;
    for (const t of tramos) { if (x <= t.dur) return { de: t.de, a: t.a, f: t.de === t.a ? 0 : 0.5 - Math.cos(Math.PI * (x / t.dur)) / 2 }; x -= t.dur; }
    return { de: 0, a: 0, f: 0 };
  } };
}

function mezclar(A, B, f) {
  const r = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[k], b = B[k];
    r[k] = typeof a === 'number' && typeof b === 'number' ? lerp(a, b, f) : (f < 0.5 ? a ?? b : b ?? a);
  }
  return r;
}

// ---------- Escena: posturas ancladas al suelo o a un apoyo ----------
function escena(spec) {
  const vista = spec.vista || 'lado';
  const poses = spec.poses;
  const ancla = spec.ancla || 'pies';
  const J0 = esqueleto(vista, poses[0]);
  const bajo0 = masBajo(geometria(J0, false));
  const elevado = spec.elevado || 0;   // apoyo por encima del suelo (barra, bordillo…)
  const despl0 = [0, -bajo0 - elevado];
  const anclaMundo = suma(punto(J0, ancla === 'suelo' ? 'cadera' : ancla), despl0);
  const J0m = mover(J0, despl0);
  const fijos = (spec.fijos || []).flatMap(extremos).filter(([g, s]) => J0m[g][s]).map(([g, s]) => ({ g, s, objetivo: J0m[g][s].fin }));
  function pose(params) {
    let J = esqueleto(vista, params);
    let d;
    if (ancla === 'suelo') {
      const bajo = masBajo(geometria(J, false));
      d = [anclaMundo[0] + (params.px || 0) - J.cadera[0], -bajo - elevado - (params.alto || 0)];
    } else {
      d = suma(resta(anclaMundo, punto(J, ancla)), [params.px || 0, -(params.alto || 0)]);
    }
    J = mover(J, d);
    for (const x of fijos) J[x.g][x.s] = ik(J[x.g][x.s], x.objetivo);
    return J;
  }
  return { vista, pose, claves: poses.map(pose) };
}

// ---------- Material (barra, mancuernas, bandas, banco…) ----------
const C = { metal: '#5d636e', metalOscuro: '#2a2d33', borde: '#0f1013', disco: '#1b1d22', aro: '#6b717d', banda: '#5aa9e6', madera: '#3d3a37', saco: '#7a2d1c', cuerda: '#d7d7dc' };
const rect = (x, y, w, h, r = 1.5, fill = C.metal) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${r}" fill="${fill}" stroke="${C.borde}" stroke-width="0.8"/>`;
const linea = (a, b, w = 2, col = C.metal) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const circ = (c, r, fill = C.metal, extra = '') => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r}" fill="${fill}" stroke="${C.borde}" stroke-width="0.8" ${extra}/>`;
const disco = (c, r) => circ(c, r, C.disco) + `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(r * 0.72).toFixed(1)}" fill="none" stroke="${C.aro}" stroke-width="0.7" opacity="0.6"/>` + circ(c, Math.max(1.6, r * 0.18), C.aro);
const mancuerna = c => circ(c, 5.6, C.disco) + `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.6" fill="none" stroke="${C.aro}" stroke-width="0.7" opacity="0.7"/>` + circ(c, 1.4, C.aro);
const kettlebell = (mano, eje) => { const c = suma(mano, por(eje, 9.5)); return `<path d="M${fmt(suma(mano, por(eje, -1)))}m-3.5,0a3.8,3.8 0 1,0 7,0" fill="none" stroke="${C.disco}" stroke-width="2.2"/>` + circ(c, 7.2, C.disco) + `<circle cx="${c[0].toFixed(1)}" cy="${(c[1] + 1).toFixed(1)}" r="4.4" fill="none" stroke="${C.aro}" stroke-width="0.6" opacity="0.5"/>`; };
const bolsa = (mano) => `<path d="M${fmt(suma(mano, [-5, 2]))}l-1.5,15h13l-1.5,-15z" fill="#3b3d42" stroke="${C.borde}" stroke-width="0.8"/>`;

function material(spec, sc, alcance) {
  const lista = spec.material || [];
  const K = sc.claves;
  const geoK = K.map(J => geometria(J, false));
  const parteBaja = (k, ids) => Math.max(...geoK[k].filter(p => ids.some(id => p.id.startsWith(id))).flatMap(p => p.contorno.map(q => q[1])));
  const xs = (k, ids) => geoK[k].filter(p => ids.some(id => p.id.startsWith(id))).flatMap(p => p.contorno.map(q => q[0]));
  const piezas = [];
  for (const m of lista) {
    const k = m.pose ?? 0, J = K[k];
    const P = nombre => punto(J, nombre);
    switch (m.tipo) {
      case 'silla': {
        const y = parteBaja(k, ['tronco']), x = J.cadera[0] - 4;
        piezas.push({ capa: 'atras', svg: () => rect(x - 18, y, 32, 3.2) + linea([x - 16, y + 3], [x - 16, 0], 2.2) + linea([x + 12, y + 3], [x + 12, 0], 2.2) + rect(x - 19.5, y - 34, 3.4, 37) });
        break;
      }
      case 'banco': {
        // Bajo un punto (manos, hombros…) o bajo partes del cuerpo (tronco, pierna lejana…)
        let y, a, b;
        if (m.punto) { const q = P(m.punto); y = q[1] + (m.dy ?? 3); a = q[0] + (m.desde ?? -40); b = q[0] + (m.hasta ?? 10); }
        else {
          const ids = m.bajo || ['tronco'], xx = xs(k, ids);
          y = parteBaja(k, ids) + (m.dy || 0);
          const c = (Math.min(...xx) + Math.max(...xx)) / 2 + (m.dx || 0);
          if (m.ancho) { a = c - m.ancho / 2; b = c + m.ancho / 2; } else { a = Math.min(...xx) - 6 + (m.dx || 0); b = Math.max(...xx) + 6 + (m.dx || 0); }
        }
        piezas.push({ capa: 'atras', svg: () => rect(a, y, b - a, 5, 2, '#34373e') + rect(a + 3, y + 5, b - a - 6, 2.4, 1, C.metalOscuro) + linea([a + 6, y + 7], [a + 6, 0], 2.6) + linea([b - 6, y + 7], [b - 6, 0], 2.6) + linea([a + 2, 0], [a + 10, 0], 2.6) + linea([b - 10, 0], [b - 2, 0], 2.6) });
        break;
      }
      case 'escalon': case 'caja': {
        const ids = m.bajo || ['pieC'];
        const y = parteBaja(k, ids), xx = xs(k, ids), c = (Math.min(...xx) + Math.max(...xx)) / 2 + (m.dx || 0), w = m.ancho || 34;
        piezas.push({ capa: 'atras', svg: () => rect(c - w / 2, y, w, -y, 2, '#2e3036') + `<line x1="${(c - w / 2 + 2).toFixed(1)}" y1="${(y + 1.6).toFixed(1)}" x2="${(c + w / 2 - 2).toFixed(1)}" y2="${(y + 1.6).toFixed(1)}" stroke="${C.aro}" stroke-width="0.6" opacity="0.5"/>` });
        break;
      }
      case 'pared': {
        const x = P(m.punto || 'manos')[0] + (m.dx ?? 3);
        piezas.push({ capa: 'atras', svg: () => `<rect x="${x.toFixed(1)}" y="${(alcance.y0 - 20).toFixed(1)}" width="40" height="${(-alcance.y0 + 20).toFixed(1)}" fill="url(#pared-${alcance.id})" stroke="#3a3d44" stroke-width="0.8"/>` });
        break;
      }
      case 'muro': piezas.push({ capa: 'atras', svg: () => `<rect x="${(alcance.x0 - 20).toFixed(1)}" y="${(alcance.y0 - 20).toFixed(1)}" width="${(alcance.ancho + 40).toFixed(1)}" height="${(-alcance.y0 + 20).toFixed(1)}" fill="url(#pared-${alcance.id})" opacity="0.55"/>` }); break;
      case 'barra_fija': {
        const c = suma(P('manos'), [0, -1.5]);
        piezas.push({ capa: 'atras', svg: () => linea([c[0], c[1]], [c[0], alcance.y0 - 20], 1.6, C.metalOscuro) + linea([c[0] - 30, alcance.y0 - 6], [c[0] + 30, alcance.y0 - 6], 3, C.metalOscuro) });
        piezas.push({ capa: 'delante', svg: () => circ(c, 2.8, C.metal) });
        break;
      }
      case 'paralelas': {
        const c = suma(P('manos'), [0, 1.5]);
        piezas.push({ capa: 'atras', svg: () => linea([c[0] - 26, c[1]], [c[0] + 26, c[1]], 3.2) + linea([c[0] - 20, c[1]], [c[0] - 20, 0], 2.4, C.metalOscuro) + linea([c[0] + 20, c[1]], [c[0] + 20, 0], 2.4, C.metalOscuro) });
        break;
      }
      case 'mesa': {
        const c = P('manos'), y = c[1] - 3.2;
        piezas.push({ capa: 'delante', svg: () => rect(c[0] - 62, y - 4.5, 72, 4.5, 1, C.madera) + linea([c[0] + 4, y], [c[0] + 4, 0], 2.6, C.madera) + linea([c[0] - 56, y], [c[0] - 56, 0], 2.6, C.madera) });
        break;
      }
      case 'saco': {
        const x = P('manos')[0] + (m.dx ?? 30);
        piezas.push({ capa: 'atras', svg: () => linea([x + 13, alcance.y0 - 20], [x + 13, -158], 1.2, C.metalOscuro) + rect(x, -158, 26, 92, 8, C.saco) + `<line x1="${x + 3}" y1="-140" x2="${x + 23}" y2="-140" stroke="#000" stroke-opacity="0.3"/><line x1="${x + 3}" y1="-84" x2="${x + 23}" y2="-84" stroke="#000" stroke-opacity="0.3"/>` });
        break;
      }
      case 'obstaculo': {
        const x = P('cadera')[0] + (m.dx ?? 30), h = m.alto || 30;
        piezas.push({ capa: 'atras', svg: () => linea([x - 2, -h], [x + 2, -h], 3.4) + linea([x, -h], [x, 0], 2.2, C.metalOscuro) + rect(x - 8, -2.4, 16, 2.4, 1, C.metalOscuro) });
        break;
      }
      case 'conos': for (const dx of m.dx || [-55, 55]) {
        const x = P('cadera')[0] + dx;
        piezas.push({ capa: 'atras', svg: () => `<path d="M${(x - 5).toFixed(1)},0L${x.toFixed(1)},-13L${(x + 5).toFixed(1)},0Z" fill="#ff6a13" stroke="${C.borde}" stroke-width="0.8"/><line x1="${(x - 2.6).toFixed(1)}" y1="-6.5" x2="${(x + 2.6).toFixed(1)}" y2="-6.5" stroke="#fff" stroke-width="1.4" opacity="0.8"/>` });
      } break;
      case 'linea': piezas.push({ capa: 'atras', svg: () => `<line x1="${(alcance.x0 + 6).toFixed(1)}" y1="0.8" x2="${(alcance.x0 + alcance.ancho - 6).toFixed(1)}" y2="0.8" stroke="#ff9a3c" stroke-width="1.6" stroke-dasharray="7 4" opacity="0.8"/>` }); break;
      case 'escalera': {
        const x0 = P('cadera')[0] - 60;
        piezas.push({ capa: 'atras', svg: () => Array.from({ length: 7 }, (_, i) => `<line x1="${(x0 + i * 20).toFixed(1)}" y1="0" x2="${(x0 + i * 20 + 6).toFixed(1)}" y2="2.2" stroke="#ffc23d" stroke-width="1.6" opacity="0.85"/>`).join('') + `<line x1="${x0.toFixed(1)}" y1="2.4" x2="${(x0 + 126).toFixed(1)}" y2="2.4" stroke="#ffc23d" stroke-width="1" opacity="0.6"/>` });
        break;
      }
      case 'marcas': for (const kk of m.poses || [0, K.length - 1]) {
        const x = punto(K[kk], 'pies')[0] + 4;
        piezas.push({ capa: 'atras', svg: () => `<rect x="${(x - 12).toFixed(1)}" y="0" width="24" height="2.4" fill="#ffc23d" opacity="0.85"/>` });
      } break;
      case 'bordillo': {
        const ids = ['pie'];
        const y = parteBaja(k, ids);
        piezas.push({ capa: 'atras', svg: () => rect(alcance.x0 + 4, y, alcance.ancho - 8, -y, 1.5, '#3a3c41') });
        break;
      }
      case 'colchoneta': piezas.push({ capa: 'atras', svg: () => rect(alcance.cx0 - 8, -2.6, alcance.cx1 - alcance.cx0 + 16, 2.6, 1.3, '#2d3b4a') }); break;
      case 'asiento': {
        const y = parteBaja(k, ['tronco']), x = J.cadera[0];
        const resp = m.respaldo;   // ángulo del respaldo (como el tronco)
        piezas.push({ capa: 'atras', svg: () => {
          let s = rect(x - 16, y, 30, 5, 2, '#34373e') + linea([x - 2, y + 5], [x - 2, 0], 3) + linea([x - 14, 0], [x + 12, 0], 3);
          if (resp != null) { const a = antTronco(resp), base = suma([x, y], por(a, -15)); const top = suma(base, por(dir(resp), 52)); s += `<line x1="${base[0].toFixed(1)}" y1="${base[1].toFixed(1)}" x2="${top[0].toFixed(1)}" y2="${top[1].toFixed(1)}" stroke="#34373e" stroke-width="7" stroke-linecap="round"/>` + linea(base, [base[0] - 4, 0], 2.4, C.metalOscuro); }
          return s;
        } });
        break;
      }
      case 'bici': {
        const y = parteBaja(k, ['tronco']), xs0 = J.cadera[0] - 2;
        const cen = medio(punto(K[0], 'pieC'), punto(K[Math.min(2, K.length - 1)], 'pieC'));   // eje de los pedales
        const man = P('manos');
        const rueda = [cen[0] + 30, cen[1] + 2], codoM = [man[0] + 2, man[1] + 14];   // volante delantero y soporte del manillar
        piezas.push({ capa: 'atras', svg: () =>
          linea([cen[0] - 38, -1.5], [rueda[0] + 18, -1.5], 4, C.metalOscuro) + linea([cen[0] - 30, -1.5], cen, 3.4, C.metalOscuro)
          + circ(rueda, 13, '#1b1d22') + `<circle cx="${rueda[0].toFixed(1)}" cy="${rueda[1].toFixed(1)}" r="9" fill="none" stroke="${C.aro}" stroke-width="0.6" opacity="0.5"/>` + circ(rueda, 2.6, C.aro)
          + linea(rueda, [rueda[0], -1.5], 3.4, C.metalOscuro) + linea([xs0, y + 3], cen, 3.4) + linea(cen, rueda, 3)
          + linea(rueda, codoM, 3.2) + linea(codoM, man, 2.8) + rect(xs0 - 10, y - 1.5, 20, 4, 2, '#202226') });
        piezas.push({ capa: 'lejos', svg: ({ J: Jc }) => linea(cen, punto(Jc, 'pieL'), 1.8, C.metalOscuro) });
        piezas.push({ capa: 'delante', svg: ({ J: Jc }) => linea(cen, punto(Jc, 'pieC'), 2, C.metal) });
        break;
      }
      case 'caminadora': {
        const x = P('cadera')[0];
        piezas.push({ capa: 'atras', svg: () => rect(x - 62, -4, 118, 4, 2, '#24262b') + `<line x1="${(x - 58).toFixed(1)}" y1="-2" x2="${(x + 52).toFixed(1)}" y2="-2" stroke="#3a3d44" stroke-width="0.8" stroke-dasharray="3 3"/>` + linea([x + 56, -2], [x + 46, -95], 3) + rect(x + 36, -101, 22, 7, 2, '#2c2f35') });
        break;
      }
      // ---- Material que se mueve con el cuerpo ----
      case 'mancuernas': case 'mancuerna':
        piezas.push({ capa: 'delante', svg: ({ J: Jc }) => Object.entries(Jc.brazos).filter(([s]) => m.tipo === 'mancuernas' || s === (m.lado || 'C')).map(([, b]) => mancuerna(punoDe(b))).join('') });
        break;
      case 'kettlebell': case 'kettlebells':
        piezas.push({ capa: 'delante', svg: ({ J: Jc }) => {
          const bs = Object.entries(Jc.brazos).filter(([s]) => m.tipo === 'kettlebells' || s === (m.lado || 'C'));
          if (m.dos) { const c = promedio(bs.map(([, b]) => punoDe(b))), b = bs[0][1]; return kettlebell(c, dir(angulo(b.medio, b.fin))); }
          return bs.map(([, b]) => kettlebell(punoDe(b), dir(angulo(b.medio, b.fin)))).join('');
        } });
        break;
      case 'goblet':
        piezas.push({ capa: 'delante', svg: ({ J: Jc }) => { const c = suma(promedio(Object.values(Jc.brazos).map(b => punoDe(b))), [2, 2]); return circ(c, 6.6, C.disco) + circ(c, 2.2, C.aro); } });
        break;
      case 'barra': {
        const r = m.radio || 15;
        piezas.push({ capa: m.capa || 'delante', svg: ({ J: Jc }) => {
          const c = m.en === 'espalda' ? Jc.tronco.mapa(0.95, -1.15) : promedio(Object.values(Jc.brazos).map(b => punoDe(b)));
          return disco(c, r);
        } });
        break;
      }
      case 'bolsas': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => Object.entries(Jc.brazos).filter(([s]) => !m.lado || s === m.lado).map(([, b]) => bolsa(punoDe(b))).join('') }); break;
      case 'mochila': piezas.push({ capa: m.capa || 'delante', svg: ({ J: Jc }) => {
        const mt = Jc.tronco.mapa, pts = [mt(0.42, -1.02), mt(0.9, -1.02), mt(0.92, -1.75), mt(0.62, -1.95), mt(0.4, -1.7)];
        return `<path d="${curva(pts)}" fill="#2f3a2b" stroke="${C.borde}" stroke-width="0.9"/>` + linea(mt(0.9, -0.6), mt(0.55, 0.9), 1.4, '#232a20');
      } }); break;
      case 'mochila_mano': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => { const c = promedio(Object.values(Jc.brazos).map(b => punoDe(b))); return `<path d="M${fmt(suma(c, [-7, 2]))}q-2,16 7,17q9,-1 7,-17z" fill="#2f3a2b" stroke="${C.borde}" stroke-width="0.9"/>`; } }); break;
      case 'palo': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => linea(Jc.tronco.mapa(-0.15, -1.25), Jc.tronco.mapa(1.32, -1.25), 2, '#b08a5a') }); break;
      case 'banda': case 'cable': {
        const desde = m.desde ? (typeof m.desde === 'string' ? null : suma(punto(K[m.desde.pose ?? 0], m.desde.punto || 'manos'), m.desde.d || [0, 0])) : null;
        piezas.push({ capa: m.capa || 'delante', movil: true, svg: ({ J: Jc }) => {
          const a = desde || punto(Jc, m.desde), b = punto(Jc, m.hasta || 'manos');
          const col = m.tipo === 'banda' ? C.banda : C.cuerda;
          return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col}" stroke-width="${m.tipo === 'banda' ? 2.2 : 1.1}" stroke-linecap="round" opacity="0.95"/>` + (m.tipo === 'cable' && desde ? circ(desde, 3.2, C.metalOscuro) : '');
        } });
        if (m.tipo === 'cable' && desde && m.columna !== false) piezas.push({ capa: 'atras', svg: () => linea([desde[0] + 4, desde[1]], [desde[0] + 4, 0], 4, C.metalOscuro) + rect(desde[0] - 2, -26, 12, 26, 1.5, '#2a2c31') });
        break;
      }
      case 'placa': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => {   // plataforma de la prensa, perpendicular a las piernas
        const q = Jc.piernas.C, eje = dir(angulo(q.medio, q.fin)), c = suma(q.fin, por(eje, 6)), e = por([eje[1], -eje[0]], 14);
        return linea(resta(c, e), suma(c, e), 5, '#3a3d44');
      } }); break;
      case 'manillas': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => { const c = punto(Jc, 'manos'), piv = suma(punto(K[0], 'hombros'), [-8, -40]); return linea(piv, c, 2.4, C.metalOscuro) + circ(c, 2.6) + circ(piv, 3, C.metalOscuro); } }); break;
      case 'peso_cinturon': piezas.push({ capa: 'delante', svg: ({ J: Jc }) => { const c = Jc.tronco.mapa(-0.3, 0.2); return linea(Jc.tronco.mapa(0, 0.9), c, 1.2, C.cuerda) + kettlebell(c, [0, 1]); } }); break;
      case 'cuerda': piezas.push({ capa: 'delante', svg: ({ J: Jc, p }) => {
        const bs = Object.values(Jc.brazos), a = punoDe(bs[0]), b = punoDe(bs[1]);
        const arriba = suma(Jc.cabeza, [0, -34]), abajo = [Jc.cadera[0], 1.5];
        // Vista de lado: la cuerda forma un lazo alrededor del cuerpo (por delante y por detrás)
        const f = p.cuerda ?? 0, ext = [lerp(arriba[0], abajo[0], f), lerp(arriba[1], abajo[1], f)];
        const d = `M${fmt(a)}C${fmt([a[0] + 30, a[1]])} ${fmt([ext[0] + 26, ext[1]])} ${fmt(ext)}C${fmt([ext[0] - 26, ext[1]])} ${fmt([b[0] - 30, b[1]])} ${fmt(b)}`;
        return `<path d="${d}" fill="none" stroke="${C.cuerda}" stroke-width="1.2" opacity="0.9"/>`;
      } }); break;
      default: break;
    }
  }
  return piezas;
}

// ---------- Dibujo ----------
let contador = 0;
// Cada músculo es un relieve: luz arriba a la izquierda y sombra en el borde (aspecto 3D)
const ESTILO = {
  principal: (id) => `fill="url(#m1-${id})" filter="url(#brillo-${id})"`,
  secundario: (id) => `fill="url(#m2-${id})"`,
  neutro: (id) => `fill="url(#mn-${id})"`,
};
const FIBRA = { principal: 'rgba(255,240,215,0.5)', secundario: 'rgba(255,235,200,0.35)', neutro: 'rgba(40,18,8,0.28)' };
const relieve = (id, claro, medio, oscuro) => `<radialGradient id="${id}" cx="0.4" cy="0.36" r="0.72"><stop offset="0" style="stop-color:${claro}"/><stop offset="0.55" style="stop-color:${medio}"/><stop offset="1" style="stop-color:${oscuro}"/></radialGradient>`;

function crearSVG(spec, nombre, musc, estatica = false) {
  const id = ++contador;
  const sc = escena(spec);
  const tl = lineaTiempo(spec);
  // Encuadre: reúne los puntos de las posturas (y de la animación, si se mueve)
  const pts = [];
  const muestras = estatica ? [] : Array.from({ length: 25 }, (_, i) => tl.en(tl.total * i / 24));
  for (const J of [...sc.claves, ...muestras.map(({ de, a, f }) => sc.pose(mezclar(spec.poses[de], spec.poses[a], f)))]) {
    for (const p of geometria(J, false)) pts.push(...p.contorno);
  }
  const xsC = pts.map(p => p[0]), ysC = pts.map(p => p[1]);
  const cx0 = Math.min(...xsC), cx1 = Math.max(...xsC);
  let x0 = cx0 - 5, x1 = cx1 + 5, y0 = Math.min(...ysC) - 5, y1 = Math.max(0, ...ysC) + 5;
  const extra = spec.encuadre || {};
  x0 -= extra.izq || 0; x1 += extra.der || 0; y0 -= extra.arriba || 0;
  // Proporción 4:3 y tamaño mínimo para que todas las figuras se vean a escala parecida
  let w = Math.max(x1 - x0, 110), h = Math.max(y1 - y0, 82);   // la figura llena su cuadro
  if (w / h < 4 / 3) w = h * 4 / 3; else h = w * 3 / 4;
  const cxm = (x0 + x1) / 2;
  x0 = cxm - w / 2; y0 = y1 - h;
  const alcance = { id, x0, y0, ancho: w, cx0, cx1 };
  const piezas = material(spec, sc, alcance);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', nombre);
  svg.classList.add('figura-svg');
  const suelo = spec.suelo !== false;
  svg.innerHTML = `<defs>
      ${relieve(`piel-${id}`, 'var(--fig-piel-luz)', 'var(--fig-piel)', 'var(--fig-piel-sombra)')}
      ${relieve(`mn-${id}`, 'var(--fig-piel-luz)', 'var(--fig-piel)', 'var(--fig-piel-sombra)')}
      ${relieve(`m1-${id}`, 'var(--fig-m1b)', 'var(--fig-m1)', 'var(--fig-m1c)')}
      ${relieve(`m2-${id}`, 'var(--fig-m2-luz)', 'var(--fig-m2)', 'var(--fig-piel-sombra)')}
      <linearGradient id="pelo-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--fig-pelo-luz)"/><stop offset="1" style="stop-color:var(--fig-pelo)"/></linearGradient>
      <linearGradient id="piso-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="sombra-${id}"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <pattern id="pared-${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#1d1f24"/><line x1="0" y1="0" x2="0" y2="8" stroke="#2c2f35" stroke-width="2"/></pattern>
      <filter id="brillo-${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${suelo ? `<ellipse class="f-sombra" cx="0" cy="0.5" rx="34" ry="4" fill="url(#sombra-${id})"/><line x1="${x0.toFixed(1)}" y1="0" x2="${(x0 + w).toFixed(1)}" y2="0" stroke="url(#piso-${id})" stroke-width="1"/>` : ''}
    <g class="f-atras"></g><g class="f-fantasma"></g><g class="f-lejos-mat"></g><g class="f-cuerpo"></g>
    ${fotoCara ? `<clipPath id="cara-${id}"><circle class="f-cara-clip"/></clipPath><g class="f-cara"><circle class="f-cara-borde" fill="none" stroke="var(--fig-borde)" stroke-width="0.9"/><image class="f-cara-foto" href="${fotoCara}" clip-path="url(#cara-${id})" preserveAspectRatio="xMidYMid slice"/></g>` : ''}
    <g class="f-delante"></g>`;
  const capas = { atras: svg.querySelector('.f-atras'), lejosMat: svg.querySelector('.f-lejos-mat'), delante: svg.querySelector('.f-delante') };
  const gCuerpo = svg.querySelector('.f-cuerpo');
  const cara = fotoCara ? { clip: svg.querySelector('.f-cara-clip'), borde: svg.querySelector('.f-cara-borde'), foto: svg.querySelector('.f-cara-foto') } : null;
  const sombra = svg.querySelector('.f-sombra');
  // Material fijo: se dibuja una vez
  // Lo fijo se dibuja una vez; lo que se mueve con el cuerpo (mancuernas, bandas…) en cada cuadro
  const fija = x => x.capa === 'atras' && !x.movil;
  capas.atras.innerHTML = piezas.filter(fija).map(x => x.svg({})).join('');
  const dinamicas = piezas.filter(x => !fija(x));
  // Elementos del cuerpo: se crean una vez y se actualizan en cada cuadro
  const tipoM = g => !g ? 'neutro' : musc.principal.includes(g) ? 'principal' : musc.secundario.includes(g) ? 'secundario' : 'neutro';
  let nodos = null;
  function construir(partes) {
    gCuerpo.innerHTML = partes.map(p => `<g class="f-parte${p.capa === 'lejos' ? ' lejos' : ''}">
        <path class="f-contorno" fill="url(#${p.pelo ? 'pelo' : 'piel'}-${id})" stroke="var(--fig-borde)" stroke-width="0.9" stroke-linejoin="round"/>
        ${p.musculos.map(m => { const t = tipoM(m.g); return `<path class="f-musculo ${t}" ${ESTILO[t](id)} stroke="var(--fig-borde)" stroke-opacity="0.42" stroke-width="0.42"/>${m.fibras.map(() => `<path class="f-fibra ${t}" fill="none" stroke="${FIBRA[t]}" stroke-width="0.5"/>`).join('')}`; }).join('')}
      </g>`).join('');
    nodos = [...gCuerpo.querySelectorAll('.f-parte')].map(g => ({ contorno: g.querySelector('.f-contorno'), musculos: [...g.querySelectorAll('.f-musculo')], fibras: [...g.querySelectorAll('.f-fibra')] }));
  }
  function pintar(params) {
    const J = sc.pose(params);
    const partes = geometria(J);
    if (!nodos || nodos.length !== partes.length) construir(partes);
    partes.forEach((p, i) => {
      const n = nodos[i];
      n.contorno.setAttribute('d', curva(p.contorno));
      let f = 0;
      p.musculos.forEach((m, j) => { n.musculos[j]?.setAttribute('d', curva(m.pts)); for (const fb of m.fibras) n.fibras[f++]?.setAttribute('d', curva(fb, false)); });
    });
    if (sombra) { const c = J.cadera[0]; sombra.setAttribute('cx', c.toFixed(1)); }
    if (cara) {
      // La foto va sobre la cabeza: centro y tamaño a partir del contorno de la cabeza
      const cab = partes.find(x => x.id === 'cabeza')?.contorno || [];
      if (cab.length) {
        const cx = cab.reduce((t, q) => t + q[0], 0) / cab.length, cy = cab.reduce((t, q) => t + q[1], 0) / cab.length;
        const r = Math.max(...cab.map(q => Math.hypot(q[0] - cx, q[1] - cy))) * 0.86;
        for (const el of [cara.clip, cara.borde]) { el.setAttribute('cx', cx.toFixed(2)); el.setAttribute('cy', cy.toFixed(2)); el.setAttribute('r', r.toFixed(2)); }
        cara.foto.setAttribute('x', (cx - r).toFixed(2)); cara.foto.setAttribute('y', (cy - r).toFixed(2));
        cara.foto.setAttribute('width', (2 * r).toFixed(2)); cara.foto.setAttribute('height', (2 * r).toFixed(2));
      }
    }
    const ctx = { J, p: params };
    capas.lejosMat.innerHTML = dinamicas.filter(x => x.capa !== 'delante').map(x => x.svg(ctx)).join('');
    capas.delante.innerHTML = dinamicas.filter(x => x.capa === 'delante').map(x => x.svg(ctx)).join('');
  }
  function fantasma(params) {
    const partes = geometria(sc.pose(params), false);
    svg.querySelector('.f-fantasma').innerHTML = partes.map(p => `<path d="${curva(p.contorno)}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.8" stroke-dasharray="2.5 2"/>`).join('');
  }
  return { svg, tl, pintar, fantasma };
}

// ---------- Movimiento para el atleta 3D (ui/atleta3d.js) ----------
// Las mismas posturas, apoyos e IK que el dibujo: devuelve las articulaciones en cada instante.
export function movimiento(id) {
  const spec = POSES[id];
  if (!spec) return null;
  const sc = escena(spec), tl = lineaTiempo(spec);
  const params = (de, a, f) => mezclar(spec.poses[de], spec.poses[a], f);
  return {
    vista: sc.vista, spec, total: tl.total,
    en(seg) { const t = tl.en(seg); return { J: sc.pose(params(t.de, t.a, t.f)), ...t }; },
    postura(k) { return { J: sc.pose(spec.poses[k]), de: k, a: k, f: 0 }; },
    portada: spec.portada ?? (spec.poses.length > 1 ? 1 : 0),
  };
}

// ---------- API para las pantallas ----------
const activas = new Set();
let bucle = null;
const movimientoReducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function tic(ahora) {
  for (const a of activas) {
    if (!a.svg.isConnected) { activas.delete(a); a.obs?.disconnect(); continue; }
    if (!a.visible || document.hidden) continue;
    if (ahora - a.ultimo < a.intervalo) continue;
    // El tiempo avanza al ritmo elegido (al cambiarlo no hay saltos)
    a.t += Math.min(0.25, (ahora - (a.ultimo || ahora)) / 1000) * ritmoFigura();
    a.ultimo = ahora;
    const { de, a: b, f } = a.dib.tl.en(a.t);
    a.dib.pintar(mezclar(a.spec.poses[de], a.spec.poses[b], f));
    a.alVuelta?.(Math.floor(a.t / a.dib.tl.total));
    a.alFase?.(de, b);
  }
  bucle = activas.size ? requestAnimationFrame(tic) : null;
}

export const tieneIlustracion = id => !!POSES[id];

// Músculos a resaltar: los del ejercicio; en estiramientos y agilidad (sin músculos en la biblioteca), los de la postura
export function musculosDe(id) {
  const e = ejercicioPorId[id], spec = POSES[id] || {};
  const principal = e?.principal || [], secundario = (e?.secundarios || []).filter(g => !principal.includes(g));
  if (principal.length || secundario.length) return { principal, secundario, verbo: 'Trabaja' };
  if (spec.estira) return { principal: spec.estira, secundario: [], verbo: 'Estira' };
  return { principal: spec.activa || [], secundario: [], verbo: 'Trabaja' };
}

export function leyendaMusculos(id) {
  const m = musculosDe(id);
  const nombres = l => l.map(g => NOMBRES_GRUPO[g]).join(', ');
  if (!m.principal.length && !m.secundario.length) return '<figcaption class="ilus-leyenda"><span>Trabaja todo el cuerpo: coordinación y control</span></figcaption>';
  const sep = l => l.map(g => NOMBRES_GRUPO[g]).join(' · ');
  return `<figcaption class="ilus-leyenda">
    ${m.principal.length ? `<span class="ley-chip principal" title="${m.verbo}">${sep(m.principal)}</span>` : ''}
    ${m.secundario.length ? `<span class="ley-chip secundario" title="Ayudan">${sep(m.secundario)}</span>` : ''}
  </figcaption>`;
}

// HTML de la ilustración; después hay que llamar a montarIlustraciones(contenedor)
// mini: tamaño pequeño (listas); animar: también en movimiento cuando es pequeña
// contar: repeticiones de la serie (la figura las cuenta al ritmo elegido y avisa con el evento "repeticion")
// regalo: después de la meta, la figura hace una repetición más "de regalo"
export function htmlIlustracion(id, { leyenda = true, mini = false, animar = false, contar = 0, regalo = false } = {}) {
  if (!POSES[id]) return '';
  return `<figure class="ilustracion${mini ? ' mini' : ''}" data-ilustracion="${id}"${mini ? ' data-mini="1"' : ''}${animar ? ' data-animar="1"' : ''}${contar ? ` data-contar="${contar}"` : ''}${regalo ? ' data-regalo="1"' : ''}>
    <div class="ilus-lienzo"></div>
    ${mini ? '' : `<div class="ilus-controles">
      <span class="ilus-palabra" aria-hidden="true"></span>
      ${contar ? `<span class="ilus-cuenta" style="--prog:0"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ic-pista" cx="22" cy="22" r="19"/><circle class="ic-prog" cx="22" cy="22" r="19" pathLength="100"/></svg><span class="ic-num"><b>0</b>/${contar}</span></span>` : ''}
    </div>
    <span class="ilus-ritmo" role="group" aria-label="Velocidad del movimiento"><button type="button" data-ritmo="-1" aria-label="Más lento">🐢</button><small class="ilus-ritmo-txt">${NOMBRE_RITMO[ritmo]}</small><button type="button" data-ritmo="1" aria-label="Más rápido">🐇</button></span>`}
    ${leyenda ? leyendaMusculos(id) : ''}
  </figure>`;
}

let vigiaMiniaturas = null;
export function montarIlustraciones(raiz) {
  raiz.querySelectorAll('[data-ilustracion]:not([data-montada])').forEach(fig => {
    fig.dataset.montada = '1';
    // Las miniaturas (listas largas) se dibujan solo cuando aparecen en pantalla
    if (fig.dataset.mini === '1' && 'IntersectionObserver' in window) {
      vigiaMiniaturas ||= new IntersectionObserver(ent => ent.forEach(x => { if (x.isIntersecting) { vigiaMiniaturas.unobserve(x.target); montar(x.target); } }), { rootMargin: '200px' });
      vigiaMiniaturas.observe(fig);
    } else montar(fig);
  });
}

function montar(fig) {
  const id = fig.dataset.ilustracion, spec = POSES[id], e = ejercicioPorId[id];
  if (!spec) return;
  const grande = fig.dataset.mini !== '1';
  if (grande) activarControles(fig);
  const musc = musculosDe(id);
  const etiqueta = `Ilustración: ${e?.nombre || id}.${musc.principal.length ? ` Músculos que trabaja: ${musc.principal.map(g => NOMBRES_GRUPO[g]).join(', ')}.` : ''}`;
  const estatica = (fig.dataset.mini === '1' && fig.dataset.animar !== '1') || fig.dataset.pose != null || movimientoReducido();
  const dib = crearSVG(spec, etiqueta, musc, estatica);
  fig.querySelector('.ilus-lienzo').appendChild(dib.svg);
  const portada = fig.dataset.pose != null ? Number(fig.dataset.pose) : spec.portada ?? (spec.poses.length > 1 ? 1 : 0);
  if (estatica) {
    // Sin animación: postura final y, en grande, la inicial marcada con línea discontinua
    if (fig.dataset.mini !== '1' && fig.dataset.pose == null && spec.poses.length > 1) dib.fantasma(spec.poses[0]);
    dib.pintar(spec.poses[portada]);
    // Con "reducir movimiento" la figura queda quieta, pero la cuenta sigue al mismo ritmo
    if (grande && fig.dataset.contar) {
      const tl = lineaTiempo(spec);
      let t = 0, previo = performance.now();
      const reloj = setInterval(() => {
        if (!fig.isConnected) return clearInterval(reloj);
        const ahora = performance.now(); t += (ahora - previo) / 1000 * ritmoFigura(); previo = ahora;
        fig._alVuelta?.(Math.floor(t / tl.total));
      }, 200);
    }
    return;
  }
  dib.pintar(spec.poses[0]);
  // Las pequeñas se mueven a ~15 cuadros por segundo (suficiente y más ligero en el teléfono)
  const a = { svg: dib.svg, dib, spec, t: 0, ultimo: 0, visible: true, intervalo: fig.dataset.mini === '1' ? 66 : 33, alVuelta: grande ? fig._alVuelta : null, alFase: grande ? fig._alFase : null };
  if ('IntersectionObserver' in window) {
    a.obs = new IntersectionObserver(ent => { a.visible = ent.some(x => x.isIntersecting); });
    a.obs.observe(fig);
  }
  activas.add(a);
  if (!bucle) bucle = requestAnimationFrame(tic);
  // En grande, la persona 3D realista sustituye al dibujo cuando termina de cargar
  if (grande && usar3D()) probar3D(fig, a);
}

// Contador de repeticiones y botones de ritmo de una figura grande
function activarControles(fig) {
  const meta = Number(fig.dataset.contar) || 0, n = fig.querySelector('.ilus-cuenta b');
  const tope = meta + (fig.dataset.regalo ? 1 : 0);
  let vista = 0;
  // Palabra de ritmo (BAJA / SUBE / AGUANTA) según hacia dónde va el cuerpo en cada tramo
  const spec = POSES[fig.dataset.ilustracion], sc = escena(spec), palabra = fig.querySelector('.ilus-palabra');
  const alto = spec.poses.map(ps => { const J = sc.pose(ps); return -(J.cabeza[1] + J.cadera[1]) / 2; });
  let ultimaPalabra = null;
  fig._alFase = (de, a) => {
    if (!palabra) return;
    const d = de === a ? 0 : alto[a] - alto[de];
    const txt = spec.poses.length === 1 ? 'AGUANTA' : d < -2 ? 'BAJA' : d > 2 ? 'SUBE' : de === a ? (ultimaPalabra || '') : 'VUELVE';
    if (txt !== ultimaPalabra) { palabra.textContent = txt; ultimaPalabra = txt; }
  };
  fig._alVuelta = vuelta => {
    if (vuelta <= vista) return;
    vista = vuelta;
    if (meta && n && vuelta <= tope) {
      n.textContent = vuelta > meta ? `${meta}+1` : vuelta;
      fig.querySelector('.ilus-cuenta').style.setProperty('--prog', Math.min(100, Math.round(vuelta / meta * 100)));
      fig.classList.toggle('cuenta-lista', vuelta >= meta);
      fig.classList.toggle('cuenta-regalo', vuelta > meta);
      n.parentElement.classList.remove('pop'); void n.offsetWidth; n.parentElement.classList.add('pop');
    }
    if (!meta || vuelta <= tope) fig.dispatchEvent(new CustomEvent('repeticion', { bubbles: true, detail: { n: vuelta, meta } }));
  };
  const marcarRitmo = () => {
    const t = fig.querySelector('.ilus-ritmo-txt'); if (t) t.textContent = NOMBRE_RITMO[ritmo];
    fig.querySelectorAll('[data-ritmo]').forEach(b => { b.disabled = ritmo === (Number(b.dataset.ritmo) < 0 ? RITMOS[0] : RITMOS[RITMOS.length - 1]); });
  };
  marcarRitmo();
  fig.querySelectorAll('[data-ritmo]').forEach(b => b.onclick = () => {
    const r = cambiarRitmo(Number(b.dataset.ritmo));
    marcarRitmo();
    fig.dispatchEvent(new CustomEvent('ritmo', { bubbles: true, detail: { ritmo: r } }));
  });
}

async function probar3D(fig, anim) {
  let m;
  try { m = await import('./atleta3d.js'); } catch { return; }
  if (!fig.isConnected || !m.hay3D()) return;
  const caja = document.createElement('div');
  caja.className = 'ilus-3d';
  fig.querySelector('.ilus-lienzo').appendChild(caja);
  // El 3D sigue contando donde iba el dibujo
  let base = null;
  const a3 = m.montarAtleta3D(caja, fig.dataset.ilustracion, { foto: fotoCara, velocidad: ritmoFigura, alRepeticion: v => { if (base != null) fig._alVuelta?.(base + v); },
    alFase: (de, a) => { if (base != null) fig._alFase?.(de, a); } });
  if (!a3) { caja.remove(); return; }
  const vigilar = () => {
    if (!fig.isConnected) return;
    if (!a3.listo()) return setTimeout(vigilar, 150);
    if (a3.info().error) { a3.destruir(); caja.remove(); return; }
    anim.alVuelta = null; anim.alFase = null;   // ahora cuenta el 3D, siguiendo donde iba el dibujo
    anim.obs?.disconnect();
    base = Math.floor(anim.t / anim.dib.tl.total) - a3.vuelta();
    activas.delete(anim);
    fig.classList.add('con-3d');
  };
  vigilar();
}
