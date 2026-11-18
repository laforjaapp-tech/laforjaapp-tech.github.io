// Recetas de la nutrióloga en la nube (supabase/recetas.sql) y su copia en el teléfono de la clienta.
// La clienta las baja al abrir la app (solo con pago vigente) y quedan guardadas para usarlas sin internet:
// "Recetas de tu nutrióloga" en Comida, y el menú semanal las propone como comidas (datos/habitos.js).

import { nube, limiteDeEspera } from './cliente.js';
import { guardarRecetas } from '../datos/recetas.js';

const ESPERA_MS = 15000;
async function llamar(fn, args) {
  const { data, error } = await nube.rpc(fn, args).abortSignal(limiteDeEspera(ESPERA_MS));
  if (error) throw error;
  return data;
}

// ---------- Doctora ----------
export const misRecetas = () => llamar('mis_recetas');
export const guardarReceta = (id, datos) => llamar('guardar_receta', { p_id: id || null, p_datos: datos });
export const borrarReceta = id => llamar('borrar_receta', { p_id: id });
export const asignarReceta = (id, clientas) => llamar('asignar_receta', { p_receta: id, p_clientas: clientas });

// Lectura con visión en la nube (supabase/functions/leer-receta). Solo funciona si se despliega la función
// y se le pone la clave de la API; si no, la app lee la foto en el teléfono (js/recetas/lector.js).
export async function leerRecetaEnNube(imagenBase64, tipo = 'image/jpeg') {
  const { data, error } = await nube.functions.invoke('leer-receta', { body: { imagen: imagenBase64, tipo } });
  if (error) throw error;
  return data;
}

// ---------- Clienta ----------
// Baja las recetas asignadas y las guarda en el teléfono (datos/recetas.js).
// Devuelve { lista, cambio }, o null sin internet (se sigue usando la copia guardada).
export async function bajarRecetas() {
  let lista;
  try { lista = await llamar('recetas_asignadas'); } catch { return null; }
  return { lista, cambio: await guardarRecetas(lista) };
}
