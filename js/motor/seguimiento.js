// FASE 4 — SEGUIMIENTO DEL DÍA: entender lo que se escribe en la libreta ("una pizza y una cocacola"),
// contar frutas, café (cafeína), azúcar añadida, alcohol y vitaminas, y calcular rachas y logros.
// Todo es orientativo: se estima con valores aproximados por unidad típica.

import { AZUCAR_CUCHARADITA, CAFEINA_REFERENCIA, FRUTAS_REFERENCIA, AZUCAR_REFERENCIA } from '../datos/comunes.js';
import { alimentoPorId } from '../datos/alimentos.js';
import { aMinutos } from './nutricion.js';
import { sumarDias } from './calculos.js';

// El lector de lo que se escribe ("2 huevos con pan", "media libra de pollo") vive en motor/lectorComida.js
import { normal, entenderTexto, valoresLinea, totalesLineas, porIdComun } from './lectorComida.js';
export { normal, entenderTexto, valoresLinea, totalesLineas, porIdComun };

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
      if (v.cat === 'fruta') frutas += v.gramos ? v.gramos / PORCION_FRUTA : l.cantidad;   // del menú: por peso; de la calle: por unidad
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
