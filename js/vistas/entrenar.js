// MODO DE ENTRENAMIENTO INTERACTIVO (FASE 3)
// Recorre la secuencia de pasos del generador: bloque → preparar → cuenta atrás → serie → descanso → …
// Todo el tiempo se mide con Cronometro (pausable). El progreso se guarda tras cada serie.

import { esc, chips, activarChips, valorChips, mostrarAlarma } from '../ui/componentes.js';
import { Cronometro, formatoTiempo, pitido, vibrar, configurarSenales } from '../ui/cronometro.js';
import { hablar, configurarVoz, vozDisponible, NUMEROS, cambiarHablante } from '../ui/voz.js';
import { quienDisciplina, htmlQuien } from '../ui/equipo.js';
import { secuenciaEjecucion, alternativasPara, explicar } from '../motor/generador.js';
import { prescribir } from '../motor/prescripcion.js';
import { frase, paraSexo, animoRepeticion, resumenEjecucion, mensajeFinal, recomendacionesRecuperacion, pesoAnterior } from '../motor/ejecucion.js';
import * as U from '../motor/unidades.js';
import { barraTexto } from '../motor/historial.js';
import { ejercicioPorId, NOMBRES_GRUPO } from '../datos/ejercicios.js';
import { htmlDemostracion, htmlTecnica, htmlFilaEjercicio, textoDosis } from '../ui/tecnica.js';
import { htmlIlustracion, montarIlustraciones, pausarFiguras, tieneIlustracion } from '../ui/figura.js';
import { disciplinaDe, textoDisciplina, claveDisciplina } from '../datos/disciplinas.js';

const ACTIVOS = ['ejercicio', 'ronda', 'intervalo'];
const SENSACIONES_5 = [
  { id: 'muy_dificil', etiqueta: '😫 Muy difícil' }, { id: 'dificil', etiqueta: '😕 Difícil' }, { id: 'adecuado', etiqueta: '😐 Adecuado' },
  { id: 'facil', etiqueta: '🙂 Fácil' }, { id: 'muy_facil', etiqueta: '🔥 Muy fácil' },
];
const flecha = t => esc(t).replace(/ \+ /g, ' → ');
const ahoraHora = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

// Qué patrones de movimiento cargan cada zona lesionada ('*' = cualquiera)
const ZONAS_LESION = {
  rodilla: ['rodilla', 'bisagra', 'pantorrilla'], tobillo: ['rodilla', 'pantorrilla'], cadera: ['rodilla', 'bisagra'], espalda: ['bisagra', 'rodilla', 'carga'],
  hombro: ['empuje_h', 'empuje_v', 'traccion_h', 'traccion_v', 'aislamiento'], codo: ['empuje_h', 'empuje_v', 'traccion_h', 'traccion_v', 'aislamiento'],
  muneca: ['empuje_h', 'empuje_v', 'traccion_h', 'traccion_v'], cuello: ['empuje_v', 'traccion_v', 'carga'], otra: ['*'],
};

