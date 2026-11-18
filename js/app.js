// Arranque y navegación de LA FORJA.

import { APP } from './datos/catalogos.js';
import * as BD from './datos/almacen.js';
import { atletaNuevo } from './datos/modelo.js';
import { evaluarAtleta } from './motor/index.js';
import { crearReto } from './motor/retos.js';
import { hoyISO, sumarDias } from './motor/calculos.js';
import { confirmar, aviso } from './ui/componentes.js';
import { ponerSexoFigura, ponerFotoFigura } from './ui/figura.js';
import { vistaBienvenida, vistaAtletas } from './vistas/inicio.js';
import { vistaCuestionario, cuestionarioTerminado } from './vistas/cuestionario.js';
import { vistaPruebas } from './vistas/pruebas.js';
import { vistaPerfil } from './vistas/perfil.js';
import { vistaReto } from './vistas/reto.js';
import { vistaHoy } from './vistas/hoy.js';
import { vistaBiblioteca } from './vistas/biblioteca.js';
import { vistaProgreso } from './vistas/progreso.js';
import { vistaEntrenar } from './vistas/entrenar.js';
import { resultadoParaMotor } from './motor/ejecucion.js';
import { generateWorkout, filtroProgresion } from './motor/generador.js';
import { registrarResultado } from './motor/historial.js';
import { faseInicial, criteriosAscenso, FASES } from './motor/fases.js';
// FASE 4: nutrición, hidratación, sueño y recuperación
import * as H from './datos/habitos.js';
import { vistaAlimentacion } from './vistas/alimentacion.js';
import { vistaBienestar, htmlTablero } from './vistas/bienestar.js';
import { consejosDelDia } from './motor/recuperacion.js';
import { necesitaPausasAgua } from './motor/hidratacion.js';
import { aMinutos } from './motor/nutricion.js';
import { iniciarRecordatorios, pedirPermiso, permisoNotificaciones, bannerEnApp } from './ui/notificaciones.js';
// FASE 5: plan basado en evidencia
import { vistaPlan } from './vistas/plan.js';
import { optimizeAthletePlan } from './motor/optimizador.js';
import { calcularNecesidades, aplicarIndicaciones } from './motor/nutricion.js';
import { listaAlarmas } from './motor/alarmas.js';
import { aplicarTema, temaGuardado } from './ui/temas.js';
import { iniciarPodometro, detenerPodometro } from './ui/podometro.js';
import { fmtPasos } from './motor/pasos.js';
// Cuenta en la nube: sin pago vigente no se entra
import { sesionActual, consultarAcceso, salir, enPalabras } from './nube/acceso.js';
import { vistaEntrar, vistaBloqueo, vistaSinConexion, vistaCuenta } from './vistas/cuenta.js';
import * as Seguimiento from './nube/seguimiento.js';
import { bajarRecetas } from './nube/recetas.js';                 // RECETAS de la nutrióloga
import { recetasPara, olvidarRecetas } from './datos/recetas.js';

const raiz = document.getElementById('app');
const nav = document.getElementById('nav');
let limpiar = null;   // se llama al cambiar de pantalla (p. ej. detener cronómetros)
let actual = null;    // atleta abierto
let guardia = null;   // si hay un entrenamiento en curso, pregunta antes de salir
let pantallaNum = 0;  // sube con cada cambio de pantalla: evita repintar una pantalla que ya se dejó

function cambiarPantalla(fn, seccion = null) {
  limpiar?.(); limpiar = null;
  nav.hidden = !seccion;
  nav.querySelectorAll('[data-ir]').forEach(b => b.classList.toggle('activo', b.dataset.ir === seccion));
  pantallaNum++;
  limpiar = fn() || null;
  return pantallaNum;
}

// Atletas evaluados antes de la Fase 2: se les asigna fase y progresiones
function migrar(a) {
  if (a.estado === 'evaluado' && !a.fase) a.fase = { numero: faseInicial(a.perfil), desde: hoyISO() };
  a.progresion ||= {};
  // Quien empezó antes de que existieran las libras escribía en kilos y centímetros: se le respeta
  if (!a.unidades && (a.estado === 'evaluado' || (a.pasoActual || 0) > 0)) a.unidades = { peso: 'kg', estatura: 'cm' };
  return a;
}

async function recordarAtleta(id) {
  await BD.guardar('ajustes', { id: 'app', atletaActual: id });
  pintarCabecera();
}

async function pintarCabecera() {
  const aj = await BD.obtener('ajustes', 'app');
  const a = aj?.atletaActual && await BD.obtener('atletas', aj.atletaActual);
  document.getElementById('cab-atleta').textContent = a?.personal?.nombre || '';
  // Las figuras de los ejercicios son de hombre o de mujer según la persona (o lo que elija en Perfil)
  ponerSexoFigura(a?.figura || a?.personal?.sexo);
  ponerFotoFigura(a?.foto);
  document.getElementById('cab-cambiar').hidden = !a;
}

