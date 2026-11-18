// FASE 4 — SEGUIMIENTO DEL DÍA: entender lo que se escribe en la libreta ("una pizza y una cocacola"),
// contar frutas, café (cafeína), azúcar añadida, alcohol y vitaminas, y calcular rachas y logros.
// Todo es orientativo: se estima con valores aproximados por unidad típica.

import { COMUNES, AZUCAR_CUCHARADITA, CAFEINA_REFERENCIA, FRUTAS_REFERENCIA, AZUCAR_REFERENCIA } from '../datos/comunes.js';
import { ALIMENTOS, alimentoPorId, porcionBase } from '../datos/alimentos.js';
import { aMinutos } from './nutricion.js';
import { sumarDias } from './calculos.js';

export const normal = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/(\d)[.,](\d)/g, '$1·$2')   // protege los decimales (1,5 o 1.5): "1,5 tazas" es taza y media, no 5
  .replace(/[^a-z0-9ñ·\s-]/g, ' ').replace(/·/g, '.').replace(/\s+/g, ' ').trim();

// Frutas del catálogo del plan como si fueran "comunes" (para reconocer "un guineo", "una china"…)
const SINONIMOS_FRUTA = { naranja: ['naranja', 'naranjas', 'china', 'chinas'], lechosa: ['lechosa', 'papaya'], sandia: ['sandia', 'patilla'], guineo: ['guineo', 'guineos', 'banana', 'banano', 'platano maduro crudo'] };
const FRUTAS_PLAN = ALIMENTOS.filter(a => a.cat === 'fruta').map(a => {
  const g = a.unidad?.g || porcionBase(a);
  return { id: `al_${a.id}`, alimentoId: a.id, nombre: a.nombre, icono: '🍎', cat: 'fruta', unidad: a.unidad?.n || 'porción', defecto: 1,
    kcal: Math.round((a.kcal * g) / 100), p: Math.round((a.p * g) / 100), c: Math.round((a.c * g) / 100), g: 0, azucar: 0, cafeina: 0,
    claves: SINONIMOS_FRUTA[a.id] || [normal(a.corto), `${normal(a.corto)}s`], porUnidad: [] };
});
const CATALOGO = [...COMUNES, ...FRUTAS_PLAN];
export const porIdComun = id => CATALOGO.find(x => x.id === id);
const CLAVES = CATALOGO.flatMap(item => item.claves.map(k => ({ k: normal(k), item }))).sort((a, b) => b.k.length - a.k.length);

const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, media: 0.5, medio: 0.5 };
const numeroDe = t => (/^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : NUMEROS[t]);

// "una pizza y una cocacola" → [{ id: 'pizza', cantidad: 2, ... }, { id: 'cola', cantidad: 1, ... }]
export function entenderTexto(texto) {
  const t = ` ${normal(texto)} `;
  const usados = [];
  const encontrados = [];
  for (const { k, item } of CLAVES) {
    // El espacio de delante entra en la coincidencia (iPhone con iOS 15 no entiende "(?<=…)"); el de detrás no se consume.
    const re = new RegExp(`\\s${k.replace(/[-]/g, '\\-')}(?=\\s)`, 'g');
    let m;
    while ((m = re.exec(t))) {
      const ini = m.index + 1, fin = ini + k.length;
      if (usados.some(([a, b]) => ini < b && fin > a)) continue;
      usados.push([ini, fin]);
      encontrados.push({ item, ini, fin });
    }
  }
  encontrados.sort((a, b) => a.ini - b.ini);
  // "jugo de chinola": dos palabras del mismo producto muy juntas cuentan una sola vez
  const unicos = encontrados.filter((e, i) => {
    const prev = encontrados[i - 1];
    return !(prev && prev.item === e.item && t.slice(prev.fin, e.ini).trim().split(' ').filter(Boolean).length <= 2);
  });
  return unicos.map(({ item, ini, fin }) => {
    const antes = t.slice(0, ini).trim().split(' ').slice(-3);
    const despues = t.slice(fin).trim().split(' ').slice(0, 3);
    let cantidad = item.defecto;
    let num = null, conUnidad = false;
    for (let i = antes.length - 1; i >= 0; i--) {
      const n = numeroDe(antes[i]);
      if (n != null) { num = n; conUnidad = antes.slice(i + 1).some(w => item.porUnidad.includes(w)); break; }
    }
    if (num != null) cantidad = conUnidad || item.defecto === 1 ? num : item.defecto * num;
    if (despues.some(w => ['entera', 'entero', 'completa', 'completo'].includes(w)) && item.entera) cantidad = item.entera * (num || 1);
    if (despues.some(w => ['grande', 'litro', 'jumbo', 'grandes'].includes(w)) && item.grande) cantidad = Math.round(cantidad * item.grande * 10) / 10;
    const sinAzucar = /\bsin azucar\b|\bamargo\b|\bsin dulce\b/.test(t.slice(ini, Math.min(t.length, fin + 20)));
    return { id: item.id, cantidad, conAzucar: !!item.conAzucar && !sinAzucar };
  });
}

