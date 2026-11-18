// Evaluación física inicial: lista de pruebas adaptadas y pantalla de cada prueba.

import { esc, chips, campo, activarChips, valorChips, leerFormulario, mostrarAlarma } from '../ui/componentes.js';
import { Cronometro, formatoTiempo } from '../ui/cronometro.js';
import { pruebasPara } from '../motor/pruebas.js';
import { evaluarRiesgo } from '../motor/seguridad.js';
import { ritmo } from '../motor/calculos.js';

const opcionesNum = (n, desde = 1) => Array.from({ length: n }, (_, i) => ({ id: i + desde, etiqueta: String(i + desde) }));

// Las 3 pruebas que bastan para empezar (fuerza de piernas, de brazos y el corazón); las demás son opcionales
const ESENCIALES = ['sentadillas', 'flexiones', 'cardio'];

const resumen = (id, r) => {
  if (!r) return '';
  switch (id) {
    case 'plancha': return `${r.seg} s`;
    case 'cardio': return r.metros ? `${r.metros} m` : r.minutos ? `${r.minutos} min` : '';
    case 'movilidad': return 'Registrada';
    case 'coordinacion': return 'Registrada';
    default: return `${r.reps} repeticiones`;
  }
};

export function vistaPruebas(raiz, atleta, { guardar, alTerminar, alVolver }) {
  atleta.estadoPruebas ??= {};
  const riesgo = evaluarRiesgo(atleta);
  const lista = pruebasPara(atleta, riesgo);
  let crono = null;

  const barraSeguridad = `<div class="barra-seguridad">
    <span>Tu seguridad primero</span>
    <button type="button" class="btn peligro" id="sintomas">⛔ Tengo síntomas</button>
  </div>`;
  const enlazarSintomas = () => raiz.querySelector('#sintomas').onclick = () => { crono?.detener(); mostrarAlarma(); };

  function pintarLista() {
    crono?.detener(); crono = null;
    if (!lista.length) {
      raiz.innerHTML = `<section class="pantalla">
        <h1>Evaluación física</h1>
        <div class="nota peligro">${esc(riesgo.mensaje)}</div>
        <ul>${riesgo.motivos.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
        <p>No haremos pruebas físicas por ahora. Tu nivel se calculará como principiante y se actualizará cuando tengas la valoración médica y repitas la evaluación.</p>
        <div class="navegacion">
          <button class="btn sec" id="volver">← Volver al cuestionario</button>
          <button class="btn" id="terminar">Ver mi perfil →</button>
        </div></section>`;
      raiz.querySelector('#volver').onclick = alVolver;
      raiz.querySelector('#terminar').onclick = alTerminar;
      return;
    }
    const tarjeta = p => {
      const est = atleta.estadoPruebas[p.id];
      return `<button type="button" class="tarjeta-prueba ${est || ''}" data-prueba="${p.id}">
        <span class="tp-titulo">${esc(p.titulo)}</span>
        <span class="tp-cap">${esc(p.capacidad)}</span>
        <span class="tp-estado">${est === 'hecha' ? '✅ ' + esc(resumen(p.id, atleta.pruebas[p.id])) : est === 'omitida' ? '⏭️ Omitida' : 'Pendiente'}</span>
      </button>`;
    };
    const basicas = lista.filter(p => ESENCIALES.includes(p.id)), otras = lista.filter(p => !ESENCIALES.includes(p.id));
    const faltan = basicas.filter(p => !atleta.estadoPruebas[p.id]).length;
    raiz.innerHTML = `<section class="pantalla">
      ${barraSeguridad}
      <div class="progreso"><div class="barra" style="width:100%"></div></div>
      <p class="paso-num">Para afinar tu plan</p>
      <h1>3 pruebas sencillas</h1>
      <p class="subtitulo">Unos 10 minutos, adaptadas a ti. No se trata de darlo todo: se trata de saber desde dónde partimos. Las puedes hacer otro día.</p>
      ${riesgo.mensaje ? `<div class="nota precaucion">${esc(riesgo.mensaje)}</div>` : ''}
      <div class="nota">Calienta 5 minutos antes (caminar, mover brazos y cadera). Ten agua a mano. Puedes hacer las pruebas en días distintos: todo queda guardado.</div>
      <div class="lista-pruebas">${basicas.map(tarjeta).join('')}</div>
      ${otras.length ? `<details class="mas-pruebas"><summary>Más pruebas (opcional)</summary><div class="lista-pruebas">${otras.map(tarjeta).join('')}</div></details>` : ''}
      <div class="navegacion">
        <button class="cq-capsula" id="volver">← Cuestionario</button>
        <button class="btn" id="terminar">${faltan ? 'Lo haré después →' : 'Ver mi plan →'}</button>
      </div></section>`;
    enlazarSintomas();
    raiz.querySelectorAll('[data-prueba]').forEach(b => b.onclick = () => pintarPrueba(lista.find(p => p.id === b.dataset.prueba)));
    raiz.querySelector('#volver').onclick = alVolver;
    raiz.querySelector('#terminar').onclick = alTerminar;
    window.scrollTo(0, 0);
  }

  function pintarPrueba(p) {
    const previo = atleta.pruebas[p.id] || {};
    const varianteInicial = previo.variante || previo.tipo || p.recomendada;
    const variantes = p.variantes?.filter(v => !p.permitidas || p.permitidas.includes(v.id));
    raiz.innerHTML = `<section class="pantalla">
      ${barraSeguridad}
      <h1>${esc(p.titulo)}</h1>
      <p class="subtitulo">Qué mide: ${esc(p.capacidad)}</p>
      <form id="form-prueba" novalidate>
        ${variantes ? `<h3>Variante</h3>
          ${chips({ ruta: 'variante', valor: varianteInicial, opciones: variantes.map(v => ({ id: v.id, etiqueta: v.etiqueta + (v.id === p.recomendada ? ' ★ recomendada' : '') })) })}
          <div class="nota" id="como"></div>` : ''}
        <h3>Cómo hacerla</h3>
        <ul class="instrucciones">${p.instrucciones.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <p><strong>Qué debes sentir:</strong> ${esc(p.sentir)}</p>
        <p class="aviso-parar">⚠️ ${esc(p.detener)}</p>
        <div id="registro"></div>
      </form>
      <p class="error" id="error" role="alert"></p>
      <div class="navegacion">
        <button type="button" class="btn sec" id="volver">← Volver</button>
        <button type="button" class="btn sec" id="omitir">Omitir</button>
        <button type="button" class="btn" id="guardar">Guardar resultado</button>
      </div></section>`;
    enlazarSintomas();
    const form = raiz.querySelector('#form-prueba');
    const variante = () => (variantes ? valorChips(form.querySelector('[data-ruta="variante"]')) : null);

    const pintarRegistro = () => {
      crono?.detener(); crono = null;
      const v = variantes?.find(x => x.id === variante());
      if (v) form.querySelector('#como').textContent = v.como;
      form.querySelector('#registro').innerHTML = htmlRegistro(p, v, previo);
      montarRegistro(p, v, form);
    };
    activarChips(form, ruta => { if (ruta === 'variante') pintarRegistro(); });
    pintarRegistro();

    raiz.querySelector('#volver').onclick = pintarLista;
    raiz.querySelector('#omitir').onclick = async () => {
      atleta.pruebas[p.id] = null; atleta.estadoPruebas[p.id] = 'omitida';
      await guardar(atleta); pintarLista();
    };
    raiz.querySelector('#guardar').onclick = async () => {
      crono?.detener();
      const datos = leerFormulario(form, {});
      const resultado = construirResultado(p, datos);
      if (typeof resultado === 'string') { raiz.querySelector('#error').textContent = resultado; return; }
      atleta.pruebas[p.id] = resultado; atleta.estadoPruebas[p.id] = 'hecha';
      await guardar(atleta); pintarLista();
    };
    window.scrollTo(0, 0);
  }

  function htmlRegistro(p, v, previo) {
    const reloj = (etiqueta, id = 'reloj') => `<div class="reloj" data-reloj="${id}">
      <div class="reloj-valor">0:00</div>
      <div class="reloj-botones"><button type="button" class="btn" data-acc="iniciar">▶ Iniciar</button>
      <button type="button" class="btn sec" data-acc="detener">■ Detener</button>
      <button type="button" class="btn sec" data-acc="reiniciar">↺</button></div>
      <span class="ayuda">${esc(etiqueta)}</span></div>`;
    switch (p.registro) {
      case 'reps':
        return `${v?.segundos ? reloj(`Cuenta atrás de ${v.segundos} segundos`) : ''}
          ${campo({ ruta: 'reps', etiqueta: 'Repeticiones con buena técnica', valor: previo.reps, tipo: 'number', min: 0 })}`;
      case 'tiempo':
        return `${reloj('Detén el reloj cuando pierdas la posición')}
          ${campo({ ruta: 'seg', etiqueta: 'Segundos mantenidos', valor: previo.seg, tipo: 'number', min: 0, unidad: 's' })}`;
      case 'cardio': {
        const esDistancia = v.id !== 'caminata1600';
        return `${reloj(v.segundos ? `Cuenta atrás de ${v.segundos / 60} minutos` : 'Cronometra tus 1,6 km')}
          ${esDistancia
            ? campo({ ruta: 'metros', etiqueta: 'Distancia recorrida', valor: previo.metros, tipo: 'number', unidad: 'm', min: 0 })
            : campo({ ruta: 'minutos', etiqueta: 'Tiempo en recorrer 1,6 km', valor: previo.minutos, tipo: 'number', unidad: 'min', paso: 0.1, min: 0 })}
          <div id="ritmo" class="ayuda"></div>
          ${campo({ ruta: 'fc', etiqueta: 'Pulso al terminar (opcional, si tienes reloj o pulsera)', valor: previo.fc, tipo: 'number', unidad: 'lpm' })}
          <h3>¿Qué tan duro fue? (1 = muy suave, 10 = máximo)</h3>
          ${chips({ ruta: 'rpe', opciones: opcionesNum(10), valor: previo.rpe, numerico: true })}`;
      }
      case 'escala':
        return p.items.map(it => `<div class="item-escala"><h3>${esc(it.titulo)}</h3><p class="ayuda">${esc(it.como)}</p>
          ${chips({ ruta: it.id, valor: previo[it.id], numerico: true, opciones: it.opciones.map((o, i) => ({ id: i + 1, etiqueta: o })) })}</div>`).join('');
      case 'coordinacion':
        return `<h3>Equilibrio sobre la pierna izquierda (máx. 45 s)</h3>${reloj('Detén al apoyar el pie', 'izq')}
          ${campo({ ruta: 'equilibrioIzq', etiqueta: 'Segundos pierna izquierda', valor: previo.equilibrioIzq, tipo: 'number', unidad: 's' })}
          <h3>Equilibrio sobre la pierna derecha (máx. 45 s)</h3>${reloj('Detén al apoyar el pie', 'der')}
          ${campo({ ruta: 'equilibrioDer', etiqueta: 'Segundos pierna derecha', valor: previo.equilibrioDer, tipo: 'number', unidad: 's' })}
          <h3>Coordinación: mano contraria a rodilla, 20 veces</h3>
          ${chips({ ruta: 'cruzado', valor: previo.cruzado, numerico: true, opciones: [{ id: 1, etiqueta: 'Me cuesta coordinar' }, { id: 2, etiqueta: 'Con algunos errores' }, { id: 3, etiqueta: 'Fluido, sin errores' }] })}
          <h3>Cambios de dirección</h3>
          ${chips({ ruta: 'direccion', valor: previo.direccion, numerico: true, opciones: [{ id: 1, etiqueta: 'Inseguro o pierdo el equilibrio' }, { id: 2, etiqueta: 'Algo torpe pero estable' }, { id: 3, etiqueta: 'Fluido y estable' }] })}`;
    }
  }

  function montarRegistro(p, v, form) {
    form.querySelectorAll('[data-reloj]').forEach(caja => {
      const id = caja.dataset.reloj;
      const destino = p.registro === 'tiempo' ? 'seg' : id === 'izq' ? 'equilibrioIzq' : id === 'der' ? 'equilibrioDer'
        : p.id === 'cardio' && v.id === 'caminata1600' ? 'minutos' : null;
      const cuentaAtras = !!v?.segundos && p.registro !== 'tiempo';
      const display = caja.querySelector('.reloj-valor');
      const r = new Cronometro({
        modo: cuentaAtras ? 'cuenta_atras' : 'cronometro',
        segundos: v?.segundos || 0,
        maximo: p.registro === 'coordinacion' ? 45 : null,
        alTic: val => { display.textContent = formatoTiempo(val); },
        alTerminar: seg => volcar(seg),
      });
      display.textContent = formatoTiempo(r.valor);
      const volcar = seg => {
        if (!destino) return;
        const input = form.querySelector(`[data-ruta="${destino}"]`);
        input.value = destino === 'minutos' ? (seg / 60).toFixed(1) : seg;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      caja.addEventListener('click', e => {
        const acc = e.target.closest('[data-acc]')?.dataset.acc;
        if (!acc) return;
        if (acc === 'iniciar') { if (crono && crono !== r) crono.detener(); crono = r; r.iniciar(); }
        if (acc === 'detener') { const seg = r.detener(); if (!cuentaAtras) volcar(seg); }
        if (acc === 'reiniciar') r.reiniciar();
      });
    });
    if (p.id === 'cardio') {
      const actualizar = () => {
        const d = leerFormulario(form, {});
        const metros = v.id === 'caminata1600' ? 1600 : d.metros;
        const minutos = v.id === 'caminata1600' ? d.minutos : v.segundos / 60;
        const rt = ritmo(minutos, metros);
        form.querySelector('#ritmo').textContent = rt ? `Ritmo: ${rt}` : '';
      };
      form.addEventListener('input', actualizar);
      actualizar();
    }
  }

  function construirResultado(p, d) {
    const variante = d.variante;
    switch (p.registro) {
      case 'reps':
        if (d.reps == null || d.reps < 0) return 'Escribe el número de repeticiones (puede ser 0).';
        return { variante, reps: Math.round(d.reps) };
      case 'tiempo':
        if (d.seg == null || d.seg < 0) return 'Escribe los segundos o usa el cronómetro.';
        return { variante, seg: Math.round(d.seg) };
      case 'cardio': {
        const v = p.variantes.find(x => x.id === variante);
        if (variante === 'caminata1600' ? !d.minutos : !d.metros) return variante === 'caminata1600' ? 'Escribe el tiempo.' : 'Escribe la distancia.';
        const metros = variante === 'caminata1600' ? 1600 : d.metros;
        const minutos = variante === 'caminata1600' ? d.minutos : v.segundos / 60;
        return { tipo: variante, metros, minutos, ritmo: ritmo(minutos, metros), fc: d.fc || null, rpe: d.rpe || null };
      }
      case 'escala': {
        if (p.items.some(it => !d[it.id])) return 'Elige una opción en cada zona.';
        return Object.fromEntries(p.items.map(it => [it.id, d[it.id]]));
      }
      case 'coordinacion': {
        if (d.equilibrioIzq == null && d.equilibrioDer == null && !d.cruzado && !d.direccion) return 'Registra al menos una de las pruebas.';
        const lim = x => (x == null ? null : Math.min(45, Math.round(x)));
        return { equilibrioIzq: lim(d.equilibrioIzq), equilibrioDer: lim(d.equilibrioDer), cruzado: d.cruzado || null, direccion: d.direccion || null };
      }
    }
  }

  pintarLista();
  return () => crono?.detener();
}