async function inicio() {
  const atletas = await BD.todos('atletas');
  if (!atletas.length) return cambiarPantalla(() => vistaBienvenida(raiz, { alComenzar: nuevoAtleta }));
  cambiarPantalla(() => vistaAtletas(raiz, atletas, {
    alElegir: async id => { await recordarAtleta(id); abrir(await BD.obtener('atletas', id)); },
    alNuevo: () => cambiarPantalla(() => vistaBienvenida(raiz, { alComenzar: nuevoAtleta, alVolver: inicio })),
    alBorrar: async id => {
      const a = atletas.find(x => x.id === id);
      if (!(await confirmar(`¿Borrar a ${a.personal.nombre || 'este atleta'} y todos sus datos? No se puede deshacer.`))) return;
      await BD.borrarAtleta(id);
      const aj = await BD.obtener('ajustes', 'app');
      if (aj?.atletaActual === id) await BD.guardar('ajustes', { id: 'app', atletaActual: null });
      pintarCabecera();
      inicio();
    },
  }));
}

async function nuevoAtleta() {
  const a = await BD.guardar('atletas', atletaNuevo());
  await recordarAtleta(a.id);
  abrir(a);
}

function abrir(a) {
  actual = migrar(a);
  if (cuenta) Seguimiento.activarSeguimiento(cuenta, a).then(revisarNovedades);
  if (a.estado === 'evaluado') return mostrarHoy(a);
  if (cuestionarioTerminado(a)) return mostrarPruebas(a);
  mostrarCuestionario(a);
}

const guardarAtleta = a => BD.guardar('atletas', a).then(() => pintarCabecera());

function mostrarCuestionario(a, { empezarEnFinal = false } = {}) {
  cambiarPantalla(() => vistaCuestionario(raiz, a, {
    empezarEnFinal,
    guardar: guardarAtleta,
    alTerminar: ({ pruebas = true } = {}) => (pruebas ? mostrarPruebas(a) : finalizarEvaluacion(a)),
    alSalir: () => (a.estado === 'evaluado' ? mostrarPerfil(a) : inicio()),
  }));
}

function mostrarPruebas(a) {
  cambiarPantalla(() => vistaPruebas(raiz, a, {
    guardar: guardarAtleta,
    alTerminar: () => finalizarEvaluacion(a),
    alVolver: () => { a.cuestionarioHecho = false; mostrarCuestionario(a, { empezarEnFinal: true }); },
  }));
}

// Calcula perfil y plan, guarda el historial y crea el primer reto
async function finalizarEvaluacion(a) {
  const inicioPrograma = a.plan?.periodizacion?.inicio || hoyISO();
  Object.assign(a, evaluarAtleta(a, inicioPrograma));
  a.estado = 'evaluado';
  migrar(a);   // la fase solo se asigna en la primera evaluación: las reevaluaciones no la cambian
  actual = a;
  await guardarAtleta(a);
  await BD.guardar('evaluaciones', { atletaId: a.id, fecha: new Date().toISOString(), pruebas: a.pruebas, perfil: a.perfil });

  // El peso o la cintura nuevos llegan también al historial (antes solo se guardaba la primera evaluación)
  const mediciones = (await BD.porAtleta('mediciones', a.id)).sort((x, y) => x.fecha.localeCompare(y.fecha));
  const ultima = mediciones[mediciones.length - 1];
  if (!ultima || ultima.peso !== a.personal.peso || (a.composicion?.cintura && ultima.cintura !== a.composicion.cintura)) {
    const deHoy = mediciones.find(m => m.fecha === hoyISO());
    await BD.guardar('mediciones', { ...(deHoy || {}), atletaId: a.id, fecha: hoyISO(), peso: a.personal.peso, ...limpiarNulos(a.composicion) });
  }
  const retos = await BD.porAtleta('retos', a.id);
  if (!retos.length) await BD.guardar('retos', crearReto(a, 1));
  mostrarPerfil(a);
}

const limpiarNulos = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v != null && v !== ''));