export function vistaEntrenar(raiz, atleta, sesion, cb) {
  const w = sesion.workout;
  let pasos = secuenciaEjecucion(w);
  const ej = sesion.ejecucion?.inicio ? sesion.ejecucion
    : { inicio: new Date().toISOString(), indice: 0, grupos: {}, hechos: [], segundosPaso: {}, pausadoSeg: 0, saltados: [] };
  const reanudando = !!sesion.ejecucion?.inicio;
  let i = ej.indice || 0;
  let crono = null;            // cronómetro activo (cuenta, serie, descanso…)
  let pausado = false, pausaDesde = 0, terminado = false;
  let finUltimaSerie = null;   // para medir el descanso real
  let mitadAvisada = false;
  let pendiente = null;        // acción que quedó a la espera porque se pausó justo antes
  let bloqueoPantalla = null;
  let ultimaPausaAgua = Date.now();   // FASE 4: en sesiones largas o intensas, recordar el agua cada ~12 min
  const prefs = { audio: true, vibracion: true, ...(cb.prefs || {}) };
  configurarVoz(prefs.audio); configurarSenales({ sonido: prefs.audio, vibracion: prefs.vibracion });

  // ---------- Utilidades ----------
  const item = p => (p.itemIdx != null ? w.bloques[p.bloqueIdx]?.items[p.itemIdx] : null);
  const ordenGrupos = () => [...new Set(pasos.filter(p => ACTIVOS.includes(p.tipo) && !p.guiado).map(p => p.grupo))];
  const porcentaje = () => resumenEjecucion(pasos, ej, atleta.personal?.peso).porcentaje;
  const esFinDeGrupo = k => {
    const g = pasos[k].grupo;
    for (let j = k + 1; j < pasos.length; j++) {
      if (pasos[j].tipo === 'descanso' && pasos[j].grupo === g) continue;
      return !(ACTIVOS.includes(pasos[j].tipo) && pasos[j].grupo === g);
    }
    return true;
  };
  const anteriorActivo = k => { for (let j = k - 1; j >= 0; j--) if (ACTIVOS.includes(pasos[j].tipo)) return pasos[j]; return null; };
  const esPrimeroDeGrupo = k => anteriorActivo(k)?.grupo !== pasos[k].grupo;
  const grupoReg = p => (ej.grupos[p.grupo] ||= {
    grupo: p.grupo, ejercicioId: p.ejercicioId, nombre: p.tipo === 'ronda' ? w.bloques[p.bloqueIdx].titulo : p.nombre,
    bloqueIdx: p.bloqueIdx, itemIdx: p.itemIdx, tipoBloque: p.tipoBloque, formato: p.formato, guiado: !!p.guiado,
    objetivo: { series: p.de || 1, reps: p.reps ?? null, segundos: p.segundos ?? null, porLado: !!p.lado },
    series: [], feedback: null,
  });
  let guardarTimer = null;
  const guardar = (inmediato = false) => {
    ej.indice = i;
    clearTimeout(guardarTimer);
    const f = () => cb.alGuardarProgreso(ej, w);
    if (inmediato) return f(); guardarTimer = setTimeout(f, 400);
  };
  const parar = () => { crono?.detener(); crono = null; };
  const senal = (tipo) => {
    const vib = { comienza: [150], termina: [200, 80, 200], descanso: [100, 60, 100], finDescanso: [250], cambio: [120, 60, 120, 60, 120] }[tipo];
    vibrar(vib);
  };

  // ---------- Estructura de la pantalla ----------
  raiz.innerHTML = `<section class="entreno" aria-live="polite">
    <div class="en-top">
      <div class="en-prog">
        <div class="en-prog-txt"><span id="en-ejercicio"></span><span id="en-pct"></span></div>
        <div class="progreso"><div class="barra" id="en-barra"></div></div>
      </div>
      <div class="en-iconos">
        ${vozDisponible() ? `<button type="button" class="btn mini sec" id="en-audio" aria-pressed="${prefs.audio}">${prefs.audio ? '🔊' : '🔇'}</button>` : ''}
        ${'vibrate' in navigator ? `<button type="button" class="btn mini sec" id="en-vib" aria-pressed="${prefs.vibracion}">${prefs.vibracion ? '📳' : '📴'}</button>` : ''}
        <button type="button" class="btn mini peligro" id="en-sintomas">⛔ Síntomas</button>
        <button type="button" class="btn mini sec" id="en-salir" aria-label="Salir del entrenamiento">✕</button>
      </div>
    </div>
    <div class="en-main" id="en-main"></div>
    <div class="en-controles" id="en-controles"></div>
  </section>`;
  const main = raiz.querySelector('#en-main');
  const controles = raiz.querySelector('#en-controles');

  function actualizarCabecera(p) {
    const orden = ordenGrupos();
    const n = p && !p.guiado ? orden.indexOf(p.grupo) + 1 : 0;
    const b = p ? w.bloques[p.bloqueIdx] : null;
    let txt = b ? b.titulo.toUpperCase() : 'ENTRENAMIENTO';
    if (p?.guiado && p.itemIdx != null) txt = `${b.titulo.toUpperCase()} ${p.itemIdx + 1} / ${b.items.length}`;
    else if (n) txt = `EJERCICIO ${n} / ${orden.length} · ${b.titulo.toUpperCase()}`;
    const pct = porcentaje();
    raiz.querySelector('#en-ejercicio').textContent = txt;
    raiz.querySelector('#en-pct').textContent = `ENTRENAMIENTO ${pct}%`;
    raiz.querySelector('#en-barra').style.width = `${pct}%`;
    if (!mitadAvisada && pct >= 50 && pct < 60) { mitadAvisada = true; mostrarFraseExtra('Ya llevas la mitad. ¡Sigue así!'); }
  }
  // "Cuida la rodilla: si molesta, para." Si una lesión declarada está en la zona que trabaja el ejercicio
  const NOMBRE_ZONA = { rodilla: 'la rodilla', tobillo: 'el tobillo', cadera: 'la cadera', espalda: 'la espalda', hombro: 'el hombro', codo: 'el codo', muneca: 'la muñeca', cuello: 'el cuello' };
  function cuidadoDe(p) {
    const e = ejercicioPorId[p.ejercicioId] || {}, lesiones = atleta.perfil?.riesgo?.lesiones || [];
    const zona = lesiones.find(l => (ZONAS_LESION[l] || []).includes(e.patron) && NOMBRE_ZONA[l]);
    return zona ? `Cuida ${NOMBRE_ZONA[zona]}: si molesta, para.` : '';
  }
  // "¿Te queda una más?": solo si no hay aviso médico ni ejercicio suave/guiado
  // Solo para quien puede: riesgo normal, fase 2 o más, menos de 65 años, día de recuperación normal, sin dolor en la sesión,
  // última serie de un ejercicio por series, de bajo impacto, sin barra, sin equilibrio y que no cargue una zona lesionada.
  const regaloPermitido = p => {
    const r = atleta.perfil?.riesgo || {}, e = ejercicioPorId[p.ejercicioId] || {};
    const zonas = (r.lesiones || []).flatMap(l => ZONAS_LESION[l] || ['*']);
    const ultima = p.serie === p.de && (!p.lado || p.lado === 'derecho');
    return r.nivel === 'normal' && (w.fase?.numero || 1) >= 2 && (atleta.personal?.edad || 0) < 65 && (w.recuperacion || 'normal') === 'normal'
      && !p.guiado && p.modo === 'reps' && p.formato === 'series' && ultima
      && e.impacto === 'bajo' && e.equipo !== 'barra' && !(e.evitarSi || []).includes('carga_axial_pesada') && !(e.capacidades || []).includes('equilibrio')
      && !zonas.includes('*') && !zonas.includes(e.patron) && !(e.evitarSi || []).some(x => (r.lesiones || []).includes(x))
      && !Object.values(ej.grupos || {}).some(g => g.feedback?.dolor === 'si');
  };
  function mostrarFraseExtra(t) { const el = main.querySelector('.en-frase'); if (el) el.textContent = t; }

  function botones(lista) {
    controles.innerHTML = lista.map(b => `<button type="button" class="btn ${b.clase || 'sec'} en-btn" data-acc="${b.acc}">${b.txt}</button>`).join('');
    lista.forEach(b => { controles.querySelector(`[data-acc="${b.acc}"]`).onclick = b.fn; });
  }
  const btnPausa = () => ({ acc: 'pausa', txt: '⏸️ PAUSA', fn: pausar });
  const btnCambiar = p => (p && p.tipo === 'ejercicio' && !p.guiado ? [{ acc: 'cambiar', txt: '🔄 CAMBIAR', fn: () => cambiarEjercicio(p) }] : []);

  // ¿Qué trabaja? y ¿por qué? (el cómo, la respiración y qué evitar van junto a la ilustración)
  function infoEjercicio(p, abierto = false) {
    const it = item(p);
    const e = ejercicioPorId[p.ejercicioId];
    if (!e) return '';
    const x = it?.explicacion || explicar({ ejercicioId: e.id }, w.bloques[p.bloqueIdx]);
    const musc = [...e.principal, ...e.secundarios].map(g => NOMBRES_GRUPO[g]).filter(Boolean);
    return `<details class="en-info"${abierto ? ' open' : ''}>
      <summary>¿Qué trabaja? · ¿Por qué?</summary>
      <div class="en-info-grid">
        <div><h4>¿Qué trabaja?</h4><p>${esc(musc.length ? musc.join(' · ') : x.trabaja)}</p></div>
        <div><h4>¿Por qué?</h4><p>${esc(x.sirve)}</p></div>
      </div>
    </details>`;
  }
  // Ilustración animada del ejercicio con la explicación al lado; y la disciplina del bloque
  const demostracion = p => htmlDemostracion(p.ejercicioId);
  // Quién guía cada bloque (Marcos en fuerza, Yanelis en cardio y boxeo…): se ve y se oye
  const quienDe = p => quienDisciplina(claveDisciplina(w.bloques[p.bloqueIdx] || {}));
  const disciplina = p => `${htmlQuien(quienDe(p), { compacto: true })}<span class="en-disciplina">${esc(textoDisciplina(disciplinaDe(w.bloques[p.bloqueIdx])))}</span>`;
  const pintar = html => { main.innerHTML = html; montarIlustraciones(main); };
  // Ejercicios (o rondas) de un bloque, cada uno con su ilustración en movimiento, dosis y músculos
  const listaEjercicios = b => b.formato === 'rondas'
    ? b.rondas.map(r => htmlFilaEjercicio(r.ejercicioId, { nombre: `Ronda ${r.numero}: ${r.combinacion}`, dosis: `${r.segundos / 60} min · ${r.foco}` })).join('')
    : b.items.map(it => htmlFilaEjercicio(it.ejercicioId, { nombre: it.nombre, dosis: textoDosis(it, b) })).join('');
  const objetivoTxt = p => p.tipo === 'ronda' ? formatoTiempo(p.segundos)
    : p.modo === 'reps' ? `${p.reps} REPETICIONES` : formatoTiempo(p.segundos);
  const contador = p => p.tipo === 'ronda' ? ''
    : p.tipo === 'intervalo' ? `INTERVALO ${p.serie} / ${p.de} · ${p.ritmo === 'vivo' ? 'RITMO VIVO' : 'SUAVE'}`
      : p.formato === 'circuito' ? `ESTACIÓN ${p.estacion} / ${p.estaciones} · VUELTA ${p.vuelta} / ${p.vueltas}`
        : p.guiado ? (p.de > 1 ? `SERIE ${p.serie} / ${p.de}` : '')
          : `SERIE ${p.serie} / ${p.de}`;

  // ---------- Navegación entre pasos ----------
  function irPaso(k, { desdeDescanso = false } = {}) {
    parar();
    i = k; ej.indice = k; guardar();
    const p = pasos[i];
    if (!p) return finalizar(true);
    if (w.bloques[p.bloqueIdx]) cambiarHablante(quienDe(p));
    actualizarCabecera(p);
    if (p.tipo === 'bloque') return pantallaBloque(p);
    if (p.tipo === 'descanso') return pantallaDescanso(p);
    // Paso activo
    if (esPrimeroDeGrupo(i)) return pantallaPreparar(p);
    if (p.guiado) return cuenta(5, p, () => pantallaActivo(p));
    if (p.formato === 'series' || p.formato === 'continuo') {
      if (desdeDescanso) return pantallaSiguienteSerie(p);
      return cuenta(5, p, () => pantallaActivo(p), p.lado ? 'Cambia de lado' : '');   // lado derecho tras el izquierdo
    }
    return pantallaActivo(p);   // circuitos, rondas, intervalos: sin parar
  }
  const siguientePaso = () => irPaso(i + 1);

  // ---------- Pantallas ----------
  function cuentaInicial() {
    const nums = [3, 2, 1];
    let k = 0;
    main.innerHTML = `<div class="en-cuenta-grande"><span id="en-n">3</span></div>`;
    botones([btnPausa()]);
    hablar('Tres');
    pitido(660, 0.15);
    crono = new Cronometro({ modo: 'cuenta_atras', segundos: 3.6, silencioso: true,
      alTic: v => {
        const n = Math.ceil(v - 0.6);
        if (n >= 1 && n < nums[k]) { k++; main.querySelector('#en-n').textContent = n; hablar(['', 'Uno', 'Dos', 'Tres'][n]); pitido(660, 0.15); }
        if (n <= 0 && main.querySelector('#en-n').textContent !== '¡COMENZAMOS!') {
          main.querySelector('#en-n').textContent = '¡COMENZAMOS!'; main.querySelector('.en-cuenta-grande').classList.add('vamos'); hablar('¡Comenzamos! Cansancio en el músculo, sí. Dolor en una articulación, mareo o dolor en el pecho, no: para y toca Síntomas.'); pitido(990, 0.3); senal('comienza');
        }
      },
      alTerminar: () => irPaso(i) });
    crono.iniciar();
  }

  function pantallaBloque(p) {
    const b = w.bloques[p.bloqueIdx];
    const num = p.bloqueIdx + 1;
    const d = disciplinaDe(b);
    pintar(`<div class="en-bloque">
      <span class="paso-num">Bloque ${num} de ${w.bloques.length}</span>
      <h1>${esc(b.titulo)}</h1>
      ${htmlQuien(quienDe(p), { texto: "Yo te guío en este bloque." })}
      <span class="en-disciplina">Disciplina: ${esc(textoDisciplina(d))}</span>
      <p class="en-sub">${b.minutos} min${b.resumen ? ` · ${esc(b.resumen)}` : ''}</p>
      ${b.intensidad ? `<p class="ayuda">${esc(b.intensidad)}</p>` : ''}
      <div class="en-filas">${listaEjercicios(b)}</div>
      <p class="en-auto">Empieza en <strong id="en-seg">5</strong> s</p>
    </div>`);
    botones([btnPausa(), { acc: 'ya', txt: '▶️ EMPEZAR YA', clase: '', fn: siguientePaso }]);
    hablar(`Bloque ${num}: ${b.titulo}. Disciplina: ${d.nombre}`);
    senal('cambio');
    crono = new Cronometro({ modo: 'cuenta_atras', segundos: 5, silencioso: true,
      alTic: v => { const el = main.querySelector('#en-seg'); if (el) el.textContent = Math.ceil(v); }, alTerminar: siguientePaso });
    crono.iniciar();
  }

  function pantallaPreparar(p) {
    const b = w.bloques[p.bloqueIdx];
    const lista = p.formato === 'circuito' || p.tipo === 'ronda' ? `<div class="en-circuito"><strong>${esc(b.resumen || '')}</strong><div class="en-filas">${listaEjercicios(b)}</div></div>` : '';
    pintar(`<div class="en-ejercicio">
      <span class="en-etq">${p.guiado ? esc(b.titulo.toUpperCase()) : 'PRÓXIMO EJERCICIO'}</span>
      ${disciplina(p)}
      <h1 class="en-nombre">${esc(p.tipo === 'ronda' ? 'Boxeo por rondas' : p.nombre)}</h1>
      <div class="en-meta">${esc(contador(p))}${p.lado ? ` · LADO ${p.lado.toUpperCase()}` : ''}</div>
      <div class="en-objetivo">${p.tipo === 'intervalo' ? `${p.de} INTERVALOS` : objetivoTxt(p)}</div>
      ${p.tempo ? `<div class="en-meta">${esc(p.tempo)}</div>` : ''}
      ${lista}
      ${demostracion(p)}
      ${p.tipo !== 'ronda' ? infoEjercicio(p, true) : ''}
    </div>`);
    botones([...btnCambiar(p), { acc: 'comenzar', txt: '▶️ COMENZAR', clase: 'grande', fn: () => cuenta(10, p, () => pantallaActivo(p)) }]);
    hablar(`${p.guiado ? b.titulo + '. ' : 'Siguiente ejercicio: '}${p.tipo === 'ronda' ? 'boxeo por rondas' : p.nombre}`);
  }

  function pantallaSiguienteSerie(p) {
    main.innerHTML = `<div class="en-ejercicio">
      <span class="en-etq">🔥 SIGUIENTE SERIE</span>
      ${disciplina(p)}
      <h1 class="en-nombre">${esc(p.nombre)}</h1>
      <div class="en-meta">${esc(contador(p))}${p.lado ? ` · LADO ${p.lado.toUpperCase()}` : ''}</div>
      <div class="en-objetivo">${objetivoTxt(p)}</div>
      ${p.serie === p.de ? '<p class="en-frase">¡Última serie!</p>' : ''}
    </div>`;
    botones([...btnCambiar(p), { acc: 'comenzar', txt: '▶️ COMENZAR', clase: 'grande', fn: () => cuenta(3, p, () => pantallaActivo(p)) }]);
    hablar(p.serie === p.de ? 'Última serie. Pulsa comenzar cuando estés listo.' : 'Siguiente serie. Pulsa comenzar cuando estés listo.');
  }

  // Cuenta atrás antes de empezar: 10…1 ¡VAMOS!
  function cuenta(n, p, luego, aviso = '') {
    parar();
    main.innerHTML = `<div class="en-cuenta">
      <span class="en-etq">${esc(aviso || (p.tipo === 'ronda' ? `RONDA ${p.serie}` : p.nombre.toUpperCase()))}</span>
      <span class="en-cuenta-num" id="en-n">${n}</span>
      <span class="en-sub">${p.combinacion ? flecha(p.combinacion) : 'Colócate en posición'}</span>
    </div>`;
    botones([btnPausa(), { acc: 'ya', txt: '⏭️ YA', fn: () => { parar(); luego(); } }]);
    let ultimo = n + 1;
    hablar(n >= 10 ? 'Diez segundos' : aviso || 'Prepárate');
    crono = new Cronometro({ modo: 'cuenta_atras', segundos: n, silencioso: true,
      alTic: v => {
        const s = Math.ceil(v);
        if (s < ultimo && s >= 1) {
          ultimo = s;
          const el = main.querySelector('#en-n'); if (el) el.textContent = s;
          if (s <= 3) pitido(660, 0.12);
          if (s <= 5 && NUMEROS[s] && s !== 10) hablar(NUMEROS[s]);
        }
      },
      alTerminar: () => {
        const el = main.querySelector('#en-n'); if (el) { el.textContent = '¡VAMOS!'; el.classList.add('vamos'); }
        pitido(990, 0.3); senal('comienza'); hablar('¡Vamos!');
        setTimeout(() => {
          if (terminado) return;
          if (pausado) { pendiente = luego; return; }
          luego();
        }, 600);
      } });
    crono.iniciar();
  }

  function pantallaActivo(p) {
    parar();
    const g = grupoReg(p);
    const inicioSerie = Date.now();
    const descansoPrevio = finUltimaSerie ? Math.round((inicioSerie - finUltimaSerie) / 1000) : null;
    const ultimaSerie = p.serie === p.de && !p.lado || (p.lado === 'derecho' && p.serie === p.de);
    const uCarga = U.unidadesDe(atleta).peso;
    const kgPrevio = g.series.filter(s => s.peso).pop()?.peso || pesoAnterior(atleta, p.ejercicioId) || null;
    const pesoPrevio = kgPrevio ? String(U.cargaEnUnidad(kgPrevio, uCarga)).replace('.', ',') : '';
    const reps = p.modo === 'reps';
    pintar(`<div class="en-ejercicio activo ${p.ritmo === 'suave' ? 'suave' : ''}">
      <span class="en-etq">${p.tipo === 'ronda' ? 'BOXEO' : 'EJERCICIO ACTUAL'}</span>
      ${disciplina(p)}
      <h1 class="en-nombre">${esc(p.tipo === 'ronda' ? `Ronda ${p.serie} de ${p.de}` : p.nombre)}</h1>
      ${reps && !p.guiado && p.formato === 'series'
        ? `<div class="en-serie">Serie ${p.serie} de ${p.de} · ${p.reps} repeticiones${p.lado ? ` · lado ${p.lado}` : ''}</div>`
        : contador(p) || p.lado ? `<div class="en-meta">${esc(contador(p))}${p.lado ? ` · LADO ${p.lado.toUpperCase()}` : ''}</div>` : ''}
      <div class="en-activo-grid">
      <div class="en-figura">${htmlIlustracion(p.ejercicioId, { contar: reps ? p.reps : 0, regalo: reps && regaloPermitido(p) })}</div>
      <div class="en-panel">
      ${p.combinacion ? `<div class="en-combo"><span class="en-etq">COMBINACIÓN</span><strong>${flecha(p.combinacion)}</strong><span class="ayuda">${esc(p.foco || '')}</span></div>` : ''}
      ${reps ? `${tieneIlustracion(p.ejercicioId) ? '' : `<div class="en-objetivo">${p.reps} REPETICIONES</div>`}
        <div class="en-reloj-peq">Tiempo <span id="en-t">0:00</span></div>
        <div class="en-registro-serie">
          <label class="en-paso"><span>Hechas</span>
            <button type="button" class="btn sec" data-d="-1" aria-label="Una menos">−</button>
            <output id="en-reps">${tieneIlustracion(p.ejercicioId) ? 0 : p.reps}</output>
            <button type="button" class="btn sec" data-d="1" aria-label="Una más">+</button></label>
          ${p.pesoAplicable ? `<label class="en-peso"><span>Peso</span><input type="text" inputmode="decimal" id="en-peso" value="${esc(pesoPrevio)}" placeholder="${uCarga}"><span class="unidad">${uCarga}</span></label>` : ''}
        </div>`
        : `<div class="en-reloj" id="en-t">${formatoTiempo(p.segundos)}</div>`}
      ${p.tempo ? `<div class="en-meta">${esc(p.tempo)}</div>` : ''}
      <p class="en-frase">${ultimaSerie && !p.guiado && p.formato === 'series' ? '¡Última serie!' : esc(p.guiado ? (p.nota || 'Movimiento suave y controlado.') : paraSexo(frase('trabajo'), atleta.personal?.sexo))}</p>
      </div>
      </div>
      ${htmlTecnica(p.ejercicioId)}
      ${p.tipo !== 'ronda' ? infoEjercicio(p) : ''}
    </div>`);
    if (reps) {
      // "Hechas" sigue a la figura hasta que la persona toca − o + (entonces manda ella)
      const conFigura = !!main.querySelector('.en-figura .ilustracion');
      let n = conFigura ? 0 : p.reps, tocado = false;
      // Cuenta conmigo: la figura hace las repeticiones al ritmo elegido y la voz las cuenta
      main.querySelector('.en-figura')?.addEventListener('repeticion', e => {
        if (pausado || document.querySelector('.modal-fondo')) return;
        const { n: k, meta } = e.detail;
        if (!tocado) { n = Math.min(k, meta); main.querySelector('#en-reps').textContent = n; }   // la de regalo solo cuenta si la persona toca +
        if (k >= meta) controles.querySelector('[data-acc="hecho"]')?.classList.add('late');
        const a = animoRepeticion(k, meta, atleta.personal?.sexo, { regalo: regaloPermitido(p), cuidado: p.serie === 1 && p.lado !== 'derecho' ? cuidadoDe(p) : '' });
        if (k >= meta) senal('cambio');
        if (a.fuerte) { mostrarFraseExtra(a.texto.replace(/^\d+\. /, '')); hablar(a.texto); } else hablar(a.texto, { interrumpir: false });
      });
      main.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { tocado = true; n = Math.max(0, n + Number(b.dataset.d)); main.querySelector('#en-reps').textContent = n; });
      botones([btnPausa(), { acc: 'saltar', txt: '⏭️ SALTAR', fn: () => saltar(p) }, ...btnCambiar(p),
        { acc: 'hecho', txt: '✓ SERIE COMPLETADA', clase: 'grande', fn: () => {
          const peso = U.kgDe(U.leerNumero(main.querySelector('#en-peso')?.value), uCarga) || null;
          // Sin tocar − / +: se toma la serie como hecha completa (aunque la figura no haya terminado de contar)
          if (!tocado) n = Math.max(n, p.reps);
          serieCompletada(p, { reps: n, segundos: Math.round(crono?.resultado() ?? (Date.now() - inicioSerie) / 1000), peso, descansoPrevio });
        } }]);
      hablar(`${p.nombre}. ${p.reps} repeticiones${p.lado ? ', lado ' + p.lado : ''}.`);
      crono = new Cronometro({ modo: 'cronometro', silencioso: true, alTic: v => { const el = main.querySelector('#en-t'); if (el) el.textContent = formatoTiempo(v); } });
    } else {
      let ultimo = Math.ceil(p.segundos) + 1;
      let fraseCada = 20;
      botones([btnPausa(), { acc: 'siguiente', txt: '⏭️ SIGUIENTE', fn: () => {
        const hechos = Math.round(crono?.resultado() ?? 0);
        serieCompletada(p, { segundos: hechos, descansoPrevio, parcial: hechos < p.segundos });
      } }, ...btnCambiar(p)]);
      if (p.combinacion) hablar(`Ronda ${p.serie}. ${p.combinacion.replace(/\+/g, ',')}`);
      else if (p.tipo === 'intervalo') hablar(p.ritmo === 'vivo' ? 'Ritmo vivo' : 'Ritmo suave, recupera');
      else if (!p.guiado || p.itemIdx === 0 || p.serie === 1) hablar(p.nombre);
      crono = new Cronometro({ modo: 'cuenta_atras', segundos: p.segundos, silencioso: true,
        alTic: v => {
          const el = main.querySelector('#en-t'); if (el) el.textContent = formatoTiempo(v);
          const s = Math.ceil(v);
          if (s < ultimo) {
            ultimo = s;
            if (s === 10 && p.segundos > 15) hablar('¡Diez segundos, con técnica y respirando!');
            if (p.segundos >= 30 && s === Math.round(p.segundos / 2) && !p.combinacion) hablar('Mitad hecha. Respira, no aguantes el aire.');
            if (s <= 5 && s >= 1) { pitido(660, 0.1); if (s <= 3) hablar(NUMEROS[s]); }
            if (p.combinacion && p.segundos - s === Math.round(p.segundos / 2)) hablar(p.combinacion.replace(/\+/g, ','));
            if (!p.guiado && p.segundos - s >= fraseCada && s > 8) { fraseCada += 20; mostrarFraseExtra(paraSexo(s <= 15 ? frase('final') : frase('trabajo'), atleta.personal?.sexo)); }
          }
        },
        alTerminar: () => serieCompletada(p, { segundos: p.segundos, descansoPrevio }) });
    }
    crono.iniciar();
  }

  function serieCompletada(p, datos) {
    parar();
    const g = grupoReg(p);
    g.ejercicioId = p.ejercicioId;
    g.series.push({ serie: p.serie || 1, lado: p.lado || null, vuelta: p.vuelta || null, reps: datos.reps ?? null, segundos: datos.segundos ?? null,
      peso: datos.peso ?? null, descansoPrevio: datos.descansoPrevio ?? null, hora: ahoraHora(), parcial: !!datos.parcial });
    if (!ej.hechos.includes(i)) ej.hechos.push(i);
    ej.segundosPaso[i] = datos.segundos ?? pasos[i].estimado;
    finUltimaSerie = Date.now();
    guardar();
    const fin = esFinDeGrupo(i);
    const rapido = p.guiado || p.formato === 'circuito' || p.tipo === 'intervalo';
    pitido(880, 0.2, rapido ? 1 : 2); senal('termina');
    if (!rapido) hablar(fin && p.pideFeedback ? 'Ejercicio completado' : 'Serie completada');
    main.innerHTML = `<div class="en-flash"><span>${rapido ? '✓' : '¡SERIE COMPLETADA!'}</span></div>`;
    controles.innerHTML = '';
    const accion = () => (fin && p.pideFeedback ? pantallaGrupoOk(p) : siguientePaso());
    setTimeout(() => {
      if (terminado) return;
      if (pausado) { pendiente = accion; return; }
      accion();
    }, rapido ? 500 : 1200);
  }

  function saltar(p) {
    parar();
    if (!ej.saltados.includes(i)) ej.saltados.push(i);
    guardar();
    if (esFinDeGrupo(i) && p.pideFeedback && grupoReg(p).series.length) return pantallaGrupoOk(p);
    // salta también el descanso que venía detrás
    let k = i + 1;
    while (pasos[k]?.tipo === 'descanso') k++;
    irPaso(k);
  }

  function pantallaDescanso(p) {
    const siguiente = pasos[i + 1];
    const aguaAhora = cb.pausasAgua && Date.now() - ultimaPausaAgua > 12 * 60e3;
    if (aguaAhora) ultimaPausaAgua = Date.now();
    let total = p.segundos;
    let ultimo = total + 1;
    pintar(`<div class="en-descanso">
      <span class="en-etq">DESCANSO${p.entreVueltas ? ' ENTRE VUELTAS' : p.entreRondas ? ' ENTRE RONDAS' : ''}</span>
      <div class="en-reloj" id="en-t">${formatoTiempo(total)}</div>
      <p class="en-frase">${esc(frase('descanso'))}</p>
      ${aguaAhora ? '<p class="en-agua">💧 Pausa para hidratarte si lo necesitas.</p>' : ''}
      ${siguiente && ACTIVOS.includes(siguiente.tipo) ? `<div class="en-proximo">${htmlIlustracion(siguiente.ejercicioId, { leyenda: false, mini: true, animar: true })}
        <div><span class="en-etq">A CONTINUACIÓN</span>
        <strong>${esc(siguiente.tipo === 'ronda' ? `Ronda ${siguiente.serie}: ${siguiente.combinacion}` : siguiente.nombre)}</strong>
        <span>${esc(contador(siguiente))}${siguiente.modo === 'reps' ? ` · ${siguiente.reps} repeticiones` : ` · ${formatoTiempo(siguiente.segundos)}`}</span></div></div>` : ''}
    </div>`);
    const terminar = () => {
      parar();
      ej.segundosPaso[i] = total;
      if (!ej.hechos.includes(i)) ej.hechos.push(i);
      pitido(990, 0.25); senal('finDescanso'); hablar('Prepárate');
      irPaso(i + 1, { desdeDescanso: true });
    };
    botones([
      { acc: 'menos', txt: '−15 s', fn: () => { crono.segundos = Math.max(crono.transcurrido + 1, crono.segundos - 15); total = crono.segundos; } },
      { acc: 'mas', txt: '+15 s', fn: () => { crono.segundos += 15; total = crono.segundos; ultimo = Math.ceil(crono.valor) + 1; } },
      btnPausa(),
      { acc: 'saltar', txt: '⏭️ SALTAR', fn: terminar },
    ]);
    hablar('Descansa'); senal('descanso');
    crono = new Cronometro({ modo: 'cuenta_atras', segundos: total, silencioso: true,
      alTic: v => {
        const el = main.querySelector('#en-t'); if (el) el.textContent = formatoTiempo(v);
        const s = Math.ceil(v);
        if (s < ultimo) { ultimo = s; if (s === 10 && total > 15) hablar('Diez segundos'); if (s <= 3 && s >= 1) { pitido(660, 0.1); hablar(NUMEROS[s]); } }
      },
      alTerminar: terminar });
    crono.iniciar();
  }

  function pantallaGrupoOk(p) {
    parar();
    const g = grupoReg(p);
    const siguienteIdx = (() => { let k = i + 1; while (pasos[k] && pasos[k].tipo === 'descanso' && pasos[k].grupo === p.grupo) k++; return k; })();
    const prox = pasos.slice(siguienteIdx).find(x => ACTIVOS.includes(x.tipo));
    const reps = g.series.map(s => s.reps).filter(x => x != null);
    const objetivoReps = g.objetivo.reps;
    const seg = g.series.reduce((a, s) => a + (s.segundos || 0), 0);
    const objetivoSeries = g.objetivo.series * (g.objetivo.porLado ? 2 : 1);
    const rendimiento = objetivoReps != null && reps.length
      ? Math.round((reps.reduce((a, b) => a + b, 0) / (objetivoReps * Math.max(objetivoSeries, reps.length))) * 100)
      : Math.round((g.series.length / Math.max(1, p.formato === 'series' ? objetivoSeries : pasos.filter(x => x.grupo === p.grupo && ACTIVOS.includes(x.tipo)).length)) * 100);
    const titulo = p.tipo === 'ronda' ? 'RONDAS COMPLETADAS' : p.formato === 'circuito' ? 'CIRCUITO COMPLETADO' : p.tipo === 'intervalo' || p.formato === 'continuo' ? 'CARDIO COMPLETADO' : 'EJERCICIO COMPLETADO';
    const descansoRec = p.descanso || 60;
    main.innerHTML = `<div class="en-completo">
      <span class="en-etq">✅ ${titulo}</span>
      <h1 class="en-nombre">${esc(g.nombre)}</h1>
      <div class="tiles en-stats">
        <div class="tile"><span class="tile-titulo">Series</span><span class="tile-valor">${g.series.length}${p.formato === 'series' ? ` / ${objetivoSeries}` : ''}</span></div>
        ${reps.length ? `<div class="tile"><span class="tile-titulo">Repeticiones</span><span class="tile-valor">${reps.join(' · ')}</span><span class="tile-extra">Objetivo: ${objetivoReps} por serie</span></div>` : ''}
        <div class="tile"><span class="tile-titulo">Tiempo</span><span class="tile-valor">${formatoTiempo(seg)}</span></div>
        <div class="tile"><span class="tile-titulo">Rendimiento</span><span class="tile-valor">${Math.min(100, rendimiento)}%</span></div>
      </div>
      <form id="en-fb" novalidate>
        <h3>¿Cómo te resultó?</h3>${chips({ ruta: 'sensacion', opciones: SENSACIONES_5, valor: g.feedback?.sensacion })}
        ${objetivoReps != null ? `<div class="pregunta"><span>¿Completaste las repeticiones?</span>${chips({ ruta: 'repsCompletas', valor: g.feedback?.repsCompletas ?? (reps.every(r => r >= objetivoReps) ? 'si' : 'no'), opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }] })}</div>` : ''}
        <div class="pregunta"><span>¿Tu técnica fue correcta?</span>${chips({ ruta: 'tecnica', valor: g.feedback?.tecnica, opciones: [{ id: 'si', etiqueta: 'Sí' }, { id: 'no', etiqueta: 'No' }, { id: 'no_seguro', etiqueta: 'No estoy seguro' }] })}</div>
        <div class="pregunta"><span>¿Sentiste dolor?</span>${chips({ ruta: 'dolor', valor: g.feedback?.dolor, opciones: [{ id: 'no', etiqueta: 'No' }, { id: 'si', etiqueta: 'Sí' }] })}</div>
      </form>
      <p class="error" id="en-err"></p>
      <div class="en-reposo">Descansando <strong id="en-t">0:00</strong> · recomendado ${formatoTiempo(descansoRec)}</div>
      ${prox ? `<div class="en-proximo"><span class="en-etq">PRÓXIMO EJERCICIO</span>
        <strong>${esc(prox.tipo === 'ronda' ? w.bloques[prox.bloqueIdx].titulo : prox.nombre)}</strong>
        <span>${esc(w.bloques[prox.bloqueIdx].titulo)} · ${prox.modo === 'reps' ? `${prox.de} × ${prox.reps}` : formatoTiempo(prox.segundos)}</span></div>` : ''}
    </div>`;
    const f = main.querySelector('#en-fb');
    activarChips(f, ruta => {
      if (ruta === 'dolor' && valorChips(f.querySelector('[data-ruta="dolor"]')) === 'si') { hablar('Detén el ejercicio.'); mostrarAlarma(); }
    });
    hablar(`${titulo.toLowerCase()}. ¿Cómo te resultó?`);
    crono = new Cronometro({ modo: 'cronometro', silencioso: true, alTic: v => { const el = main.querySelector('#en-t'); if (el) el.textContent = formatoTiempo(v);
      if (Math.round(v) === descansoRec) { pitido(990, 0.2); hablar('Descanso cumplido'); } } });
    crono.iniciar();
    botones([{ acc: 'siguiente', txt: prox ? '⏭️ SIGUIENTE EJERCICIO' : '🏁 FINALIZAR', clase: 'grande', fn: () => {
      const d = { sensacion: valorChips(f.querySelector('[data-ruta="sensacion"]')),
        repsCompletas: f.querySelector('[data-ruta="repsCompletas"]') ? valorChips(f.querySelector('[data-ruta="repsCompletas"]')) : null,
        tecnica: valorChips(f.querySelector('[data-ruta="tecnica"]')), dolor: valorChips(f.querySelector('[data-ruta="dolor"]')) };
      if (!d.sensacion || !d.tecnica || !d.dolor) { main.querySelector('#en-err').textContent = 'Responde cómo te resultó, la técnica y si hubo dolor.'; return; }
      g.feedback = d;
      guardar(true);
      senal('cambio');
      irPaso(siguienteIdx);
    } }]);
  }

  // ---------- Cambiar ejercicio ----------
  function cambiarEjercicio(p) {
    const estaba = !!crono?.corriendo;
    parar();
    const alts = alternativasPara(atleta, p.ejercicioId, w.lugar);
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal"><h2>Cambiar ejercicio</h2>
      <p class="ayuda">Alternativas para <strong>${esc(p.nombre)}</strong> que mantienen el objetivo muscular y respetan tu equipo y tus precauciones.</p>
      ${alts.length ? `<div class="en-alts">${alts.map(a => `<button type="button" class="tarjeta-ej" data-alt="${a.ejercicio.id}">
        ${htmlFilaEjercicio(a.ejercicio.id, { nota: a.motivo })}</button>`).join('')}</div>`
        : '<p>No hay alternativas apropiadas con tu equipamiento. Puedes saltar este ejercicio.</p>'}
      <div class="acciones"><button class="btn sec" data-cerrar>Volver</button></div></div>`;
    document.body.appendChild(fondo);
    montarIlustraciones(fondo);
    const cerrar = () => { fondo.remove(); estaba && !pausado ? irPaso(i) : irPaso(i); };
    fondo.querySelector('[data-cerrar]').onclick = cerrar;
    fondo.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { fondo.remove(); aplicarCambio(p, b.dataset.alt); });
  }

  function aplicarCambio(p, nuevoId) {
    const b = w.bloques[p.bloqueIdx];
    const it = b.items[p.itemIdx];
    const e = ejercicioPorId[nuevoId];
    const antes = it.ejercicioId;
    const nuevo = { ...it, ejercicioId: e.id, nombre: e.nombre, porLado: e.unilateral, cambiadoDe: antes,
      familia: atleta.progresion?.[e.familia]?.ejercicioId === e.id ? e.familia : undefined };
    if (b.formato === 'series') {
      const pr = prescribir(e.id, atleta.progresion?.[e.familia], atleta, { fase: w.fase?.numero || 1 });
      Object.assign(nuevo, { reps: pr.reps, segundos: pr.segundos, texto: `${it.series} × ${pr.reps ?? pr.segundos + ' s'}${e.unilateral ? ' por lado' : ''}` });
    }
    nuevo.explicacion = explicar(nuevo, b);
    b.items[p.itemIdx] = nuevo;
    // lo hecho con el ejercicio anterior se conserva aparte
    const g = ej.grupos[p.grupo];
    if (g) { if (g.series.length) ej.grupos[`${p.grupo}#${antes}`] = { ...g, cambiado: true }; delete ej.grupos[p.grupo]; }
    const ref = { bloqueIdx: p.bloqueIdx, itemIdx: p.itemIdx, serie: p.serie, vuelta: p.vuelta };
    pasos = secuenciaEjecucion(w);
    const k = pasos.findIndex(x => ACTIVOS.includes(x.tipo) && x.bloqueIdx === ref.bloqueIdx && x.itemIdx === ref.itemIdx && x.serie === ref.serie && (x.vuelta ?? null) === (ref.vuelta ?? null));
    i = k >= 0 ? k : i;
    guardar(true);
    hablar(`Cambiado a ${e.nombre}`);
    if (p.formato === 'series') pantallaPreparar(pasos[i]); else pantallaActivo(pasos[i]);
  }

  // ---------- Pausa, síntomas y salida ----------
  function pausar() {
    if (pausado || terminado) return;
    pausado = true; pausaDesde = Date.now();
    crono?.detener();
    pausarFiguras(true);
    window.speechSynthesis?.cancel?.();
    const capa = document.createElement('div');
    capa.className = 'modal-fondo en-pausa';
    capa.innerHTML = `<div class="modal"><h2>⏸️ Entrenamiento pausado</h2>
      <p class="ayuda">Tómate el tiempo que necesites. Nada se pierde.</p>
      <div class="acciones"><button class="btn sec" data-terminar>TERMINAR ENTRENAMIENTO</button><button class="btn grande" data-continuar>▶️ CONTINUAR</button></div></div>`;
    document.body.appendChild(capa);
    capa.querySelector('[data-continuar]').onclick = () => { capa.remove(); continuar(); };
    capa.querySelector('[data-terminar]').onclick = () => { capa.remove(); continuar(false); finalizar(false); };
  }
  function continuar(reanudarCrono = true) {
    if (!pausado) return;
    ej.pausadoSeg = (ej.pausadoSeg || 0) + Math.round((Date.now() - pausaDesde) / 1000);
    pausado = false;
    pausarFiguras(false);
    if (!reanudarCrono) { pendiente = null; guardar(); return; }
    if (pendiente) { const f = pendiente; pendiente = null; f(); }
    else if (crono) { crono.iniciar(); hablar('Continuamos'); }
    else irPaso(i);
    guardar();
  }

  function sintomas() {
    pausar();
    hablar('Detén el ejercicio.');
    mostrarAlarma();
  }

  // Modal de salida (también lo usa la app al intentar navegar a otra sección)
  function confirmarSalida(alSalir) {
    if (terminado) return alSalir?.();
    if (!pausado) pausar();
    document.querySelector('.en-pausa')?.remove();
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal"><h2>¿Quieres terminar el entrenamiento?</h2>
      <p>Tu progreso actual se guardará.</p>
      <div class="acciones en-salida">
        <button class="btn grande" data-r="seguir">CONTINUAR ENTRENANDO</button>
        <button class="btn sec" data-r="guardar">SALIR Y GUARDAR</button>
        <button class="btn sec" data-r="cancelar">CANCELAR ENTRENAMIENTO</button>
      </div></div>`;
    document.body.appendChild(fondo);
    fondo.addEventListener('click', async e => {
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (!r) return;
      if (r === 'seguir') { fondo.remove(); continuar(); return; }
      if (r === 'guardar') { fondo.remove(); continuar(false); await finalizar(false, { sinPantalla: !!alSalir }); alSalir?.(); return; }
      if (r === 'cancelar') {
        fondo.querySelector('.modal').innerHTML = `<h2>¿Cancelar el entrenamiento?</h2><p>No se guardará nada de esta sesión. Podrás empezarla de nuevo.</p>
          <div class="acciones"><button class="btn sec" data-r2="no">Volver</button><button class="btn peligro" data-r2="si">Sí, cancelar</button></div>`;
        fondo.querySelector('[data-r2="no"]').onclick = () => { fondo.remove(); continuar(); };
        fondo.querySelector('[data-r2="si"]').onclick = () => { fondo.remove(); terminar(); cb.alCancelar(alSalir); };
      }
    });
  }

  // ---------- Final ----------
  async function finalizar(completo, { sinPantalla = false } = {}) {
    if (terminado) return;
    parar();
    terminado = true;
    ej.fin = new Date().toISOString();
    ej.estado = completo ? 'completada' : 'incompleta';
    clearTimeout(guardarTimer);
    const resumen = resumenEjecucion(pasos, ej, atleta.personal?.peso);
    const mensajes = await cb.alFinalizar(ej, w, resumen);   // guarda y alimenta el motor
    terminar();
    if (sinPantalla) return;
    pantallaFinal(resumen, mensajes, completo);
  }

  function pantallaFinal(r, mensajes, completo) {
    actualizarCabecera(null);
    raiz.querySelector('.en-iconos').innerHTML = '';
    const cats = [['Fuerza', r.categorias.fuerza], ['Cardio', r.categorias.cardio], ['Core', r.categorias.core], ['Movilidad', r.categorias.movilidad]];
    const max = Math.max(1, ...cats.map(c => c[1]));
    hablar(completo ? '¡Entrenamiento completado! Excelente trabajo.' : 'Entrenamiento guardado.');
    pitido(990, 0.3, 3);
    main.innerHTML = `<div class="en-final">
      <div class="celebracion">${completo ? '🎉 ENTRENAMIENTO COMPLETADO' : '💾 ENTRENAMIENTO GUARDADO'}</div>
      <p class="en-mensaje">${esc(mensajeFinal(r.porcentaje))}</p>
      <div class="tiles">
        <div class="tile"><span class="tile-titulo">Duración</span><span class="tile-valor">${formatoTiempo(r.duracionSeg)}</span></div>
        <div class="tile"><span class="tile-titulo">Ejercicios</span><span class="tile-valor">${r.ejercicios}</span></div>
        <div class="tile"><span class="tile-titulo">Series</span><span class="tile-valor">${r.series}</span></div>
        <div class="tile"><span class="tile-titulo">Repeticiones</span><span class="tile-valor">${r.repeticiones}</span></div>
        <div class="tile"><span class="tile-titulo">Completado</span><span class="tile-valor">${r.porcentaje}%</span></div>
        ${r.calorias ? `<div class="tile"><span class="tile-titulo">Calorías</span><span class="tile-valor">≈ ${r.calorias} kcal</span><span class="tile-extra">Estimación aproximada (±30 %)</span></div>` : ''}
      </div>
      <h2>Hoy</h2>
      <div class="volumen">${cats.map(([n, v]) => `<div class="vol-fila"><span>${n}</span><code>${barraTexto(v, max)}</code><span class="ayuda">${Math.round(v)} min</span></div>`).join('')}</div>
      <h2>Lo que cambia para la próxima</h2>
      <ul class="razones">${(mensajes.length ? mensajes : ['Sin cambios: la próxima vez repetirás las mismas cargas para consolidar.']).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
      <h2>Cuéntanos un poco más</h2>
      <form id="en-final" novalidate>
        <h3>Esfuerzo de toda la sesión (1 = muy suave, 10 = máximo)</h3>${chips({ ruta: 'esfuerzo', numerico: true, opciones: Array.from({ length: 10 }, (_, k) => ({ id: k + 1, etiqueta: String(k + 1) })) })}
        <h3>¿Cómo terminaste de energía? (1–10)</h3>${chips({ ruta: 'energia', numerico: true, opciones: Array.from({ length: 10 }, (_, k) => ({ id: k + 1, etiqueta: String(k + 1) })) })}
        <label class="campo"><span class="campo-etiqueta">Comentarios (opcional)</span><textarea id="en-coment" rows="2" placeholder="Cómo te sentiste, qué te costó…"></textarea></label>
      </form>
    </div>`;
    const f = main.querySelector('#en-final');
    activarChips(f);
    botones([{ acc: 'guardar', txt: '✓ GUARDAR Y CONTINUAR', clase: 'grande', fn: async () => {
      const extra = { esfuerzo: valorChips(f.querySelector('[data-ruta="esfuerzo"]')), energia: valorChips(f.querySelector('[data-ruta="energia"]')), comentarios: f.querySelector('#en-coment').value.trim() };
      await cb.alCompletarFinal(extra);
      pantallaRecuperacion(r);
    } }]);
  }

  function pantallaRecuperacion(r) {
    const recs = recomendacionesRecuperacion(atleta, w, r, new Date(ej.fin), cb.metaAgua);
    main.innerHTML = `<div class="en-final">
      <span class="paso-num">Después del entrenamiento</span>
      <h1>Ahora toca recuperar</h1>
      <div class="recuperacion">${recs.map(x => `<div class="tile"><span class="tile-titulo">${x.icono} ${esc(x.titulo)}</span><span class="rec-texto">${esc(x.texto)}</span></div>`).join('')}
        ${cb.proximaComida ? `<div class="tile"><span class="tile-titulo">💪 Tu próxima comida</span><span class="rec-texto"><strong>${esc(cb.proximaComida.hora)}</strong> · ${esc(cb.proximaComida.nombre)}. Tu alimentación posterior al entrenamiento forma parte de tu recuperación.</span></div>` : ''}</div>
    </div>`;
    botones([{ acc: 'volver', txt: '🏠 VOLVER A HOY', clase: 'grande', fn: () => cb.alSalir() }]);
  }

  // ---------- Ciclo de vida ----------
  const antesDeCerrar = e => { if (!terminado) { guardar(true); e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', antesDeCerrar);
  function terminar() {
    terminado = true;
    parar();
    window.removeEventListener('beforeunload', antesDeCerrar);
    cb.registrarGuardia(null);
    bloqueoPantalla?.release?.();
  }
  cb.registrarGuardia(confirmarSalida);
  navigator.wakeLock?.request('screen').then(b => { bloqueoPantalla = b; }).catch(() => {});

  raiz.querySelector('#en-salir').onclick = () => confirmarSalida(null);   // al guardar, muestra el resumen final
  raiz.querySelector('#en-sintomas').onclick = sintomas;
  raiz.querySelector('#en-audio')?.addEventListener('click', e => {
    prefs.audio = !prefs.audio; configurarVoz(prefs.audio); configurarSenales({ sonido: prefs.audio });
    e.currentTarget.textContent = prefs.audio ? '🔊' : '🔇'; e.currentTarget.setAttribute('aria-pressed', prefs.audio); cb.alPrefs?.(prefs);
  });
  raiz.querySelector('#en-vib')?.addEventListener('click', e => {
    prefs.vibracion = !prefs.vibracion; configurarSenales({ vibracion: prefs.vibracion });
    e.currentTarget.textContent = prefs.vibracion ? '📳' : '📴'; e.currentTarget.setAttribute('aria-pressed', prefs.vibracion); cb.alPrefs?.(prefs);
  });

  window.scrollTo(0, 0);
  actualizarCabecera(pasos[i]);
  if (reanudando) { hablar('Reanudamos'); irPaso(i); } else { guardar(true); cuentaInicial(); }

  // Para pruebas y para la app: acceso al estado
  return () => { if (!terminado) { guardar(true); parar(); window.removeEventListener('beforeunload', antesDeCerrar); } };
}
