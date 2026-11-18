// UNIDADES: por dentro todo se guarda en kilos y centímetros (lo que usa el motor);
// en pantalla se muestra y se escribe en lo que la persona eligió. En RD lo normal es libras y pies.
// atleta.unidades = { peso: 'lb' | 'kg', estatura: 'pies' | 'cm' }

export const LB = 0.45359237;   // kg en una libra (exacto)
export const PULG = 2.54;       // cm en una pulgada (exacto)

export const POR_DEFECTO = { peso: 'lb', estatura: 'pies' };
export const unidadesDe = a => ({ ...POR_DEFECTO, ...(a?.unidades || {}) });

// Rangos aceptados (lo de fuera casi seguro es un error al escribir)
export const RANGO_PESO = { lb: [66, 660], kg: [30, 300] };
export const RANGO_CM = [120, 230];

const red = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// Acepta "92,5", "92.5" y espacios
export function leerNumero(texto) {
  if (texto == null || texto === '') return null;
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  const n = Number(String(texto).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const kgDe = (valor, unidad) => (valor == null ? null : unidad === 'lb' ? red(valor * LB, 2) : valor);
export const lbDe = kg => (kg == null ? null : kg / LB);
export const cmDe = (pies, pulg = 0) => red((pies * 12 + pulg) * PULG, 1);
export function piesPulgDe(cm) {
  if (!cm) return null;
  let total = Math.round(cm / PULG), pies = Math.floor(total / 12), pulg = total - pies * 12;
  return { pies, pulg };
}

// Peso en la unidad de la persona, como número (para un selector)
export const pesoEnUnidad = (kg, u) => (kg == null ? null : u === 'lb' ? Math.round(lbDe(kg)) : red(kg, 1));
// Carga de una pesa: en libras con medias (12,5 lb)
export const cargaEnUnidad = (kg, u) => (kg == null ? null : u === 'lb' ? Math.round(lbDe(kg) * 2) / 2 : red(kg, 1));

const numES = v => String(v).replace('.', ',');
export function fmtPeso(kg, a, { conOtra = false } = {}) {
  if (kg == null || kg === '') return '–';
  const u = unidadesDe(a).peso;
  const lb = `${numES(Math.round(lbDe(kg) * 2) / 2 % 1 ? Math.round(lbDe(kg) * 2) / 2 : Math.round(lbDe(kg)))} lb`, k = `${numES(red(kg, 1))} kg`;
  return u === 'lb' ? (conOtra ? `${lb} (${k})` : lb) : (conOtra ? `${k} (${lb})` : k);
}
// Diferencia de peso con signo (+3 lb / −1,5 kg)
export function fmtCambioPeso(kg, a) {
  if (kg == null) return '–';
  const u = unidadesDe(a).peso;
  const v = u === 'lb' ? Math.round(lbDe(kg)) : red(kg, 1);
  return `${v > 0 ? '+' : ''}${numES(v)} ${u}`;
}
export function fmtEstatura(cm, a, { conOtra = false } = {}) {
  if (!cm) return '–';
  const pp = piesPulgDe(cm), pies = `${pp.pies} pies ${pp.pulg} pulg`, c = `${Math.round(cm)} cm`;
  return unidadesDe(a).estatura === 'pies' ? (conOtra ? `${pies} (${c})` : pies) : (conOtra ? `${c} (${pies})` : c);
}
// Rango de peso de referencia (viene en kg) en la unidad de la persona
export function fmtRangoPeso(r, a) {
  if (!r) return '';
  if (unidadesDe(a).peso === 'lb') return `${Math.ceil(lbDe(r.minExacto ?? r.min))}–${Math.floor(lbDe(r.maxExacto ?? r.max))} lb`;
  return `${r.min}–${r.max} kg`;
}
// Medidas del cuerpo (cintura…): se guardan en cm; con pies se muestran en pulgadas
export const unidadMedida = a => (unidadesDe(a).estatura === 'pies' ? 'pulg' : 'cm');
export const cmDeMedida = (v, a) => (v == null ? null : unidadMedida(a) === 'pulg' ? red(v * PULG, 1) : v);
export const fmtMedida = (cm, a) => (!cm ? '–' : unidadMedida(a) === 'pulg' ? `${numES(red(cm / PULG, 1))} pulg` : `${numES(red(cm, 1))} cm`);