async function mostrarPerfil(a) {
  const mediciones = await BD.porAtleta('mediciones', a.id);
  cambiarPantalla(() => vistaPerfil(raiz, a, {
    mediciones,
    alRegistrarMedicion: async d => {
      const hoy = hoyISO();
      const deHoy = mediciones.find(m => m.fecha === hoy);
      await BD.guardar('mediciones', { ...(deHoy || {}), atletaId: a.id, fecha: hoy, peso: d.peso, ...(d.cintura ? { cintura: d.cintura } : {}) });
      a.personal.peso = d.peso;
      if (d.cintura) a.composicion.cintura = d.cintura;
      // El peso cambia el IMC y las precauciones de impacto: se recalcula conservando el inicio del programa
      Object.assign(a, evaluarAtleta(a, a.plan.periodizacion.inicio));
      a.perfil.fecha = (await BD.porAtleta('evaluaciones', a.id)).map(e => e.fecha).sort().pop() || a.perfil.fecha;
      await guardarAtleta(a);
      aviso('Medición registrada');
      mostrarPerfil(a);
    },
    alIrReto: () => mostrarReto(a),
    alRepetirPruebas: () => { a.estadoPruebas = {}; mostrarPruebas(a); },
    alEditar: () => mostrarCuestionario(a, { empezarEnFinal: true }),
    alFoto: async foto => { a.foto = foto; await guardarAtleta(a); aviso(foto ? '📸 Listo: ahora el modelo tiene tu cara' : 'Foto quitada'); const y = window.scrollY; await mostrarPerfil(a); window.scrollTo(0, y); },
    alUnidades: async u => { a.unidades = u; await guardarAtleta(a); const y = window.scrollY; await mostrarPerfil(a); window.scrollTo(0, y); },
  }), 'perfil');
}

async function mostrarReto(a) {
  const retos = (await BD.porAtleta('retos', a.id)).sort((x, y) => x.numero - y.numero);
  const reto = retos[retos.length - 1];
  const metaAgua = (await H.aguaDelDia(a)).meta.ml;
  cambiarPantalla(() => vistaReto(raiz, a, reto, {
    metaAgua,
    guardarReto: r => BD.guardar('retos', r),
    alVolver: () => mostrarPerfil(a),
    alSiguiente: async () => { await BD.guardar('retos', crearReto(a, reto.numero + 1)); mostrarReto(a); },
  }), 'reto');
}

// ---------- FASE 2: entrenamiento de hoy, biblioteca y progreso ----------
async function datosHistorial(a) {
  const [sesiones, registrosDiarios, nut] = await Promise.all([BD.porAtleta('sesiones', a.id), BD.porAtleta('registrosDiarios', a.id), H.datosNutricion(a)]);
  // Los días de entreno elegidos en las preferencias de alimentación ordenan también la semana de entrenamiento
  return { sesiones, registrosDiarios, diasEntreno: nut.perfil?.diasEntreno || null, nut };
}

async function mostrarHoy(a, opciones = null) {
  const hoy = hoyISO();
  const { sesiones, registrosDiarios, diasEntreno } = await datosHistorial(a);
  const registroHoy = registrosDiarios.find(r => r.fecha === hoy);
  const cerrada = s => ['completada', 'incompleta'].includes(s.estado);
  let sesionHoy = sesiones.find(s => s.fecha === hoy && cerrada(s)) || sesiones.find(s => s.fecha === hoy);
  if (registroHoy && (!sesionHoy || (opciones && sesionHoy.estado === 'planificada'))) {
    const previas = sesiones.filter(s => s.fecha !== hoy || cerrada(s));
    const op = { ...(sesionHoy?.opciones || {}), ...(opciones || {}) };
    const workout = generateWorkout(a, { sesiones: previas, registrosDiarios, diasEntreno }, op);
    sesionHoy = await BD.guardar('sesiones', { ...(sesionHoy || {}), atletaId: a.id, fecha: hoy, estado: 'planificada', opciones: op, workout });
    await guardarAtleta(a);   // el generador puede crear nuevos estados de progresión
  }
  const [resumen, sugerido] = await Promise.all([H.resumenDelDia(a, hoy), H.suenoSugerido(a.id, hoy)]);
  cambiarPantalla(() => vistaHoy(raiz, a, {
    registroHoy, sesionHoy, tablero: htmlTablero({ ...resumen, sesionHoy: sesionHoy || resumen.sesionHoy }), sugerido,
    alIr: destino => irA(a, destino),
    alGuardarChequeo: async d => {
      await H.guardarChequeo(a, hoy, d);   // también calcula la recuperación y guarda el sueño
      mostrarHoy(a);
    },
    alRegenerar: op => mostrarHoy(a, op),
    alVerBiblioteca: () => mostrarBiblioteca(a),
    alRegistrar: async resultado => {
      sesionHoy.estado = 'completada';
      sesionHoy.resultado = resultado;
      sesionHoy.mensajes = await cerrarSesion(a, sesionHoy, sesiones);
      await BD.guardar('sesiones', sesionHoy);
      aviso('Entrenamiento guardado');
      mostrarHoy(a);
    },
    alComenzar: () => mostrarEntrenar(a, sesionHoy),
    alReiniciar: async () => { sesionHoy.ejecucion = null; sesionHoy.estado = 'planificada'; await BD.guardar('sesiones', sesionHoy); mostrarEntrenar(a, sesionHoy); },
  }), 'hoy');
}

