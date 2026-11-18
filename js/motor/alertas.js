// Alertas para la doctora: qué clienta necesita atención y por qué.
// c: una fila de mis_clientas (pago, mensajes sin leer y el resumen que calcula el teléfono en js/nube/seguimiento.js).
// Devuelve [{ nivel: 'alta' | 'media', icono, texto }], primero las más importantes.

import { hoyISO } from './calculos.js';
import { fmtPeso } from './unidades.js';

const diasDesde = iso => Math.round((Date.parse(hoyISO()) - Date.parse(String(iso).slice(0, 10))) / 864e5);
const dias = n => (n === 1 ? '1 día' : `${n} días`);

export const SIN_ENTRENAR = 7;     // días
export const SIN_COMIDAS = 3;
export const SIN_ABRIR = 5;
export const PAGO_POR_VENCER = 5;

export function alertasClienta(c) {
  const lista = [];
  const alta = (icono, texto) => lista.push({ nivel: 'alta', icono, texto });
  const media = (icono, texto) => lista.push({ nivel: 'media', icono, texto });

  if (!c.activa) { media('⏸️', `Pago vencido desde el ${new Date(c.pagado_hasta + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}`); return lista; }
  const vence = -diasDesde(c.pagado_hasta);
  if (vence <= PAGO_POR_VENCER) media('💵', vence <= 0 ? 'Su pago vence hoy' : `Su pago vence en ${dias(vence)}`);
  if (c.sin_leer) alta('💬', c.sin_leer === 1 ? 'Te escribió un mensaje' : `Te escribió ${c.sin_leer} mensajes`);

  const r = c.resumen, nueva = diasDesde(c.desde) < 3;   // los primeros días no se le exige nada
  if (!c.subido) { if (!nueva) alta('📵', 'Todavía no ha abierto LA FORJA'); return orden(lista); }
  const sinAbrir = diasDesde(c.subido);
  if (sinAbrir >= SIN_ABRIR) alta('📵', `No abre LA FORJA hace ${dias(sinAbrir)}`);

  const sinEntrenar = r.ultimoEntreno ? diasDesde(r.ultimoEntreno) : (nueva ? 0 : diasDesde(c.desde));
  if (sinEntrenar >= SIN_ENTRENAR) alta('🏋️', r.ultimoEntreno ? `${dias(sinEntrenar)} sin entrenar` : 'No ha hecho ningún entrenamiento');
  const sinComidas = r.ultimaComida ? diasDesde(r.ultimaComida) : (nueva ? 0 : diasDesde(c.desde));
  if (sinComidas >= SIN_COMIDAS) media('🍽️', r.ultimaComida ? `${dias(sinComidas)} sin anotar comidas` : 'No ha anotado ninguna comida');

  // Peso en 30 días: subir más de 1 kg, o bajar más de un 4 % (más de 1 % por semana: demasiado rápido)
  const a = { unidades: r.unidades };
  if (r.cambio30 != null && r.cambio30 > 1) media('📈', `Subió ${fmtPeso(r.cambio30, a)} en 30 días`);
  if (r.cambio30 != null && r.peso && r.cambio30 < -0.04 * r.peso) alta('📉', `Bajó ${fmtPeso(-r.cambio30, a)} en 30 días: más rápido de lo recomendado`);
  if (r.dolor && diasDesde(r.dolor) <= 7) alta('⚠️', `Reportó dolor ${diasDesde(r.dolor) === 0 ? 'hoy' : `hace ${dias(diasDesde(r.dolor))}`}`);
  if (r.sueno7 != null && r.sueno7 < 6) media('😴', `Duerme ${String(r.sueno7).replace('.', ',')} h por noche`);
  return orden(lista);
}

const orden = l => l.sort((x, y) => (x.nivel === 'alta' ? 0 : 1) - (y.nivel === 'alta' ? 0 : 1));
