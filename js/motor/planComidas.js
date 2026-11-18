// Todo lo que necesita el menú de una persona: sus necesidades, el filtro de alimentos, cuántas comidas hace,
// sus recetas y el menú que eligió su nutrióloga. Lo usan su teléfono (datos/habitos.js asegurarPlan) y la vista
// previa de la doctora en su ficha (vistas/plan-doctora.js), para que las dos vean exactamente el mismo menú.

import { calcularNecesidades, aplicarIndicaciones, crearFiltro, generarSemana } from './nutricion.js';
import { recetaComoPlato } from './recetas.js';

// ind: el plan de su nutrióloga (datos/dietas.js) o null · recetas: las que le asignó (con sus datos)
export function prepararPlan({ atleta, perfil, preferencias = {}, restricciones = [], alergias = [], ind = null, recetas = [] }) {
  const nec = aplicarIndicaciones(calcularNecesidades(atleta, perfil), ind);
  const todas = [...restricciones,
    ...(ind?.no_come || []).map(id => ({ alimentoId: id, tipo: 'rechazar' })), ...(ind?.reducir || []).map(id => ({ alimentoId: id, tipo: 'reducir' }))];
  const filtro = crearFiltro({
    preferencias, restricciones: todas, alergias, presupuesto: perfil.presupuesto,
    bajoSal: !!ind?.bajo_sal, prioridad: { alimentos: ind?.priorizar, nutrientes: ind?.nutrientes },
  });
  const perfilPlan = ind?.comidas ? { ...perfil, comidas: ind.comidas } : perfil;
  const extras = recetas.map(recetaComoPlato).filter(Boolean);
  return { nec, filtro, perfilPlan, extras, menu: ind?.menu || {}, cultura: preferencias.cultura || 'general' };
}

export const semanaDe = (plan, { inicio, semilla = '', usoPrevio = {} }) => generarSemana({
  nec: plan.nec, perfilNut: plan.perfilPlan, filtro: plan.filtro, inicio, semilla, usoPrevio, cultura: plan.cultura, extras: plan.extras, menu: plan.menu,
});