// Cierre común de una sesión (registro manual o entrenamiento guiado):
// alimenta el motor, comprueba el ascenso de fase y marca el reto del día.
async function cerrarSesion(a, sesion, sesiones) {
  const mensajes = registrarResultado(a, sesion, sesion.resultado, filtroProgresion(a));
  const todas = [...sesiones.filter(s => s.id !== sesion.id), sesion];
  const asc = criteriosAscenso(a, todas);
  if (asc.puede) {
    a.fase = { numero: a.fase.numero + 1, desde: hoyISO() };
    Object.values(a.progresion).forEach(e => { e.ascensosFase = 0; e.avisoMaximo = false; });
    mensajes.unshift(`🎉 ¡Subes a la fase ${a.fase.numero}: ${FASES[a.fase.numero - 1].nombre}! ${FASES[a.fase.numero - 1].objetivo}`);
  }
  await guardarAtleta(a);
  const hizoAlgo = sesion.estado === 'completada' || (sesion.resumen?.porcentaje ?? 0) >= 50;
  if (hizoAlgo) {
    const retos = (await BD.porAtleta('retos', a.id)).filter(r => !r.completado);
    for (const r of retos) {
      const dia = r.dias.find(d => d.fecha === sesion.fecha);
      if (dia) { dia.tipo = 'entreno'; dia.hecho.actividad = true; await BD.guardar('retos', r); }
    }
  }
  return mensajes;
}

// ---------- FASE 3: entrenamiento guiado ----------
async function mostrarEntrenar(a, sesion) {
  const { sesiones } = await datosHistorial(a);
  const prefs = await BD.obtener('ajustes', 'entreno');
  const ahora = new Date().getHours() * 60 + new Date().getMinutes();
  const proximaComida = (await H.comidasEntre(a.id, hoyISO(), hoyISO())).find(c => c.tipo !== 'extra' && c.estado === 'planificada' && aMinutos(c.hora) >= ahora) || null;
  const metaAgua = (await H.aguaDelDia(a)).meta.ml;
  cambiarPantalla(() => vistaEntrenar(raiz, a, sesion, {
    prefs: prefs ? { audio: prefs.audio, vibracion: prefs.vibracion } : undefined,
    metaAgua,
    pausasAgua: necesitaPausasAgua(sesion.workout),
    proximaComida,
    alPrefs: p => BD.guardar('ajustes', { id: 'entreno', audio: p.audio, vibracion: p.vibracion }),
    registrarGuardia: fn => { guardia = fn; },
    alGuardarProgreso: (ej, w) => {
      sesion.ejecucion = ej; sesion.workout = w;
      if (sesion.estado !== 'completada' && sesion.estado !== 'incompleta') sesion.estado = 'en_curso';
      return BD.guardar('sesiones', sesion);
    },
    alFinalizar: async (ej, w, resumen) => {
      Object.assign(sesion, { ejecucion: ej, workout: w, estado: ej.estado, resumen, inicio: ej.inicio, fin: ej.fin, duracionSeg: resumen.duracionSeg });
      sesion.resultado = resultadoParaMotor(w, ej);
      sesion.mensajes = await cerrarSesion(a, sesion, sesiones);
      await BD.guardar('sesiones', sesion);
      return sesion.mensajes;
    },
    alCompletarFinal: async extra => {
      if (extra.esfuerzo) sesion.resultado.general.esfuerzo = extra.esfuerzo;
      if (extra.energia) sesion.resultado.general.energia = extra.energia;
      sesion.comentarios = extra.comentarios || '';
      await BD.guardar('sesiones', sesion);
    },
    alCancelar: async despues => {
      sesion.ejecucion = null; sesion.estado = 'planificada';
      await BD.guardar('sesiones', sesion);
      guardia = null;
      (despues || (() => mostrarHoy(a)))();
    },
    alSalir: () => { guardia = null; mostrarHoy(a); },
  }), null);
}

function mostrarBiblioteca(a, inicial = null) {
  cambiarPantalla(() => vistaBiblioteca(raiz, a, { inicial }), 'biblioteca');
}

async function mostrarProgreso(a) {
  const { sesiones } = await datosHistorial(a);
  cambiarPantalla(() => vistaProgreso(raiz, a, sesiones, {
    alVerEjercicio: id => mostrarBiblioteca(a, id),
    alConfirmarParkour: async () => {
      if (!(await confirmar('Confirmas que practicarás los movimientos de parkour complejos solo con supervisión presencial y en superficies seguras.'))) return;
      a.confirmaciones = { ...(a.confirmaciones || {}), parkourD: new Date().toISOString() };
      await guardarAtleta(a);
      mostrarProgreso(a);
    },
  }), 'progreso');
}

