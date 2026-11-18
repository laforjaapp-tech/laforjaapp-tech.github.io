// FASE 5: distribución semanal individual de los estímulos.
// Decide qué sesiones tocan esta semana (según objetivo, días, minutos, fase, modalidades y desbloqueos),
// en qué día van para no acumular fatiga, y cuántas veces se estimula cada grupo muscular.

import { PLANTILLAS, nombreSesion, estimulosDe, cargaDe, enfoqueDe, musculosCargados } from './plantillas.js';
import { objetivoDominante } from './objetivos.js';
import { desbloqueado } from './fases.js';
import { sumarDias } from './calculos.js';
import { NOMBRES_GRUPO } from '../datos/ejercicios.js';

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const lunesDe = fecha => { const d = new Date(fecha + 'T12:00:00'); return sumarDias(fecha, -((d.getDay() + 6) % 7)); };
// Días por defecto (0 = lunes) según cuántos entrena
const DIAS_DEFECTO = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
// Frecuencia semanal buscada por grupo (estímulos): 2 para los grandes, 3 para el core
export const FRECUENCIA_OBJETIVO = { pecho: 2, espalda: 2, hombros: 2, cuadriceps: 2, gluteos: 2, isquiotibiales: 2, core: 3 };

// ¿Choca la sesión de mañana con la de hoy? (días seguidos)
export function conflicto(prev, sig) {
  if (!prev || !sig) return { puntos: 0 };
  const a = cargaDe(prev.tipo, prev.enfoque), b = cargaDe(sig.tipo, sig.enfoque);
  if (a.piernas && (b.impacto || (b.piernas && b.intenso)))
    return { puntos: 10, motivo: 'Después de un día de piernas se evitan saltos, carreras intensas o circuitos exigentes: comprometen la recuperación.' };
  const comunes = musculosCargados(prev.tipo, prev.enfoque).filter(g => musculosCargados(sig.tipo, sig.enfoque).includes(g));
  if (comunes.length >= 2)
    return { puntos: a.enfoque === 'completo' && b.enfoque === 'completo' ? 6 : 5, motivo: 'Los mismos músculos necesitan al menos un día de descanso entre dos sesiones de fuerza.' };
  if (a.intenso && b.intenso) return { puntos: 4, motivo: 'Dos sesiones intensas seguidas suman demasiada fatiga.' };
  if (prev.tipo === sig.tipo) return { puntos: 2, motivo: 'Mejor no repetir la misma sesión dos días seguidos.' };
  return { puntos: 0 };
}

// Ordena las sesiones en los días disponibles con la menor fatiga acumulada
function colocar(sesiones, dias) {
  const n = sesiones.length;
  let mejor = null;
  const usados = new Array(n).fill(false), orden = [];
  const puntuar = o => {
    let p = 0;
    for (let i = 1; i < o.length; i++) if (dias[i] - dias[i - 1] === 1) p += conflicto(o[i - 1], o[i]).puntos;
    // La fuerza conviene repartida: penaliza poco que quede junta al principio o al final
    return p;
  };
  const probar = () => {
    if (orden.length === n) { const p = puntuar(orden); if (!mejor || p < mejor.p) mejor = { p, o: [...orden] }; return; }
    const vistos = new Set();
    for (let i = 0; i < n; i++) {
      const clave = sesiones[i].tipo + sesiones[i].enfoque;
      if (usados[i] || vistos.has(clave)) continue;   // evita repetir permutaciones iguales
      vistos.add(clave); usados[i] = true; orden.push(sesiones[i]);
      probar();
      orden.pop(); usados[i] = false;
    }
  };
  probar();
  return mejor ? mejor.o : sesiones;
}