// Valores de una línea { id, cantidad, conAzucar }
export function valoresLinea(l) {
  const item = porIdComun(l.id);
  if (!item) return null;
  const q = l.cantidad;
  const azucarExtra = l.conAzucar ? 2 * AZUCAR_CUCHARADITA * q : 0;   // 2 cucharaditas por taza
  return {
    ...l, nombre: item.nombre, icono: item.icono, cat: item.cat, unidad: item.unidad, alimentoId: item.alimentoId || null,
    kcal: Math.round(item.kcal * q + azucarExtra * 4), p: Math.round(item.p * q), c: Math.round(item.c * q + azucarExtra), g: Math.round(item.g * q),
    azucar: Math.round(item.azucar * q + azucarExtra), cafeina: Math.round(item.cafeina * q), consejo: item.consejo || null,
  };
}

export function totalesLineas(lineas) {
  const v = lineas.map(valoresLinea).filter(Boolean);
  return v.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, g: a.g + x.g, azucar: a.azucar + x.azucar, cafeina: a.cafeina + x.cafeina }),
    { kcal: 0, p: 0, c: 0, g: 0, azucar: 0, cafeina: 0 });
}

// ---------- Contadores del día ----------
const PORCION_FRUTA = 120;   // g de una porción de fruta
const COMIDO = { completada: 1, mitad: 0.5, diferente: 0 };

// comidas: las del día (plan + libreta) · tomas: registros de vitaminas/suplementos del día
export function contadoresDia({ comidas = [], suplementos = [], tomas = [], horaDormir = '22:30', medico = {} }) {
  let frutas = 0, azucar = 0, cafeina = 0, tazas = 0, alcohol = 0, refrescos = 0;
  let ultimoCafe = null;
  for (const c of comidas) {
    if (c.tipo !== 'extra') {
      const f = COMIDO[c.estado] || 0;
      for (const it of c.items || []) if (alimentoPorId[it.alimentoId]?.cat === 'fruta') frutas += (it.g / PORCION_FRUTA) * f;
      continue;
    }
    for (const l of c.registro?.lineas || []) {
      const v = valoresLinea(l); if (!v) continue;
      if (v.cat === 'fruta') frutas += l.cantidad;
      if (v.cat === 'cafe' || v.cafeina) { if (v.cat === 'cafe') tazas += l.cantidad; cafeina += v.cafeina; const h = c.registro?.horaComida || c.hora; if (v.cat === 'cafe' && (!ultimoCafe || h > ultimoCafe)) ultimoCafe = h; }
      if (v.cat === 'alcohol') alcohol += l.cantidad;
      if (v.cat === 'bebida' && v.azucar > 0) refrescos += l.cantidad;
      azucar += v.azucar;
    }
  }
  const limiteCafeina = medico.embarazo ? CAFEINA_REFERENCIA.embarazo : CAFEINA_REFERENCIA.maximo;
  const minDormir = aMinutos(horaDormir) < 720 ? aMinutos(horaDormir) + 1440 : aMinutos(horaDormir);
  const cafeTarde = ultimoCafe != null && minDormir - aMinutos(ultimoCafe) < 360;
  const tomadas = new Set(tomas.map(t => t.supplementId));
  return {
    frutas: { porciones: Math.round(frutas * 10) / 10, meta: FRUTAS_REFERENCIA },
    cafe: { tazas: Math.round(tazas * 10) / 10, cafeina, limite: limiteCafeina, ultimo: ultimoCafe, tarde: cafeTarde, pasado: cafeina > limiteCafeina },
    azucar: { g: azucar, cucharaditas: Math.round(azucar / AZUCAR_CUCHARADITA), ref: AZUCAR_REFERENCIA },
    alcohol, refrescos,
    suplementos: { tomados: suplementos.filter(s => tomadas.has(s.id)).length, total: suplementos.length, lista: suplementos.map(s => ({ ...s, tomado: tomadas.has(s.id) })) },
  };
}