// ---------- FASE 5: mi plan (semana, ¿por qué este plan?, progreso multidimensional y evidencia) ----------
async function mostrarPlan(a, estado = {}) {
  const hoy = hoyISO();
  const [{ sesiones, registrosDiarios, diasEntreno, nut }, mediciones, suenos, agua, ind] = await Promise.all([
    datosHistorial(a), BD.porAtleta('mediciones', a.id), H.sueniosDe(a.id), H.aguaDelDia(a, hoy), H.indicacionesDe(a),
  ]);
  const plan = optimizeAthletePlan(a, {
    fecha: hoy, sesiones, registrosDiarios, mediciones, suenos, diasEntreno, aguaMeta: agua.meta.ml,
    nutricion: nut.perfil ? { nec: aplicarIndicaciones(calcularNecesidades(a, nut.perfil), ind), perfil: nut.perfil } : null,   // con el plan de su nutrióloga
  });
  const pestana = estado.pestana || 'semana';
  cambiarPantalla(() => vistaPlan(raiz, a, plan, { pestana, hoy, alPestana: p => { mostrarPlan(a, { pestana: p }); window.scrollTo(0, 0); } }), 'plan');
}

// ---------- FASE 4: alimentación, bienestar y recuperación ----------
// Tablero de "Hoy" → sección correspondiente
function irA(a, destino) {
  if (destino === 'plan') return mostrarPlan(a);
  if (destino === 'hoy') return window.scrollTo({ top: raiz.querySelector('h1')?.offsetTop - 120 || 0, behavior: 'smooth' });
  if (['comida', 'libreta', 'compras'].includes(destino)) return mostrarAlimentacion(a, { pestana: destino === 'comida' ? 'hoy' : destino });
  mostrarBienestar(a, { pestana: destino });
}

// Vuelve a pintar la misma pantalla conservando la posición si no cambia de pestaña
// pantalla: número de la pantalla que pide repintarse. Si mientras tanto se abrió otra (p. ej. tras un cálculo largo), no se toca.
async function repintar(mostrar, a, estado, cambios, pantalla) {
  if (pantalla !== pantallaNum) return;
  const misma = !cambios.pestana || cambios.pestana === estado.pestana;
  const y = window.scrollY;
  await mostrar(a, { ...estado, ...cambios });
  if (misma) window.scrollTo(0, y);
}

async function mostrarAlimentacion(a, estado = {}) {
  const hoy = hoyISO();
  const ctx = await H.asegurarPlan(a);
  // ctx va después de estado: al repintar, el estado anterior trae el ctx viejo y no debe taparlo
  const d = { ...estado, ctx, pestana: estado.pestana || 'hoy', recetas: (await recetasPara(a)).lista };
  if (ctx.configurado) {
    const lunes = H.lunesDe(hoy);
    d.semanas = [0, 1, 2, 3].map(k => sumarDias(lunes, 7 * k));
    if (!d.semanas.includes(d.semana)) d.semana = d.semanas[0];
    const [comidasMes, registro, sesiones, aguaLogs, suplementos, seguimiento, historial, agua] = await Promise.all([
      H.comidasEntre(a.id, lunes, sumarDias(lunes, 27)), H.comidasEntre(a.id, sumarDias(hoy, -14), hoy), BD.porAtleta('sesiones', a.id),
      H.aguaDe(a.id), H.suplementos(a.id), H.seguimientoDelDia(a, hoy, ctx.nec.medico), H.historialSeguimiento(a, hoy, 30, ctx.nec.medico), H.aguaDelDia(a, hoy),
    ]);
    Object.assign(d, {
      comidasMes, registro, comidasHoy: registro.filter(c => c.fecha === hoy), suplementos, seguimiento, historial,
      sesionHoy: sesiones.filter(s => s.fecha === hoy).sort((x, y) => (y.estado === 'completada') - (x.estado === 'completada'))[0] || null,
      aguaLogs: aguaLogs.filter(l => l.fecha >= sumarDias(hoy, -7)), metaAgua: agua.meta.ml,
    });
    if (d.pestana === 'compras') d.compras = await H.listaCompras(a, d.semana);
    if (d.pestana === 'gustos') d.resumenSemana = await H.resumenDeLaSemana(a, hoy);
  }
  let pantalla = 0;
  const re = (cambios = {}) => repintar(mostrarAlimentacion, a, d, cambios, pantalla);
  pantalla = cambiarPantalla(() => vistaAlimentacion(raiz, a, d, {
    alPestana: (pestana, extra = {}) => re({ pestana, editarSup: null, ...extra }),
    alGuardarPreferencias: async datos => { await H.guardarPreferencias(a, datos); aviso('Plan de alimentación actualizado'); re({ pestana: 'hoy' }); },
    alRegistrar: async (meal, est, reg) => { await H.registrarComida(meal, est, reg); re(); },
    alCambiar: async (meal, item, nuevo, rechazar) => { await H.cambiarAlimento(a, meal, item, nuevo, { rechazar, filtro: ctx.filtro }); aviso('Alimento cambiado'); re(); },
    alCambiarPlato: async (meal, opcion) => { await H.cambiarPlato(meal, opcion); aviso('Listo: tu comida ahora es ' + opcion.nombre); re(); },
    alNoComo: async ids => { await H.guardarNoComo(a, ids, ctx.filtro); aviso('Tu lista se guardó y el menú ya no los incluye'); re(); },
    alAnotar: async ({ fecha, ...x }) => { await H.agregarAnotacion(a.id, fecha || hoy, x); aviso('📒 Anotado en tu libreta'); re(); },
    alBorrarAnotacion: async id => { await H.borrarAnotacion(id); re(); },
    alAgua: async ml => { await H.registrarAgua(a.id, ml); aviso(`💧 ${ml} ml registrados`); re(); },
    alBorrarAgua: async id => { await H.borrarAgua(id); re(); },
    alToma: async id => { await H.marcarToma(a.id, id); re(); },
    alGuardarGustos: async (g, favs) => { await H.guardarGustos(a, g, favs); aviso('❤️ Libreta de gustos guardada'); re(); },
    alGuardarItem: async (item, volverAPintar) => { await H.guardarItemCompra(a, item); if (volverAPintar) re(); },
    alBorrarItem: async id => { await H.borrarItemCompra(id); re(); },
    alRegenerarCompras: async () => { await H.listaCompras(a, d.semana, { regenerar: true }); aviso('Lista actualizada desde el menú'); re(); },
    alGuardarSuplemento: async (s, r) => { await H.guardarSuplemento(a.id, s, r); aviso('Suplemento guardado'); re({ editarSup: null }); },
    alBorrarSuplemento: async id => { await H.borrarSuplemento(a.id, id); re(); },
  }), 'comida');
}

