// Revisión del plan que arma la doctora (vistas/plan-doctora.js). LA DOCTORA DECIDE: aquí solo se señalan los
// cálculos dudosos o los choques con lo que la clienta declaró. Nada se corrige solo ni se bloquea: ella lee los
// avisos y envía o no.
// nivel: 'alerta' (revísalo antes de enviar) · 'aviso' (puede ser a propósito) · 'info' (para que lo sepas)

import { aplicarIndicaciones, platoPosible, nombreGenerico } from './nutricion.js';
import { alimentoPorId, ALERGENOS, PLATOS, tipoComida, COMIDAS_POR_DIA } from '../datos/alimentos.js';

const miles = n => Math.round(n).toLocaleString('es-DO');
const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);
export const DIAS_MENU = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];
const nombreDia = d => DIAS_MENU.find(x => String(x[0]) === String(d))?.[1] || d;
const etiquetaAlergeno = id => ALERGENOS.find(a => a.id === id)?.etiqueta.split(' (')[0].toLowerCase() || id;

// plan: el de la doctora (datos/dietas.js) · auto: calcularNecesidades sin ella (null si la clienta no configuró su comida)
// ctx: { atleta, perfil, preferencias, restricciones, alergias } · preparado: prepararPlan con este plan (filtro y platos)
// semana: semanaDe con este plan (opcional: si está, se revisan también las comidas que salieron)
export function revisarPlan({ plan, auto, ctx, preparado = null, semana = null }) {
  const avisos = [];
  const add = (nivel, texto) => avisos.push({ nivel, texto });
  const atleta = ctx?.atleta;
  const med = auto?.medico || {};
  const s = atleta?.seguridad || {};
  const otraCond = String(s.condicionOtra || '').toLowerCase();
  const renal = /ri[ñn][oó]n|renal|di[aá]lisis/.test(otraCond) || /Riñón/.test(plan.dieta || '');

  if (auto) {
    const r = aplicarIndicaciones(auto, plan);
    const sexo = auto.datos.sexo;
    // ---------- Energía ----------
    if (plan.kcal || (plan.carbohidratos && plan.grasas)) {
      if (r.kcal < auto.basal) add('alerta', `${miles(r.kcal)} kcal está por debajo de su gasto en reposo estimado (≈ ${miles(auto.basal)} kcal con Mifflin-St Jeor). Su gasto total estimado es ≈ ${miles(auto.gasto)} kcal.`);
      else if (r.kcal < (sexo === 'mujer' ? 1200 : 1500)) add('aviso', `${miles(r.kcal)} kcal es menos de ${sexo === 'mujer' ? '1,200' : '1,500'} kcal al día, el mínimo habitual sin supervisión estrecha para ${sexo === 'mujer' ? 'una mujer' : 'un hombre'}.`);
      if (r.kcal > auto.gasto + 500) add('aviso', `${miles(r.kcal)} kcal es ${miles(r.kcal - auto.gasto)} kcal más que su gasto total estimado (≈ ${miles(auto.gasto)} kcal).`);
      if (med.embarazo && r.kcal < auto.gasto) add('alerta', `Indicó embarazo o parto reciente: ${miles(r.kcal)} kcal queda por debajo de su gasto estimado (≈ ${miles(auto.gasto)} kcal).`);
      if (med.menor18 && r.kcal < auto.gasto) add('alerta', `Es menor de 18 años: ${miles(r.kcal)} kcal queda por debajo de su gasto estimado (≈ ${miles(auto.gasto)} kcal).`);
    }
    // ---------- ¿Cuadran las cifras? ----------
    const suma = r.proteina * 4 + r.carbohidratos * 4 + r.grasas * 9;
    if (Math.abs(suma - r.kcal) / r.kcal > 0.1) {
      add('alerta', `Las cifras no cuadran: ${r.proteina} g de proteína × 4 + ${r.carbohidratos} g de carbohidratos × 4 + ${r.grasas} g de grasas × 9 = ${miles(suma)} kcal, y la meta del día es ${miles(r.kcal)} kcal.`);
    }
    // ---------- Proteína ----------
    if (plan.proteina) {
      const gkg = r.proteina / auto.pesoReferencia;
      const g = gkg.toLocaleString('es-DO', { maximumFractionDigits: 1 });
      if (renal && gkg > 1) add('alerta', `Mencionó un problema de riñón: ${r.proteina} g son ≈ ${g} g por kg de su peso de referencia (${auto.pesoReferencia} kg).`);
      else if (gkg > 2.2) add('aviso', `${r.proteina} g de proteína son ≈ ${g} g por kg de su peso de referencia (${auto.pesoReferencia} kg), por encima de 2,2 g/kg.`);
      else if (gkg < 0.8 && !renal) add('aviso', `${r.proteina} g de proteína son ≈ ${g} g por kg de su peso de referencia (${auto.pesoReferencia} kg), por debajo de 0,8 g/kg.`);
    }
    if ((plan.proteina || plan.kcal) && pct(r.proteina * 4, r.kcal) > 35) add('aviso', `La proteína es el ${pct(r.proteina * 4, r.kcal)} % de las calorías del día.`);
    // ---------- Carbohidratos y grasas ----------
    if (plan.carbohidratos != null || plan.kcal || plan.proteina || plan.grasas) {
      if (r.carbohidratos < 130) add(med.metabolica ? 'alerta' : 'aviso', `Quedan ${r.carbohidratos} g de carbohidratos al día, menos de 130 g (referencia mínima del IOM).${med.metabolica ? ' Indicó una condición metabólica: con insulina u otros medicamentos para el azúcar, bajar mucho los carbohidratos puede causar hipoglucemia.' : ''}`);
      const pg = pct(r.grasas * 9, r.kcal);
      if (pg < 20) add('aviso', `Las grasas son el ${pg} % de las calorías (${r.grasas} g), menos del 20 %.`);
      if (pg > 40) add('aviso', `Las grasas son el ${pg} % de las calorías (${r.grasas} g), más del 40 %.`);
    }
    const comidas = plan.comidas || ctx?.perfil?.comidas || 4;
    if (plan.carbos_comida && r.carbohidratos > plan.carbos_comida * comidas * 1.05) {
      add('alerta', `Con ${comidas} comidas y un tope de ${plan.carbos_comida} g por comida, el día no puede pasar de ${plan.carbos_comida * comidas} g de carbohidratos, pero la meta del día es ${r.carbohidratos} g. El menú se quedará corto de calorías.`);
    }
  }

  // ---------- Límites ----------
  if (plan.carbos_comida != null && plan.carbos_comida < 15) add('aviso', `${plan.carbos_comida} g de carbohidratos por comida es muy poco: muchos platos no se podrán armar.`);
  if (plan.frutas_dia === 0) add('info', 'Sin frutas: el menú no tendrá ninguna fruta.');
  if (plan.sodio_mg && !plan.bajo_sal) add('info', `Pusiste ${miles(plan.sodio_mg)} mg de sodio, pero no marcaste "Baja en sal": el límite se le mostrará, pero el menú no quitará lo salado.`);
  if (med.cardio && !plan.bajo_sal) add('info', 'Indicó presión alta o algo del corazón, y el plan no está marcado como bajo en sal.');
  if (plan.agua_ml) {
    if (plan.agua_maximo && plan.agua_ml < 1000) add('alerta', `Un límite de ${miles(plan.agua_ml)} ml de líquidos al día es muy estricto.`);
    if (!plan.agua_maximo && plan.agua_ml < 1500) add('aviso', `${miles(plan.agua_ml)} ml de agua al día es poco para un adulto activo. Si es un límite por indicación médica, márcalo como "Límite máximo".`);
  }

  // ---------- Choques con lo que ella declaró ----------
  const alergias = new Set((ctx?.alergias || []).map(a => a.alergeno).filter(Boolean));
  const suyosNo = new Set((ctx?.restricciones || []).filter(x => x.tipo === 'rechazar').map(x => x.alimentoId));
  const nombre = id => alimentoPorId[id]?.corto || id;
  for (const id of plan.priorizar) {
    const a = alimentoPorId[id]; if (!a) continue;
    const choque = a.alerg.filter(x => alergias.has(x));
    if (choque.length) add('alerta', `Pediste que coma más ${nombre(id)}, pero ella es alérgica a ${choque.map(etiquetaAlergeno).join(' y ')}: la app no se lo pondrá.`);
    else if (suyosNo.has(id)) add('info', `Pediste que coma más ${nombre(id)}, pero ella marcó que no lo come: la app no se lo pondrá. Puedes hablarlo con ella.`);
  }
  const ambos = plan.no_come.filter(id => plan.priorizar.includes(id) || plan.reducir.includes(id));
  if (ambos.length) add('aviso', `Está a la vez en "No debe comer" y en otra lista: ${ambos.map(nombre).join(', ')}.`);

  // ---------- Platos que eligió en el menú ----------
  if (preparado) {
    const tipos = COMIDAS_POR_DIA[plan.comidas || ctx?.perfil?.comidas || 4] || COMIDAS_POR_DIA[4];
    const platos = [...preparado.extras, ...PLATOS];
    const f = preparado.filtro;
    for (const [dia, comidas] of Object.entries(plan.menu)) {
      for (const [tipo, platoId] of Object.entries(comidas)) {
        const p = platos.find(x => x.id === platoId);
        const donde = `${nombreDia(dia)}, ${tipoComida(tipo).etiqueta.toLowerCase()}`;
        if (!p) { add('aviso', `${donde}: ese plato ya no existe (quizá borraste la receta). La app pondrá otro.`); continue; }
        if (!tipos.includes(tipo)) { add('info', `${donde}: con ${tipos.length} comidas al día no hay ${tipoComida(tipo).etiqueta.toLowerCase()}; ese plato no se usará.`); continue; }
        if (platoPosible(p, f.elegible)) continue;
        const motivos = motivosPlato(p, { plan, ctx, filtro: f });
        add('alerta', `${donde}: "${p.nombre.includes('{') ? nombreGenerico(p) : p.nombre}" choca con lo que ella come: ${motivos.join('; ')}. Se le pondrá igual porque tú lo elegiste, y a ella le saldrá un aviso en esa comida.`);
      }
    }
  }

  // ---------- Lo que salió en la semana de prueba ----------
  if (semana && auto) {
    const lim = aplicarIndicaciones(auto, plan).limites;
    let pasadas = 0, peor = null;
    for (const d of semana.dias) for (const c of d.comidas) {
      if (lim.carbosComida && c.totales.c > lim.carbosComida * 1.1) {
        pasadas++;
        if (!peor || c.totales.c > peor.c.totales.c) peor = { d, c };
      }
    }
    if (pasadas) {
      add('aviso', `${pasadas} ${pasadas === 1 ? 'comida pasa' : 'comidas pasan'} del tope de ${lim.carbosComida} g de carbohidratos, porque sus porciones ya están al mínimo (la que más: ${tipoComida(peor.c.tipo).etiqueta.toLowerCase()} del ${new Date(peor.d.fecha + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long' })}, ${peor.c.totales.c} g). Puedes elegir otros platos en su menú.`);
    }
    // ¿El menú llega a sus metas? (promedio de la semana)
    const meta = aplicarIndicaciones(auto, plan);
    const prom = k => semana.dias.reduce((a, d) => a + d.comidas.reduce((b, c) => b + c.totales[k], 0), 0) / semana.dias.length;
    const kcal = prom('kcal'), prot = prom('p');
    if (Math.abs(kcal / meta.kcal - 1) > 0.1) add('aviso', `El menú de la semana sale con un promedio de ${miles(kcal)} kcal al día, ${Math.round(Math.abs(kcal / meta.kcal - 1) * 100)} % ${kcal > meta.kcal ? 'más' : 'menos'} que la meta de ${miles(meta.kcal)} kcal: con sus gustos, alergias y límites no hay platos que se acerquen más.`);
    if (prot < meta.proteina * 0.85) add('aviso', `El menú de la semana llega a ${Math.round(prot)} g de proteína al día en promedio, menos que la meta de ${meta.proteina} g.`);
    const esperadas = (COMIDAS_POR_DIA[plan.comidas || ctx?.perfil?.comidas || 4] || []).length;
    const cortos = semana.dias.filter(d => d.comidas.length < esperadas);
    if (cortos.length) add('alerta', `En ${cortos.length} ${cortos.length === 1 ? 'día' : 'días'} no se pudieron armar todas las comidas con estas restricciones: hay muy pocos alimentos posibles.`);
  }

  const orden = { alerta: 0, aviso: 1, info: 2 };
  return avisos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

// Por qué un plato choca con lo que ella come (si la doctora lo elige, se le pone igual con un aviso): los huecos obligatorios sin ningún alimento posible. [] si se puede.
export function motivosPlato(p, { plan, ctx, filtro }) {
  const alergias = new Set((ctx?.alergias || []).map(a => a.alergeno).filter(Boolean));
  const suyosNo = new Set((ctx?.restricciones || []).filter(x => x.tipo === 'rechazar').map(x => x.alimentoId));
  const motivos = new Set();
  for (const s of p.slots.filter(x => !x.opcional && !x.op.some(filtro.elegible))) {
    for (const id of s.op) {
      const a = alimentoPorId[id]; if (!a) continue;
      const al = a.alerg.filter(x => alergias.has(x));
      if (al.length) motivos.add(`es alérgica a ${al.map(etiquetaAlergeno).join(' y ')}`);
      else if (plan.no_come.includes(id)) motivos.add(`tú quitaste ${a.corto}`);
      else if (suyosNo.has(id)) motivos.add(`ella no come ${a.corto}`);
      else if (filtro.bajoSal && a.sal === 'alta') motivos.add(`${a.corto} es muy salado y el plan es bajo en sal`);
      else if (a.ocasional) motivos.add(`${a.corto} es de vez en cuando y ella no lo marcó como favorito`);
      else motivos.add(`${a.corto} no va con su forma de comer`);
    }
  }
  return [...motivos];
}
