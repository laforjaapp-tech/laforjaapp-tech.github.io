// Copia en el teléfono de las recetas que la nutrióloga le asignó a la clienta (las baja js/nube/recetas.js).
// Sirven sin internet: "Recetas de tu nutrióloga" en Comida, y el menú semanal las propone como comidas.
// Son de la persona de este aparato conectada a la cuenta (la misma que ve la doctora, js/nube/seguimiento.js).

import * as BD from './almacen.js';

const GUARDADO = 'recetas';   // registro en el almacén 'ajustes'

// lista: [{ id, datos, actualizada, por }] tal como llega de la nube
export async function guardarRecetas(lista) {
  const previo = await BD.obtener('ajustes', GUARDADO);
  const version = lista.map(r => `${r.id}@${r.actualizada}`).sort().join('|');
  const cambio = (previo?.version || '') !== version;
  if (cambio) await BD.guardar('ajustes', { id: GUARDADO, version, lista });
  return cambio;
}

// Recetas para esta persona: { version, lista: [{ id, nombre, porciones, …, por }] }; vacío si no es la persona conectada
export async function recetasPara(atleta) {
  const [g, nube] = await Promise.all([BD.obtener('ajustes', GUARDADO), BD.obtener('ajustes', 'nube')]);
  if (!g || nube?.atletaId !== atleta.id) return { version: '', lista: [] };
  return { version: g.version, lista: g.lista.map(r => ({ ...r.datos, id: r.id, por: r.por })) };
}

export const olvidarRecetas = () => BD.borrar('ajustes', GUARDADO).catch(() => {});