async function mostrarBienestar(a, estado = {}) {
  const hoy = hoyISO();
  const d = { ...estado, pestana: estado.pestana || 'resumen' };
  const [resumenDia, agua, meta, logs, enCurso, recuperacion, registros, sesiones, recordatorios, perfilNut, sugerido, suplementos] = await Promise.all([
    H.resumenDelDia(a, hoy), H.aguaDelDia(a, hoy), H.metaSuenoDe(a), H.sueniosDe(a.id), H.nocheEnCurso(a.id), H.recuperacionDelDia(a, hoy),
    BD.porAtleta('registrosDiarios', a.id), BD.porAtleta('sesiones', a.id), H.configRecordatorios(a.id), H.datosNutricion(a), H.suenoSugerido(a.id, hoy), H.suplementos(a.id),
  ]);
  const sesionHoy = resumenDia.sesionHoy;
  const sesionAyer = sesiones.find(s => s.fecha === sumarDias(hoy, -1) && ['completada', 'incompleta'].includes(s.estado)) || null;
  Object.assign(d, {
    resumenDia, agua, sueno: { meta, logs, enCurso }, recuperacion, sesionHoy, recordatorios, sugerido,
    // Alarmas con la app cerrada: el archivo de calendario usa las mismas horas que los recordatorios
    alarmas: listaAlarmas({ config: recordatorios.config, perfilNut: perfilNut.perfil, sueno: meta, suplementos }),
    registroHoy: registros.find(r => r.fecha === hoy) || null, permiso: permisoNotificaciones(),
    consejos: consejosDelDia({ fecha: hoy, perfilNut: perfilNut.perfil, sleepGoal: meta, suenoAnoche: resumenDia.sueno.anoche, sesionHoy, sesionAyer, recuperacion }),
  });
  if (d.pestana === 'resumen') d.resumenSemana = await H.resumenDeLaSemana(a, hoy);
  let pantalla = 0;
  const re = (cambios = {}) => repintar(mostrarBienestar, a, d, cambios, pantalla);
  pantalla = cambiarPantalla(() => vistaBienestar(raiz, a, d, {
    alPestana: pestana => re({ pestana }),
    alAgua: async ml => { await H.registrarAgua(a.id, ml); aviso(`💧 ${ml} ml registrados`); re(); },
    alBorrarAgua: async id => { await H.borrarAgua(id); re(); },
    alConfigAgua: async cfg => { await H.guardarConfigAgua(cfg); aviso('Ajustes de agua guardados'); re(); },
    alSueno: async datos => { await H.registrarSueno(a.id, datos); aviso('🌙 Noche registrada'); re(); },
    alMeDuermo: async () => { const s = await H.marcarDormir(a.id); aviso(`🌙 Buenas noches: anotado a las ${s.horaDormir}`); re(); },
    alMeDesperte: async () => {
      const s = await H.marcarDesperte(a.id);
      aviso(s ? `☀️ Buenos días: dormiste ${Math.floor(s.duracionMin / 60)} h ${s.duracionMin % 60} min` : 'Primero indica a qué hora te dormiste', s ? 'info' : 'error');
      re();
    },
    alMetaSueno: async g => { await H.guardarMetaSueno(g); aviso('Horario de sueño guardado'); re(); },
    alChequeo: async datos => {
      await H.guardarChequeo(a, hoy, datos);
      // Si la sesión de hoy aún no empezó, se vuelve a generar con lo que acabas de responder
      if (sesionHoy?.estado === 'planificada') await BD.borrar('sesiones', sesionHoy.id);
      aviso('Gracias: el motor de entrenamiento lo tendrá en cuenta hoy');
      re();
    },
    alPermiso: async () => { await pedirPermiso(); re(); },
    alProbar: async () => {
      const av = { tipo: 'agua', clave: 'prueba', icono: '💧', titulo: 'Recuerda hidratarte.', cuerpo: 'Así se verán tus avisos.' };
      bannerEnApp(av, a.id);
      if (permisoNotificaciones() === 'granted') (await navigator.serviceWorker?.getRegistration())?.showNotification(`${av.icono} ${av.titulo}`, { body: av.cuerpo, icon: 'icons/forja-192.png' });
    },
    alActividad: async actividad => {
      a.habitos = { ...(a.habitos || {}), actividad };
      Object.assign(a, evaluarAtleta(a, a.plan.periodizacion.inicio));   // el gasto del día y el plan se recalculan
      await guardarAtleta(a);
      aviso('Actividad diaria actualizada: tu plan de comidas se ajustó'); re();
    },
    alAnotarPasos: async n => { await H.anotarPasos(a.id, n); await revisarMetaPasos(a); aviso('👣 Pasos guardados'); re(); },
    alContarPasos: async encender => {
      if (!encender) { detenerPodometro(); await guardarPasosPendientes(); aviso('Dejamos de contar'); return re(); }
      if (!(await iniciarPodometro(() => contarPaso(a)))) return aviso('Este teléfono no dejó usar el sensor de pasos', 'error');
      aviso('👣 Contando: camina con el teléfono encima'); re();
    },
    alGuardarRecordatorios: async config => { await H.guardarConfigRecordatorios({ ...recordatorios, config }); aviso('Recordatorios guardados'); re(); },
  }), 'bienestar');
}

