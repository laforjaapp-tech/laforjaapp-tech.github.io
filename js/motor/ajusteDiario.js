// FASE 4 — AJUSTE DEL DÍA
// Si una comida del plan no se comió, se comió a medias, fue diferente o hubo algo extra en la libreta,
// se recalculan las porciones de las comidas que faltan para acercarse a la meta del día.
// Prioridad: la proteína. Con tope de seguridad: nunca una comida enorme "para compensar".

import { aMinutos, totales, redondearPorcion } from './nutricion.js';
import { alimentoPorId } from '../datos/alimentos.js';

export const COMIDO = ['completada', 'mitad', 'diferente'];
const PORCION = { ligera: 0.5, normal: 1, abundante: 1.5 };
// Anotación libre en la libreta sin datos exactos: estimación aproximada según la cantidad
const EXTRA = { ligera: { kcal: 200, p: 8 }, normal: { kcal: 400, p: 15 }, abundante: { kcal: 650, p: 25 } };
const TOPE = { subir: 1.35, bajar: 0.6, protMin: 0.8 };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const t0 = () => ({ kcal: 0, p: 0 });
const sumar = (a, t, f = 1) => { a.kcal += (t?.kcal || 0) * f; a.p += (t?.p || 0) * f; };

// Lo que se comió de una comida registrada (estimado)
export function consumidoDe(c) {
  const t = c.registro?.totalesComidos || c.totales;
  // Libreta: si se reconoció lo que comió (pizza, refresco…) se usan esos valores; si no, la cantidad indicada
  if (c.tipo === 'extra') return c.registro?.totales || EXTRA[c.registro?.porcion] || EXTRA.normal;
  if (c.estado === 'completada') return t;
  if (c.estado === 'mitad') return { kcal: (t?.kcal || 0) / 2, p: (t?.p || 0) / 2 };
  // Algo diferente: lo reconocido en el texto, o el plan multiplicado por la cantidad indicada
  if (c.estado === 'diferente') { if (c.registro?.totales) return c.registro.totales; const f = PORCION[c.registro?.porcion] || 1; return { kcal: (t?.kcal || 0) * f, p: (t?.p || 0) * f }; }
  return t0();
}

// comidas: las del día (con items). ahoraMin: minutos del día; null si no es hoy (no hay comidas "pasadas")
// limites: los de su nutrióloga (motor/nutricion.js aplicarIndicaciones); al agrandar una comida no se pasa de su tope de carbohidratos
export function ajustarDia(comidas, ahoraMin = null, limites = {}) {
  const plan = comidas.filter(c => c.tipo !== 'extra');
  const objetivo = t0(), consumido = t0(), restante = t0();
  const sinAnotar = [], futuras = [], mensajes = [];
  for (const c of plan) {
    sumar(objetivo, c.totales);
    if (c.estado !== 'planificada') { sumar(consumido, consumidoDe(c)); continue; }
    if (ahoraMin != null && aMinutos(c.hora) + 60 < ahoraMin) sinAnotar.push(c);
    else { futuras.push(c); sumar(restante, c.totales); }
  }
  const extras = comidas.filter(c => c.tipo === 'extra');
  extras.forEach(c => sumar(consumido, consumidoDe(c)));
  const base = { objetivo: redondo(objetivo), consumido: redondo(consumido), sinAnotar, ajustes: {}, mensajes, ajustado: false };
  if (!futuras.length || !restante.kcal) return base;

  const fK = lim((objetivo.kcal - consumido.kcal) / restante.kcal, TOPE.bajar, TOPE.subir);
  const fP = lim((objetivo.p - consumido.p) / Math.max(restante.p, 1), TOPE.protMin, TOPE.subir);
  if (Math.abs(fK - 1) < 0.08 && Math.abs(fP - 1) < 0.08) return base;

  for (const c of futuras) {
    const items = c.items.map(it => {
      const a = alimentoPorId[it.alimentoId];
      if (!a || a.cat === 'vegetal') return it;   // los vegetales se mantienen: fibra y saciedad
      const f = it.rol === 'proteina' ? fP : fK;
      const g = redondearPorcion(it.alimentoId, it.g * f);
      return g === it.g ? it : { ...it, g, gPlan: it.g };
    });
    // Con tope de carbohidratos por comida: si al agrandarla se pasa, lo que da carbohidratos se queda como estaba
    const tope = limites.carbosComida ? Math.max(limites.carbosComida, c.totales.c || 0) : Infinity;
    if (totales(items).c > tope) items.forEach((it, k) => { if (it.gPlan != null && it.rol !== 'proteina' && alimentoPorId[it.alimentoId].c > 5) items[k] = c.items[k]; });
    const tot = totales(items);
    if (items.some(i => i.gPlan != null)) base.ajustes[c.id] = { items, totales: tot, cambio: Math.round(((tot.kcal - c.totales.kcal) / c.totales.kcal) * 100) };
  }
  base.ajustado = Object.keys(base.ajustes).length > 0;

  const nombre = c => c.nombre.toLowerCase();
  plan.filter(c => c.estado === 'mitad').forEach(c => mensajes.push(`Comiste la mitad de: ${nombre(c)}.`));
  plan.filter(c => c.estado === 'no_realizada').forEach(c => mensajes.push(`No comiste: ${nombre(c)}.`));
  sinAnotar.forEach(c => mensajes.push(`Sin anotar: ${nombre(c)} (se cuenta como no comida; si la comiste, márcala y el ajuste se corrige).`));
  plan.filter(c => c.estado === 'diferente').forEach(c => mensajes.push(`Comiste algo diferente en lugar de: ${nombre(c)} (se estima por la cantidad que indicaste).`));
  if (extras.length) mensajes.push(`${extras.length} ${extras.length === 1 ? 'anotación' : 'anotaciones'} en tu libreta (estimación aproximada).`);
  mensajes.push(fK > 1 || fP > 1
    ? 'Por eso tus próximas comidas de hoy son un poco más grandes, sobre todo en proteína.'
    : 'Por eso tus próximas comidas de hoy son un poco más ligeras; la proteína se mantiene.');
  const faltaK = objetivo.kcal - consumido.kcal - restante.kcal * fK;
  if (fK === TOPE.subir && faltaK > 150) mensajes.push('No hace falta compensarlo todo hoy: comer mucho de golpe no ayuda. Mañana sigues con tu plan normal.');
  if (fK === TOPE.bajar && faltaK < -150) mensajes.push('Hoy ya comiste más de lo planificado: no pasa nada. No te saltes comidas para compensar; mañana sigues con tu plan normal.');
  return base;
}

const redondo = t => ({ kcal: Math.round(t.kcal), p: Math.round(t.p) });
