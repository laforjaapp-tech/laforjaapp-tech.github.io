// Retos por etapas. Se completa uno y se desbloquea el siguiente.

import { hoyISO, sumarDias } from './calculos.js';
import { metaAgua } from './hidratacion.js';

export const RETOS = [
  { numero: 1, titulo: 'Completa tus primeros 7 días', dias: 7, final: '🎉 Primera semana completada.' },
  { numero: 2, titulo: 'Segunda semana: consolida el hábito', dias: 7, final: '🎉 Dos semanas seguidas. El hábito ya está en marcha.' },
  { numero: 3, titulo: 'Termina el mes de adaptación', dias: 14, final: '🎉 Mes de adaptación completado. Es momento de repetir tus pruebas físicas.' },
];

// Reparte los días de entrenamiento dejando descansos entre medias
function patronSemanal(diasEntreno) {
  const patrones = {
    1: [1, 0, 0, 0, 0, 0, 0], 2: [1, 0, 0, 1, 0, 0, 0], 3: [1, 0, 1, 0, 1, 0, 0],
    4: [1, 1, 0, 1, 1, 0, 0], 5: [1, 1, 0, 1, 1, 1, 0], 6: [1, 1, 1, 0, 1, 1, 1],
  };
  return patrones[diasEntreno] || patrones[3];
}

export function crearReto(atleta, numero = 1, inicio = hoyISO()) {
  const def = RETOS.find(r => r.numero === numero);
  const patron = patronSemanal(atleta.disponibilidad?.dias);
  return {
    atletaId: atleta.id,
    numero,
    titulo: def.titulo,
    inicio,
    completado: false,
    dias: Array.from({ length: def.dias }, (_, i) => ({
      fecha: sumarDias(inicio, i),
      tipo: patron[i % 7] ? 'entreno' : 'descanso',
      hecho: { actividad: false, hidratacion: false, alimentacion: false, sueno: false },
    })),
  };
}

export function itemsDelDia(dia, atleta, metaMl = null) {
  const litros = String(Math.round((metaMl ?? metaAgua(atleta).ml) / 100) / 10).replace('.', ',');
  return [
    dia.tipo === 'entreno'
      ? { id: 'actividad', titulo: 'Entrenamiento', detalle: 'Haz tu sesión del día' }
      : { id: 'actividad', titulo: 'Descanso activo', detalle: 'Camina suave y haz 10 min de movilidad' },
    { id: 'hidratacion', titulo: 'Hidratación', detalle: `Unos ${litros} litros de agua repartidos en el día` },
    { id: 'alimentacion', titulo: 'Alimentación', detalle: 'Proteína y verduras en tus comidas principales' },
    { id: 'sueno', titulo: 'Sueño', detalle: 'Entre 7 y 9 horas' },
  ];
}

export const diaCompleto = d => Object.values(d.hecho).every(Boolean);

export function progresoReto(reto) {
  const hechos = reto.dias.filter(diaCompleto).length;
  return { hechos, total: reto.dias.length, porcentaje: Math.round((hechos / reto.dias.length) * 100) };
}

export const siguienteReto = numero => RETOS.find(r => r.numero === numero + 1) || null;