// ---------- Pasos contados con la app abierta: se guardan cada 20 pasos ----------
let pasosPendientes = 0, atletaPasos = null;
function contarPaso(a) {
  if (actual && actual.id !== a.id) { guardarPasosPendientes(); detenerPodometro(); return; }   // cambió de persona: se apaga
  atletaPasos = a; pasosPendientes++;
  if (pasosPendientes >= 20) guardarPasosPendientes().then(async () => {
    const el = document.getElementById('ph-num');
    if (el) el.textContent = fmtPasos((await H.pasosDelDia(a)).pasos);
  });
}
async function guardarPasosPendientes() {
  if (!pasosPendientes || !atletaPasos) return;
  const n = pasosPendientes; pasosPendientes = 0;
  await H.sumarPasosApp(atletaPasos.id, n);
  await revisarMetaPasos(atletaPasos);
}
async function revisarMetaPasos(a) {
  const p = await H.pasosDelDia(a);
  if (p.pasos >= p.meta) await H.marcarRetoPorPasos(a.id);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarPasosPendientes().then(() => Seguimiento.subir()); });

// ---------- Cuenta en la nube: nadie usa LA FORJA sin cuenta, y la clienta solo mientras tenga pagado ----------
let cuenta = null;   // respuesta de consultarAcceso(): rol, nombre, hasta, doctora…

// Se queda en las pantallas de cuenta hasta que la persona tenga acceso
function puerta() {
  return new Promise(pasar => {
    const cerrar = async () => { await Seguimiento.apagarSeguimiento(); await olvidarRecetas(); await salir(); comprobar(); };
    const comprobar = async () => {
      const sesion = await sesionActual();
      if (!sesion) return cambiarPantalla(() => vistaEntrar(raiz, { alListo: comprobar }));
      let info;
      try { info = await consultarAcceso(sesion); }
      catch (e) { return cambiarPantalla(() => vistaSinConexion(raiz, enPalabras(e), { alListo: comprobar, alSalir: cerrar })); }
      if (!info.acceso) return cambiarPantalla(() => vistaBloqueo(raiz, info, { alListo: comprobar, alSalir: cerrar }));
      cuenta = info;
      // Aparato o dirección nueva sin ninguna persona: primero se bajan sus datos de la nube (paciente, doctora o dueño). Si no se puede, no se sigue:
      // empezar en blanco haría que la primera subida borrara la copia buena de la nube.
      if (!(await BD.todos('atletas')).length) {
        try {
          if (await Seguimiento.recuperarDeLaNube(info)) aviso('✅ Recuperamos tus datos');
        } catch (e) { return cambiarPantalla(() => vistaSinConexion(raiz, enPalabras(e), { alListo: comprobar, alSalir: cerrar })); }
      }
      document.getElementById('cab-cuenta').hidden = false;
      ponerGlobo(0);
      pasar();
    };
    comprobar();
  });
}

// Botón de la cabecera, con los mensajes sin leer de la clienta
function ponerGlobo(sinLeer) {
  document.getElementById('cab-cuenta').textContent = cuenta.rol === 'clienta' ? `👤 Cuenta${sinLeer ? ` · 💬 ${sinLeer}` : ''}` : '👩‍⚕️ Clientas';
}

