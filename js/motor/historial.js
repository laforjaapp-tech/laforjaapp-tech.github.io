// Historial: volumen por grupo muscular y aplicación de los resultados de una sesión a la progresión.
// La FASE 3 (pantalla de entrenamiento) llamará a registrarResultado() al terminar cada sesión.

import { ejercicioPorId } from '../datos/ejercicios.js';
import { GRUPOS_MUSCULARES } from '../datos/catalogos.js';
import { decidirAjuste, detectarDominio } from './adaptacion.js';
import { aplicarAjuste } from './prescripcion.js';

// Series efectivas por grupo (principal = 1, secundario = 0,5) en las sesiones dadas
export function volumenMuscular(sesiones = []) {
  const volumen = Object.fromEntries(GRUPOS_MUSCULARES.map(g => [g, 0]));
  const capacidades = { cardio: 0, movilidad: 0, equilibrio: 0 };
  for (const s of sesiones) {
    for (const b of s.workout?.bloques || []) {
      if (['calentamiento', 'enfriamiento'].includes(b.tipo)) { if (b.tipo === 'enfriamiento') capacidades.movilidad++; continue; }
      for (const it of b.items) {
        const e = ejercicioPorId[it.ejercicioId];
        if (!e) continue;
        const series = it.series || b.vueltas || 1;
        e.principal.forEach(g => { volumen[g] += series; });
        e.secundarios.forEach(g => { volumen[g] += series * 0.5; });
        if (e.capacidades.includes('cardio')) capacidades.cardio++;
        if (e.capacidades.includes('movilidad')) capacidades.movilidad++;
        if (e.capacidades.includes('equilibrio')) capacidades.equilibrio++;
      }
    }
  }
  // Desequilibrios: grupos grandes muy por debajo de la media de la semana
  const grandes = ['pecho', 'espalda', 'cuadriceps', 'gluteos', 'isquiotibiales', 'core', 'hombros'];
  const media = grandes.reduce((a, g) => a + volumen[g], 0) / grandes.length;
  const desequilibrios = media >= 3
    ? grandes.filter(g => volumen[g] < media * 0.5).map(g => ({ grupo: g, series: volumen[g] }))
    : [];
  const alertas = [];
  const empuje = volumen.pecho + volumen.hombros * 0.5, traccion = volumen.espalda;
  if (empuje >= 4 && traccion < empuje * 0.7) alertas.push('Más empuje que tracción: se añadirá trabajo de espalda.');
  if (volumen.cuadriceps >= 4 && volumen.isquiotibiales + volumen.gluteos * 0.5 < volumen.cuadriceps * 0.6) alertas.push('Más cuádriceps que cadena posterior: se añadirán glúteos e isquiotibiales.');
  return { volumen, capacidades, desequilibrios, alertas, maximo: Math.max(1, ...Object.values(volumen)) };
}

// Barra de texto para mostrar el volumen: ██████░░░░
export const barraTexto = (valor, maximo, largo = 10) => {
  const n = Math.round((valor / maximo) * largo);
  return '█'.repeat(n) + '░'.repeat(largo - n);
};

// Sensaciones por ejercicio (punto 8): muy fácil / adecuado / difícil / demasiado difícil
export const SENSACION_EJERCICIO = [
  { id: 'muy_facil', etiqueta: 'Me resultó muy fácil' },
  { id: 'adecuado', etiqueta: 'Me resultó adecuado' },
  { id: 'dificil', etiqueta: 'Me resultó difícil' },
  { id: 'muy_dificil', etiqueta: 'Fue demasiado difícil' },
];

// resultado = { general: { sensacion, seriesCompletas, repsCompletas, problemas, energia, esfuerzo, dolor },
//               ejercicios: { [ejercicioId]: { sensacion, completo, repsHechas, rpe } } }
// Actualiza atleta.progresion y devuelve los mensajes de cambio.
export function registrarResultado(atleta, sesion, resultado, permitido = () => true) {
  const fase = atleta.fase?.numero || 1;
  const mensajes = [];
  const g = resultado.general || {};
  const vistos = new Set();
  let dominados = 0, recuperacionBaja = false;
  for (const b of sesion.workout.bloques) {
    if (!['series'].includes(b.formato) || ['calentamiento', 'enfriamiento'].includes(b.tipo)) continue;
    for (const it of b.items) {
      const fam = it.familia;
      const est = atleta.progresion?.[fam];
      if (!fam || !est || est.ejercicioId !== it.ejercicioId || vistos.has(fam)) continue;
      // Modo estricto (entrenamiento guiado): solo se ajusta lo que realmente se hizo
      if (resultado.estricto && !resultado.ejercicios?.[it.ejercicioId]) continue;
      vistos.add(fam);
      const r = resultado.ejercicios?.[it.ejercicioId] || {};
      const fb = {
        sensacion: r.sensacion || g.sensacion || 'adecuado',
        seriesCompletas: r.seriesCompletas ?? r.completo ?? g.seriesCompletas ?? true,
        repsCompletas: r.repsCompletas ?? r.completo ?? g.repsCompletas ?? true,
        problemas: r.problemas ?? false,   // técnica dudosa o problemas: no se progresa
        energia: g.energia ?? 7,
        esfuerzo: r.rpe ?? g.esfuerzo ?? 6,
        dolor: !!(r.dolor || g.dolor),
        fecha: sesion.fecha,
      };
      if (r.peso) est.ultimoPeso = r.peso;
      est.historial = [...(est.historial || []), fb].slice(-6);
      est.sesionesDesdeCambio = (est.sesionesDesdeCambio || 0) + 1;
      let { accion } = decidirAjuste(fb);
      // "No adaptación": varias sesiones dominando el ejercicio → se propone el siguiente desafío
      const dominio = detectarDominio(est.historial);
      if ((accion === 'mantener' || accion === 'progresion_pequena') && dominio.dominado) { accion = 'progresar'; dominados++; }
      // Progresión gradual: en la fase 1 se consolida al menos 2 sesiones entre cambios
      const minimo = fase === 1 ? 2 : 1;
      if (['progresar', 'progresion_pequena'].includes(accion) && est.sesionesDesdeCambio < minimo) accion = 'mantener';
      // FASE 5: solo se progresa con recuperación adecuada (la sesión se generó con el estado de recuperación del día)
      if (['progresar', 'progresion_pequena'].includes(accion) && sesion.workout.recuperacion && sesion.workout.recuperacion !== 'normal') { accion = 'mantener'; recuperacionBaja = true; }
      if (fb.dolor) accion = 'detener_progresion';
      const out = aplicarAjuste(est, accion, atleta, fase, permitido, { dominado: dominio.dominado });
      out.estado.ultimoResultado = { fecha: sesion.fecha, objetivo: r.objetivo || null, realizado: r.repsHechas || null, esfuerzo: fb.esfuerzo, tecnica: r.tecnica || null, accion };
      if (out.cambio) out.estado.sesionesDesdeCambio = 0;
      if (out.cambio === 'variante' || out.cambio === 'series') out.estado.historial = [];
      atleta.progresion[fam] = out.estado;
      if (out.mensaje) mensajes.push(out.mensaje);
    }
  }
  if (dominados) mensajes.unshift('Has dominado esta progresión. Vamos a aumentar ligeramente el desafío.');
  if (recuperacionBaja) mensajes.push('Lo hiciste bien, pero hoy tu recuperación no era la ideal: mantenemos la carga y subimos cuando estés recuperado.');
  if (g.dolor) mensajes.unshift('Reportaste dolor: no subimos ninguna carga. Si el dolor persiste o es agudo, consulta a un profesional.');
  return mensajes;
}