// Mensajes del día (educan, no regañan)
export function mensajesDia(ct, { cardio = false } = {}) {
  const m = [];
  if (ct.cafe.pasado) m.push(`☕ Llevas unos ${ct.cafe.cafeina} mg de cafeína: por encima de la referencia de ${ct.cafe.limite} mg. Si quieres bajar, quita una taza cada pocos días.`);
  else if (ct.cafe.tarde) m.push(`☕ Tu último café fue a las ${ct.cafe.ultimo}, a menos de 6 horas de tu hora de dormir: puede afectar tu sueño.`);
  if (cardio && ct.cafe.cafeina > 200) m.push('☕ Con presión alta o problemas del corazón, consulta con tu médico cuánto café te conviene.');
  if (ct.azucar.g > ct.azucar.ref.maximo) m.push(`🍬 Azúcar añadida estimada: unas ${ct.azucar.cucharaditas} cucharaditas (la referencia es menos de ${ct.azucar.ref.maximo / AZUCAR_CUCHARADITA}). Las bebidas son el lugar más fácil para recortar.`);
  if (ct.refrescos >= 2) m.push('🥤 Hoy van varios refrescos o jugos: prueba cambiar el próximo por agua fría con limón.');
  if (ct.frutas.porciones < ct.frutas.meta.min) m.push(`🍎 Llevas ${ct.frutas.porciones} porciones de fruta: la referencia es ${ct.frutas.meta.min}–${ct.frutas.meta.max} al día.`);
  if (ct.alcohol >= 3) m.push('🍺 El alcohol de hoy puede afectar tu sueño y tu recuperación: acompáñalo con agua y comida.');
  return m;
}

// ---------- Rachas y logros ----------
// dias: { 'AAAA-MM-DD': { anotado: bool, completo: bool, aguaOk: bool, frutasOk: bool, cafeOk: bool, sinRefresco: bool } }
export function racha(dias, fecha, campo = 'anotado') {
  let n = 0, d = dias[fecha]?.[campo] ? fecha : sumarDias(fecha, -1);   // hoy aún puede completarse
  while (dias[d]?.[campo]) { n++; d = sumarDias(d, -1); }
  return n;
}

