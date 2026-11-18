// Punto de entrada del motor. Las siguientes fases (generador de entrenamientos,
// nutrición, progreso...) parten de lo que devuelve evaluarAtleta().

import { evaluarRiesgo } from './seguridad.js';
import { calcularPerfil } from './nivel.js';
import { crearEstrategia, crearPeriodizacion } from './estrategia.js';

export function evaluarAtleta(atleta, inicioPrograma) {
  const riesgo = evaluarRiesgo(atleta);
  const perfil = calcularPerfil(atleta, riesgo);
  const estrategia = crearEstrategia(atleta, perfil, riesgo);
  const periodizacion = crearPeriodizacion(perfil, riesgo, inicioPrograma);
  // riesgo.evitar es un Set: se guarda como lista
  return {
    perfil: { ...perfil, riesgo: { ...riesgo, evitar: [...riesgo.evitar] } },
    plan: { estrategia, periodizacion },
  };
}

// Contexto que recibirá el futuro generador de sesiones: todo lo necesario para decidir
// "según tu objetivo, recuperación, historial y rendimiento, hoy corresponde este estímulo".
export function contextoParaEntrenamiento(atleta, { sesiones = [], retroalimentacion = [], registrosDiarios = [] } = {}) {
  return {
    atleta,
    perfil: atleta.perfil,
    estrategia: atleta.plan?.estrategia,
    periodizacion: atleta.plan?.periodizacion,
    historial: { sesiones, retroalimentacion, registrosDiarios },
  };
}