// Clienta: mensajes de su doctora, ajustes de su plan y sus recetas (al abrir, al volver a la app y cada 5 minutos)
async function revisarNovedades() {
  if (cuenta?.rol !== 'clienta') return;
  const [n, r] = await Promise.all([Seguimiento.revisarNovedades(), bajarRecetas()]);
  if (n) {
    ponerGlobo(n.sinLeer);
    if (n.mensajeNuevo) aviso(`💬 ${cuenta.doctora || 'Tu doctora'} te escribió. Toca "Cuenta" para leerlo.`);
  }
  const planCambio = !!n?.planCambio, recetasCambio = !!r?.cambio;
  if (!planCambio && !recetasCambio) return;
  // El menú se rehace ya (no solo al entrar a Comida), para que "Hoy" muestre las comidas nuevas
  if (actual) await H.asegurarPlan(actual);
  if (planCambio) aviso(n.indicaciones ? `🩺 ${n.indicaciones.por || 'Tu nutrióloga'} ajustó tu plan de comidas` : '🩺 Tu plan de comidas volvió al cálculo de la app');
  if (recetasCambio && r.lista.length) aviso(`📖 ${cuenta.doctora || 'Tu nutrióloga'} te mandó recetas: ya están en tu menú`);
}

async function mostrarCuenta() {
  const atletas = cuenta.rol === 'clienta' ? await BD.todos('atletas') : [];
  cambiarPantalla(() => {
    vistaCuenta(raiz, cuenta, {
      alVolver: () => (actual ? abrir(actual) : inicio()),
      alSalir: async () => { await Seguimiento.apagarSeguimiento(); await olvidarRecetas(); await salir(); location.reload(); },
      // Clienta: qué persona de este aparato ve su doctora, y cuándo se enviaron sus datos
      seguimiento: cuenta.rol === 'clienta' && {
        personas: atletas.map(a => ({ id: a.id, nombre: a.personal?.nombre || 'Sin nombre' })),
        conectada: Seguimiento.personaConectada(),
        subido: Seguimiento.ultimaSubida(),
        alCambiarPersona: async id => { await Seguimiento.cambiarPersona(cuenta, id); mostrarCuenta(); },
        alLeido: () => ponerGlobo(0),
        alEnviar: async () => {
          const ok = await Seguimiento.subir();
          aviso(ok ? '✅ Tus datos llegaron a tu doctora' : 'No se pudieron enviar. Revisa tu internet y vuelve a intentar.', ok ? 'info' : 'error');
          mostrarCuenta();
        },
      },
    });
  });
}

// Con la app abierta se vuelve a comprobar al regresar a ella y cada 6 horas: si el pago venció, se cierra
let ultimaRevision = Date.now();
async function revisarAcceso() {
  if (!cuenta || Date.now() - ultimaRevision < 6 * 3600e3) return;
  ultimaRevision = Date.now();
  const sesion = await sesionActual();
  const info = sesion && await consultarAcceso(sesion).catch(() => null);
  if (!sesion || (info && !info.acceso)) location.reload();
  else if (info) cuenta = info;
}

async function arrancar() {
  raiz.dataset.listo = '1';   // los módulos cargaron bien: el aviso de "No se pudo abrir" de index.html no se muestra
  aplicarTema(temaGuardado());
  document.title = APP.nombre;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  await puerta();
  revisarNovedades();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { revisarAcceso(); revisarNovedades(); } });
  setInterval(revisarAcceso, 3600e3);
  setInterval(revisarNovedades, 5 * 60e3);
  document.getElementById('cab-cuenta').onclick = () => (guardia ? guardia(mostrarCuenta) : mostrarCuenta());
  nav.addEventListener('click', e => {
    const ir = e.target.closest('[data-ir]')?.dataset.ir;
    if (!ir || !actual) return;
    const ir2 = () => ({ hoy: mostrarHoy, plan: mostrarPlan, comida: mostrarAlimentacion, bienestar: mostrarBienestar, biblioteca: mostrarBiblioteca, progreso: mostrarProgreso, perfil: mostrarPerfil, reto: mostrarReto })[ir](actual);
    guardia ? guardia(ir2) : ir2();
  });
  document.getElementById('cab-cambiar').onclick = () => {
    const salir = async () => { await BD.guardar('ajustes', { id: 'app', atletaActual: null }); pintarCabecera(); inicio(); };
    guardia ? guardia(salir) : salir();
  };
  await pintarCabecera();
  const aj = await BD.obtener('ajustes', 'app');
  const a = aj?.atletaActual && await BD.obtener('atletas', aj.atletaActual);
  if (a) abrir(a); else inicio();
  iniciarRecordatorios(() => actual);
}

arrancar().catch(err => {
  console.error(err);
  raiz.innerHTML = `<section class="pantalla"><h1>No se pudo iniciar</h1><p>${String(err.message || err)}</p></section>`;
});