export function logros(dias, fecha) {
  const total = campo => Object.values(dias).filter(x => x[campo]).length;
  const r = racha(dias, fecha);
  const lista = [
    { id: 'primer', icono: '📒', nombre: 'Primera anotación', logrado: total('anotado') >= 1 },
    { id: 'racha3', icono: '🔥', nombre: '3 días seguidos anotando', logrado: r >= 3 || total('racha3') > 0 },
    { id: 'racha7', icono: '🏅', nombre: '7 días seguidos anotando', logrado: r >= 7 },
    { id: 'completo', icono: '✅', nombre: 'Un día con todas las comidas anotadas', logrado: total('completo') >= 1 },
    { id: 'agua3', icono: '💧', nombre: 'Meta de agua 3 días', logrado: total('aguaOk') >= 3 },
    { id: 'agua7', icono: '🌊', nombre: 'Meta de agua 7 días', logrado: total('aguaOk') >= 7 },
    { id: 'frutas5', icono: '🍎', nombre: 'Frutas del día, 5 días', logrado: total('frutasOk') >= 5 },
    { id: 'cafe7', icono: '☕', nombre: 'Café dentro de lo recomendado, 7 días', logrado: total('cafeOk') >= 7 },
    { id: 'sinrefresco7', icono: '🚰', nombre: '7 días sin refrescos ni jugos azucarados', logrado: racha(dias, fecha, 'sinRefresco') >= 7 },
  ];
  return { racha: r, lista, logrados: lista.filter(l => l.logrado).length };
}

// ---------- ❤️ Libreta de gustos: alimentos del catálogo que aparecen en un texto libre ----------
const ALIAS = {
  pollo: 'pollo_guisado', pechuga: 'pollo', muslo: 'muslo_pollo', higado: 'higado_pollo', carne: 'res', res: 'res', picadillo: 'res_molida',
  pescado: 'pescado', sardina: 'sardinas', atun: 'atun', huevo: 'huevo', queso: 'queso_fresco', yogur: 'yogur', leche: 'leche',
  habichuela: 'habichuelas_rojas', habichuelas: 'habichuelas_rojas', frijoles: 'habichuelas_rojas', guandules: 'gandules', gandules: 'gandules', lentejas: 'lentejas', garbanzos: 'garbanzos',
  arroz: 'arroz', moro: 'gandules', espagueti: 'espagueti', espaguetis: 'espagueti', pasta: 'espagueti', avena: 'avena', harina: 'harina_maiz', pan: 'pan_agua', casabe: 'casabe',
  mangu: 'platano_verde', platano: 'platano_verde', platanos: 'platano_verde', maduro: 'platano_maduro', guineito: 'guineo_verde', guineitos: 'guineo_verde',
  yuca: 'yuca', batata: 'batata', yautia: 'yautia', name: 'name', papa: 'papa', papas: 'papa', mazorca: 'mazorca', maiz: 'mazorca',
  repollo: 'repollo', zanahoria: 'zanahoria', tomate: 'tomate', lechuga: 'lechuga', pepino: 'pepino', aji: 'aji', cebolla: 'cebolla', auyama: 'auyama',
  vainitas: 'vainitas', molondrones: 'molondron', remolacha: 'remolacha', berenjena: 'berenjena', tayota: 'tayota', espinaca: 'espinaca', brocoli: 'brocoli',
  guineo: 'guineo', lechosa: 'lechosa', papaya: 'lechosa', mango: 'mango', naranja: 'naranja', china: 'naranja', pina: 'pina', chinola: 'chinola', guayaba: 'guayaba',
  cereza: 'cereza', cerezas: 'cereza', sandia: 'sandia', patilla: 'sandia', manzana: 'manzana', fresas: 'fresas', aguacate: 'aguacate', mani: 'mani',
  salami: 'salami', bacalao: 'bacalao', arenque: 'arenque', chivo: 'chivo', cerdo: 'cerdo', puerco: 'cerdo', camarones: 'camarones', salmon: 'salmon', tofu: 'tofu',
};
export function alimentosEnTexto(texto) {
  const palabras = normal(texto).split(' ');
  const ids = new Set();
  for (const w of palabras) if (ALIAS[w] && alimentoPorId[ALIAS[w]]) ids.add(ALIAS[w]);
  return [...ids];
}
