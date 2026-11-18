// Cadenas de progresión: el orden lógico en que avanza un ejercicio.
// Desde la Fase 2 se generan a partir de la biblioteca (familia + paso), así hay una sola fuente de verdad.

import { EJERCICIOS } from './ejercicios.js';

export const CADENAS = EJERCICIOS.reduce((acc, e) => {
  (acc[e.familia] ||= []).push({ id: e.id, nombre: e.nombre, paso: e.paso, nivel: e.nivel });
  return acc;
}, {});
for (const lista of Object.values(CADENAS)) lista.sort((a, b) => a.paso - b.paso);