export function planSemanal(atleta, { fecha, per = null, items = [], diasEntreno = null } = {}) {
  const obj = objetivoDominante(atleta);
  const est = atleta.plan?.estrategia || {};
  const fase = atleta.fase?.numero || 1;
  const minutos = atleta.disponibilidad?.minutos || 30;
  const dias = atleta.disponibilidad?.dias || 3;
  const mods = new Set(atleta.modalidades || []);
  const des = est.desbloqueos || {};
  const abierto = m => mods.has(m) && des[m] && !['bloqueado', 'no_disponible'].includes(des[m].estado);
  const descarga = !!per?.descarga;
  const semanaCiclo = per?.microciclo?.semana || 1;
  const meso = per?.mesociclo?.numero || 1;
  const notas = [];
  let F = est.sesionesFuerza ?? 2, C = est.sesionesCardio ?? 1;
  if (F + C > dias) C = Math.max(0, dias - F);

  // 1) Sesiones de fuerza: cuerpo completo o, con 4+ días de fuerza, tren superior y piernas alternados
  const dividir = F >= 4 && fase >= 2;
  const cabe = t => (PLANTILLAS[t].minimo || 0) <= minutos;
  const permitidaFuerza = t => cabe(t)
    && (!['fuerza_calistenia', 'calistenia_cardio'].includes(t) || abierto('calistenia'))
    && (t !== 'fuerza_metabolico' || (fase >= 2 && !descarga));
  const preferidas = {
    A: ['fuerza_cardio', 'fuerza_core', 'fuerza_metabolico'],
    B: ['fuerza_core', 'fuerza_calistenia', 'fuerza_cardio'],
    C: ['fuerza_core', 'fuerza_calistenia', 'fuerza_core'],
    D: ['fuerza_cardio', 'calistenia_cardio', 'fuerza_core'],
    E: ['fuerza_core', 'fuerza_calistenia', 'fuerza_cardio'],
  }[obj.clave].filter(permitidaFuerza);
  const listaFuerza = preferidas.length ? preferidas : ['fuerza_core'];
  const sesiones = [];
  for (let i = 0; i < F; i++) {
    const enfoque = dividir ? (i % 2 ? 'inferior' : 'superior') : 'completo';
    // La calistenia de la plantilla "fuerza + calistenia" ya trabaja el tren superior: solo encaja en días de piernas o de cuerpo completo
    const opciones = listaFuerza.filter(t => !(enfoque === 'superior' && PLANTILLAS[t].enfoque === 'inferior'));
    const tipo = (opciones.length ? opciones : ['fuerza_core'])[(i + meso - 1) % (opciones.length || 1)];
    sesiones.push({ tipo, enfoque: enfoqueDe(tipo, enfoque) });
  }

  // 2) Sesiones de cardio según el objetivo, con límites: HIIT 1 (2 en fase 4+ si el objetivo es cardiovascular), boxeo 1–2, militar 1
  const hiitOk = mods.has('hiit') && desbloqueado(items, 'hiit') && fase >= 2 && !descarga;
  const opcionesCardio = {
    A: ['cardio_movilidad', abierto('boxeo') && 'boxeo_cardio', hiitOk && 'hiit_core', abierto('militar') && !descarga && 'militar'],
    B: ['cardio_movilidad', abierto('boxeo') && 'boxeo_cardio'],
    C: ['cardio_movilidad', abierto('boxeo') && 'boxeo_cardio', abierto('militar') && !descarga && 'militar'],
    D: ['cardio_movilidad', hiitOk && 'hiit_core', abierto('boxeo') && 'boxeo_cardio', abierto('militar') && !descarga && 'militar'],
    E: [abierto('agilidad') && abierto('calistenia') && 'agilidad_calistenia', 'cardio_movilidad', abierto('boxeo') && 'boxeo_cardio', abierto('militar') && !descarga && 'militar'],
  }[obj.clave].filter(Boolean);
  const limites = { hiit_core: obj.clave === 'D' && fase >= 4 ? 2 : 1, boxeo: dias >= 5 ? 2 : 1, militar: 1 };
  const cuenta = t => sesiones.filter(s => s.tipo === t).length;
  const boxeos = () => sesiones.filter(s => s.tipo.includes('boxeo')).length;
  for (let i = 0; i < C; i++) {
    let tipo = 'cardio_movilidad';
    for (let k = 0; k < opcionesCardio.length; k++) {
      const t = opcionesCardio[(i + k + meso - 1) % opcionesCardio.length];
      const lleno = t === 'hiit_core' ? cuenta(t) >= limites.hiit_core : t === 'boxeo_cardio' ? boxeos() >= limites.boxeo : t === 'militar' ? cuenta(t) >= limites.militar : false;
      if (!lleno) { tipo = t; break; }
    }
    sesiones.push({ tipo, enfoque: 'completo' });
  }

  // 3) Experimentación controlada: en la semana 3 del ciclo se prueba una variante (fuerza + boxeo técnico)
  if (semanaCiclo === 3 && !descarga && abierto('boxeo') && boxeos() < limites.boxeo && minutos >= PLANTILLAS.fuerza_boxeo.minimo) {
    const s = sesiones.find(x => x.tipo === 'fuerza_cardio' || x.tipo === 'fuerza_core');
    if (s) { s.tipo = 'fuerza_boxeo'; s.experimento = true; notas.push('Semana 3 del ciclo: una sesión prueba fuerza + boxeo técnico en lugar del cardio. Al final del ciclo se compara cómo respondiste.'); }
  }
  if (descarga) notas.push('Semana de descarga: menos volumen y sin sesiones de alto impacto para recuperar y asimilar lo entrenado.');

  // 4) Días: los que indicaste en tus preferencias o un reparto con descansos intercalados
  const total = sesiones.length;
  let indices = (diasEntreno || []).map(d => (d + 6) % 7).sort((a, b) => a - b);
  if (indices.length !== total) indices = DIAS_DEFECTO[Math.min(7, Math.max(1, total))] || [];
  const ordenadas = total ? colocar(sesiones, indices) : [];
  // Fuerza en días seguidos que no se pudieron separar: los dos días se reparten piernas y tren superior
  const COMPLEMENTO = { inferior: 'superior', superior: 'inferior' };
  for (let i = 1; i < ordenadas.length; i++) {
    const a = ordenadas[i - 1], b = ordenadas[i];
    if (indices[i] - indices[i - 1] !== 1 || PLANTILLAS[a.tipo].grupo !== 'fuerza' || PLANTILLAS[b.tipo].grupo !== 'fuerza') continue;
    if (!conflicto(a, b).puntos) continue;
    const fijoA = PLANTILLAS[a.tipo].enfoque, fijoB = PLANTILLAS[b.tipo].enfoque;
    if (!fijoA && !fijoB) { a.enfoque = 'inferior'; b.enfoque = 'superior'; }
    else if (fijoA && !fijoB) b.enfoque = COMPLEMENTO[fijoA];
    else if (fijoB && !fijoA) a.enfoque = COMPLEMENTO[fijoB];
    else continue;
    notas.push('Tienes dos días de fuerza seguidos: uno se centra en piernas y el otro en el tren superior, para que los mismos músculos no trabajen dos días seguidos.');
  }
  const lunes = lunesDe(fecha);
  const semana = DIAS_SEMANA.map((nombre, i) => {
    const k = indices.indexOf(i);
    const s = k >= 0 ? ordenadas[k] : null;
    return { indice: i, nombre, fecha: sumarDias(lunes, i), sesion: s ? { ...s, nombre: nombreSesion(s.tipo, s.enfoque), grupo: PLANTILLAS[s.tipo].grupo } : null };
  });

  // Choques que no se pudieron evitar (pocos días seguidos disponibles)
  const avisos = [];
  for (let i = 1; i < 7; i++) {
    const c = conflicto(semana[i - 1].sesion, semana[i].sesion);
    if (c.puntos >= 5) avisos.push(`${semana[i - 1].nombre} → ${semana[i].nombre}: ${c.motivo} Si te sientes cargado, cambia el orden o haz la versión suave.`);
  }

  // 5) Frecuencia muscular semanal
  const frecuencia = Object.fromEntries(Object.keys(FRECUENCIA_OBJETIVO).map(g => [g, 0]));
  for (const s of sesiones) for (const g of estimulosDe(s.tipo, s.enfoque)) if (g in frecuencia) frecuencia[g]++;
  const faltan = Object.entries(FRECUENCIA_OBJETIVO).filter(([g, n]) => frecuencia[g] < Math.min(n, F >= 2 ? n : 1)).map(([g]) => NOMBRES_GRUPO[g].toLowerCase());
  if (faltan.length && F >= 2) avisos.push(`Con tu reparto, ${faltan.join(', ')} ${faltan.length === 1 ? 'recibe' : 'reciben'} menos estímulos de los ideales con tus días disponibles. Si en la semana se queda atrás, las sesiones de fuerza lo refuerzan automáticamente.`);
  const excesos = Object.entries(frecuencia).filter(([g, n]) => n >= 5).map(([g]) => NOMBRES_GRUPO[g].toLowerCase());
  if (excesos.length) avisos.push(`${excesos.join(', ')}: muchos estímulos esta semana; el volumen de cada sesión se ajusta para no sobrecargar.`);

  const resumen = {
    fuerza: sesiones.filter(s => PLANTILLAS[s.tipo].grupo === 'fuerza').length,
    cardio: sesiones.filter(s => PLANTILLAS[s.tipo].bloques.some(b => ['cardio', 'hiit'].includes(b.d))).length,
    calistenia: sesiones.filter(s => PLANTILLAS[s.tipo].bloques.some(b => b.d === 'calistenia')).length,
    boxeo: boxeos(),
    movilidad: sesiones.filter(s => PLANTILLAS[s.tipo].bloques.some(b => b.d === 'movilidad')).length,
    militar: cuenta('militar'),
    hiit: cuenta('hiit_core'),
    agilidad: sesiones.filter(s => PLANTILLAS[s.tipo].bloques.some(b => b.d === 'agilidad')).length,
    descanso: 7 - total,
  };
  return { objetivo: obj, lunes, semana, sesiones: ordenadas, frecuencia, avisos, notas, resumen, semanaCiclo, descarga };
}
