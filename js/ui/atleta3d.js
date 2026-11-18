// ATLETA 3D: persona atlética de verdad (modelo MakeHuman CC0) que hace el ejercicio en movimiento
// y enciende los músculos que trabaja. Usa los mismos movimientos que las ilustraciones (figura.js → movimiento()).
//
// Modelo: assets/atleta-hombre.glb / atleta-mujer.glb (los fabrica Herramientas/crear_atletas.py).
// El color de cada vértice trae: R = cavidad (pliegues), G = definición esculpida según el mapa anatómico
// (1 = liso, 0 = fondo de un surco entre músculos) y B = zona neutra (cara, pezones, entrepierna: nunca se marca).
// El grupo muscular se calcula aquí al cargar, con el hueso que más mueve cada vértice. Maniquí sin ropa ni cara.
// El atleta mira hacia +Z; su izquierda es +X; arriba es +Y.

import * as THREE from '../vendor/three/three.module.min.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { movimiento, musculosDe, sexoDeFigura } from './figura.js';

export const GRUPOS_3D = ['ninguno', 'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'core', 'gluteos', 'cuadriceps', 'isquiotibiales', 'pantorrillas'];
const N = GRUPOS_3D.length;

// ---------- Grupo muscular de cada vértice ----------
// Medidas del cuerpo en reposo (metros): alturas de hombro, cadera, rodilla, tobillo…
function medidas(o) {
  const nombres = o.skeleton.bones.map(b => b.name);
  const p = n => new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[nombres.indexOf(n)].clone().invert());
  const hombro = p('upperarm_l'), cadera = p('thigh_l').y;
  return {
    hombro: hombro.y, brazo: hombro.distanceTo(p('lowerarm_l')), cadera, tobillo: p('foot_l').y, pechoAncho: Math.abs(hombro.x) * 0.62,
  };
}
// n = normal, c = posición (mirando hacia +Z, arriba +Y)
function grupoDe(base, n, c, r) {
  const delante = n.z > 0.25, detras = n.z < -0.25;
  switch (base) {
    case 'upperarm': return c.y > r.hombro - r.brazo * 0.3 ? 'hombros' : n.z > 0 ? 'biceps' : 'triceps';
    case 'clavicle': return n.z < 0.1 ? 'espalda' : 'hombros';
    case 'spine_03': return delante ? 'pecho' : 'espalda';
    case 'spine_02': case 'spine_01': return detras ? 'espalda' : 'core';
    case 'pelvis': return detras || (n.z < 0 && c.y < r.cadera) ? 'gluteos' : c.y > r.cadera - 0.04 ? 'core' : 'ninguno';
    case 'thigh': return c.y > r.cadera - 0.06 && n.z < -0.2 ? 'gluteos' : n.z > -0.15 ? 'cuadriceps' : 'isquiotibiales';
    case 'calf': return n.z < 0.2 && c.y > r.tobillo + 0.08 ? 'pantorrillas' : 'ninguno';
    case 'neck_01': return detras ? 'espalda' : 'ninguno';
    default: return 'ninguno';
  }
}
function clasificar(o) {
  const g = o.geometry, pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), col = g.getAttribute('color');
  const n = pos.count, id = new Float32Array(n), det = new Float32Array(n * 3), ropa = new Float32Array(n);
  const r = o.skeleton ? medidas(o) : null;
  const bases = o.skeleton ? o.skeleton.bones.map(b => b.name.replace(/_[lr]$/, '')) : [];
  const cabeza = new THREE.Box3();
  const m = o.bindMatrix, mn = new THREE.Matrix3().getNormalMatrix(m), c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    det[i * 3] = col ? col.getX(i) : 1; det[i * 3 + 1] = col ? col.getY(i) : 1; det[i * 3 + 2] = col ? col.getZ(i) : 0;
    ropa[i] = col && col.itemSize > 3 ? 1 - col.getW(i) : 0;
    if (!r || !si) continue;
    let mejor = 0, peso = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > peso) { peso = w; mejor = si.getComponent(i, k); } }
    const base = bases[mejor];
    c.fromBufferAttribute(pos, i).applyMatrix4(m); v.fromBufferAttribute(nor, i).applyMatrix3(mn).normalize();
    id[i] = GRUPOS_3D.indexOf(grupoDe(base, v, c, r));
    if (base === 'head') cabeza.expandByPoint(c);
  }
  g.setAttribute('musculo', new THREE.BufferAttribute(id, 1));
  g.setAttribute('detalle', new THREE.BufferAttribute(det, 3));
  g.setAttribute('ropa', new THREE.BufferAttribute(ropa, 1));
  if (col) g.deleteAttribute('color');
  if (!cabeza.isEmpty()) g.userData.cabeza = cabeza;
}

// Vecinos de cada vértice (formato compacto), a partir de los triángulos
function vecinosDe(g) {
  if (g.userData.vecinos) return g.userData.vecinos;
  const idx = g.index.array, n = g.getAttribute('position').count;
  const cuenta = new Uint32Array(n + 1);
  for (let i = 0; i < idx.length; i++) cuenta[idx[i] + 1] += 2;
  for (let i = 0; i < n; i++) cuenta[i + 1] += cuenta[i];
  const lista = new Uint32Array(cuenta[n]), pos = cuenta.slice(0, n);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    lista[pos[a]++] = b; lista[pos[a]++] = c; lista[pos[b]++] = a; lista[pos[b]++] = c; lista[pos[c]++] = a; lista[pos[c]++] = b;
  }
  return (g.userData.vecinos = { inicio: cuenta, lista });
}
// Zona del músculo que trabaja (principal) y de los que ayudan (secundario), con el borde suavizado: sin escalones
function zonaSuave(g, grupos, pasadas = 12) {   // bordes lisos, sin escalones
  const id = g.getAttribute('musculo').array, n = id.length, { inicio, lista } = vecinosDe(g);
  const ids = new Set(grupos.map(x => GRUPOS_3D.indexOf(x)).filter(i => i > 0));
  let z = new Float32Array(n), t = new Float32Array(n);
  for (let i = 0; i < n; i++) z[i] = ids.has(Math.round(id[i])) ? 1 : 0;
  for (let k = 0; k < pasadas; k++) {
    for (let i = 0; i < n; i++) {
      let s = z[i] * 2, c = 2;
      for (let j = inicio[i]; j < inicio[i + 1]; j++) { s += z[lista[j]]; c++; }
      t[i] = s / c;
    }
    [z, t] = [t, z];
  }
  return z;
}

// ---------- Carga del modelo (una vez por sexo) ----------
const modelos = {};
function cargarModelo(sexo) {
  modelos[sexo] ||= new GLTFLoader().loadAsync(`assets/atleta-${sexo}.glb`).then(g => {
    g.scene.traverse(o => { if (o.isSkinnedMesh) clasificar(o); });
    return g;
  });
  return modelos[sexo];
}
let puede3D = null;
export function hay3D() {
  if (puede3D == null) {
    try { const gl = document.createElement('canvas').getContext('webgl2'); puede3D = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { puede3D = false; }
  }
  return puede3D;
}

// ---------- Material: piel con la definición muscular + músculos encendidos ----------
// El color del músculo se pinta PRIMERO y la sombra de los surcos DESPUÉS: así el relieve se ve también dentro del rojo.
function prepararMaterial(mat, u) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPrin; attribute float aSec; attribute vec3 detalle; attribute float ropa;
        varying float vRopa; varying vec3 vBind; varying vec3 vNBind;
        varying float vPrin; varying float vSec; varying vec3 vDet; varying float vAbajo;`)
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
        // Cuánto mira la piel hacia abajo (entrepierna, axilas, bajo el mentón): ahí se rellena la luz
        vAbajo = clamp(-inverseTransformDirection(transformedNormal, viewMatrix).y, 0.0, 1.0);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPrin = aPrin; vSec = aSec; vDet = detalle; vRopa = ropa;
        // Posición y normal en reposo: la foto de la cara se dibuja pegada a la cabeza y se mueve con ella
        vBind = (bindMatrix * vec4(position, 1.0)).xyz; vNBind = normalize(mat3(bindMatrix) * normal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uColP; uniform vec3 uColS; uniform float uLatido;
        uniform float uDefK; uniform float uLinea; uniform vec3 uColLinea;
        uniform vec3 uColRopa; uniform vec3 uCaraMin; uniform vec3 uCaraMax; uniform sampler2D uFoto; uniform float uHayFoto;
        varying float vRopa; varying vec3 vBind; varying vec3 vNBind;
        varying float vPrin; varying float vSec; varying vec3 vDet; varying float vAbajo;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float cav = clamp(vDet.x, 0.0, 1.0), surco = 1.0 - clamp(vDet.y, 0.0, 1.0), neu = clamp(vDet.z, 0.0, 1.0);
        float tela = smoothstep(0.35, 0.65, vRopa);
        surco *= 1.0 - tela * 0.75;                                   // la tela suaviza los cortes del músculo
        // Cara: coordenadas sobre la cabeza (0..1 a lo ancho y a lo alto), solo en la parte de delante
        vec3 cMin = uCaraMin, cMax = uCaraMax, cTam = max(cMax - cMin, vec3(1e-4));
        vec2 q = vec2((vBind.x - (cMin.x + cMax.x) * 0.5) / cTam.x, (vBind.y - cMin.y) / cTam.y);
        float frente = smoothstep(0.15, 0.55, vNBind.z) * step(cMin.y, vBind.y) * step(cMin.z + cTam.z * 0.45, vBind.z);
        float prin = smoothstep(0.35, 0.65, vPrin), sec = smoothstep(0.35, 0.65, vSec) * (1.0 - prin);
        vec3 base = diffuseColor.rgb;
        base = mix(base, uColS, sec * 0.70);
        base = mix(base, uColP, prin * 0.95);
        // Sombra: pliegue del modelo + surcos del mapa anatómico (nunca en cara, pezones ni entrepierna)
        float pliegue = mix(0.62, 1.08, pow(cav, 1.4));
        float H = mix(clamp(pliegue - surco * uDefK, 0.0, 1.2), 1.0, neu);
        vec3 tinte = mix(vec3(0.66, 0.66, 0.70), vec3(0.55, 0.26, 0.24), prin);   // sombra gris suave, de escultura (como las referencias)
        base = mix(base, base * tinte, clamp((1.0 - H) * 1.4, 0.0, 1.0));
        base *= 1.0 + 0.08 * smoothstep(1.0, 1.08, pliegue) * (1.0 - neu);       // vientres un poco más claros
        // Línea fina en el fondo de cada surco, como en una ilustración de anatomía
        base = mix(base, mix(uColLinea, vec3(0.43, 0.07, 0.05), prin), smoothstep(0.35, 0.8, surco) * uLinea * (1.0 - neu));
        // Borde oscuro alrededor del músculo que trabaja (rojo) y de los que ayudan (amarillo): se distinguen de la piel
        base = mix(base, vec3(0.56, 0.10, 0.08), (smoothstep(0.25, 0.45, vPrin) - smoothstep(0.55, 0.75, vPrin)) * 0.7);
        base = mix(base, vec3(0.54, 0.32, 0.0), (smoothstep(0.25, 0.45, vSec) - smoothstep(0.55, 0.75, vSec)) * 0.6 * (1.0 - prin));
        // Short (y top) deportivo: tela gris carbón; el músculo que trabaja se nota como un brillo sobre la tela
        vec3 telaCol = uColRopa * mix(0.72, 1.12, pow(cav, 1.2));
        telaCol = mix(telaCol, mix(telaCol, uColP, 0.45), prin);
        telaCol = mix(telaCol, mix(telaCol, uColS, 0.30), sec);
        base = mix(base, telaCol, tela);
        // Foto de la persona proyectada sobre la forma de la cara (se adapta al relieve y se funde con la piel)
        if (uHayFoto > 0.5) {
          vec2 uv = vec2(q.x / 0.78 + 0.5, (q.y - 0.18) / 0.80);
          float ovalo = 1.0 - smoothstep(0.78, 1.0, length((uv - 0.5) * vec2(2.0, 2.0)));
          float m = ovalo * frente * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          vec3 foto = texture2D(uFoto, uv).rgb;
          base = mix(base, foto * mix(0.85, 1.05, pow(cav, 1.2)), m);
        }
        diffuseColor.rgb = base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.78, 0.42, smoothstep(0.98, 1.08, pliegue));   // pliegue mate, vientre satinado
        roughnessFactor = mix(roughnessFactor, 0.35, prin * 0.5);
        roughnessFactor = mix(roughnessFactor, 0.85, tela);   // la tela es mate`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // Latido del músculo que trabaja: un halo en el contorno; el interior sigue mostrando el relieve
        float fres = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0);
        totalEmissiveRadiance += uColP * prin * (0.10 + 0.22 * uLatido) * (0.4 + 0.6 * H)
                               + uColP * prin * fres * 0.55 * (0.5 + 0.5 * uLatido) + uColS * sec * 0.06
                               + diffuseColor.rgb * 0.28 * vAbajo;   // sin rincones oscuros (entrepierna, axilas)`);
  };
  mat.needsUpdate = true;
}

// Intensidad de la definición: el hombre más marcado, la mujer más suave (atlética, no culturista)
const DEFINICION = { hombre: { uDefK: 0.45, uLinea: 0.05 }, mujer: { uDefK: 0.32, uLinea: 0.03 } };   // atlético natural: volumen y sombra, la línea casi no se ve

const colorCSS = (nombre, porDefecto) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  try { return new THREE.Color(v || porDefecto); } catch { return new THREE.Color(porDefecto); }
};

// ---------- Del dibujo (2D) al espacio 3D ----------
// vista "lado": x del dibujo = hacia delante (+Z); vista "frente": x del dibujo = izquierda de la persona (+X)
const a3D = (vista, v) => (vista === 'lado' ? new THREE.Vector3(0, -v[1], v[0]) : new THREE.Vector3(v[0], -v[1], 0));
const dir2D = ang => [Math.sin(ang * Math.PI / 180), Math.cos(ang * Math.PI / 180)];
const resta2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

// Lado del cuerpo de cada extremidad del dibujo → sufijo del hueso
const LADOS = { lado: { C: 'r', L: 'l' }, frente: { D: 'r', I: 'l' } };

// foto: la cara de la persona (dataURL) sobre la cara del modelo; velocidad(): ritmo elegido (1 = normal)
export function montarAtleta3D(cont, id, { sexo = sexoDeFigura(), alRepeticion = null, alFase = null, foto = null, velocidad = () => 1 } = {}) {
  const mov = movimiento(id);
  if (!mov || !hay3D()) return null;
  const musc = musculosDe(id);
  const vista = mov.vista;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(3, window.devicePixelRatio || 1));   // calidad Full HD: toda la resolución de la pantalla
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;                       // respeta el color carne
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'atleta3d-lienzo';
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });   // nítido: más píxeles, mismo tamaño en pantalla
  cont.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 4 / 3, 0.05, 50);

  // Luz de "foto de gimnasio": la principal alta y rasante marca cada músculo. Las luces giran con la cámara
  // (posiciones medidas desde la cámara, que mira desde +Z), así el relieve no desaparece al girar con el dedo.
  escena.add(new THREE.HemisphereLight(0xffffff, 0x7a6458, 0.45));
  const luces = new THREE.Group(); escena.add(luces);
  const clave = new THREE.DirectionalLight(0xfff4e8, 3.0);
  clave.position.set(-2.2, 4.2, 2.6); clave.castShadow = true;
  clave.shadow.mapSize.set(2048, 2048); clave.shadow.camera.left = -2.5; clave.shadow.camera.right = 2.5; clave.shadow.camera.top = 2.5; clave.shadow.camera.bottom = -1;
  clave.shadow.bias = -0.0005; clave.shadow.normalBias = 0.02;
  const relleno = new THREE.DirectionalLight(0xdde6ff, 0.35); relleno.position.set(3.0, 0.8, 2.2);
  const bordeA = new THREE.DirectionalLight(0xffffff, 1.6); bordeA.position.set(2.6, 2.4, -3.2);
  const bordeB = new THREE.DirectionalLight(0xffe3cc, 1.0); bordeB.position.set(-3.0, 2.0, -2.4);
  luces.add(clave, relleno, bordeA, bordeB);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.28 }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);

  const u = {
    uColP: { value: colorCSS('--fig3d-musculo', '#ff6a13') }, uColS: { value: colorCSS('--fig-m2', '#e48a2e') }, uLatido: { value: 0 },
    uColRopa: { value: new THREE.Color('#2b2e35') }, uCaraMin: { value: new THREE.Vector3() }, uCaraMax: { value: new THREE.Vector3() },
    uFoto: { value: null }, uHayFoto: { value: 0 },
    uDefK: { value: DEFINICION[sexo]?.uDefK ?? 0.5 }, uLinea: { value: DEFINICION[sexo]?.uLinea ?? 0.3 }, uColLinea: { value: new THREE.Color('#8c4a33') },
  };
  // Foto de la persona: se proyecta sobre la cara en el sombreador (sin foto, cara lisa de maniquí)
  if (foto) {
    const tex = new THREE.TextureLoader().load(foto);
    tex.colorSpace = THREE.SRGBColorSpace;
    u.uFoto.value = tex; u.uHayFoto.value = 1;
  }

  let vivo = true, rig = null, cuadro = 0;
  // Giro con el dedo: arrastrar a los lados rota la cámara alrededor del atleta
  const vistaBase = vista === 'lado' ? -Math.PI / 2 + 0.55 : 0.55;   // tres cuartos (≈31°): luce el volumen de los músculos
  let giro = 0, arrastre = null;
  renderer.domElement.addEventListener('pointerdown', e => { arrastre = { x: e.clientX, g: giro }; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => { if (arrastre) giro = arrastre.g + (e.clientX - arrastre.x) * 0.012; });
  renderer.domElement.addEventListener('pointerup', () => { arrastre = null; });

  cargarModelo(sexo).then(g => {
    if (!vivo) return;
    const modelo = g.scene.clone(true);
    // clone() comparte el esqueleto: se vuelve a enlazar para que cada vista se mueva sola
    const huesos = {};
    modelo.traverse(o => { if (o.isBone) huesos[o.name] = o; });
    modelo.traverse(o => {
      if (o.isSkinnedMesh) {
        o.skeleton = new THREE.Skeleton(o.skeleton.bones.map(b => huesos[b.name]), o.skeleton.boneInverses);
        o.bind(o.skeleton, o.bindMatrix);
        // Geometría propia de esta figura (comparte los datos del modelo) con sus zonas de músculo suavizadas
        const base = o.geometry;
        if (base.getAttribute('musculo')) {
          const g2 = new THREE.BufferGeometry();
          g2.setIndex(base.index);
          for (const [k, a] of Object.entries(base.attributes)) g2.setAttribute(k, a);
          g2.setAttribute('aPrin', new THREE.BufferAttribute(zonaSuave(base, musc.principal), 1));
          g2.setAttribute('aSec', new THREE.BufferAttribute(zonaSuave(base, musc.secundario), 1));
          g2.userData = base.userData;
          o.geometry = g2;
          const cab = base.userData.cabeza;
          if (cab) { u.uCaraMin.value.copy(cab.min); u.uCaraMax.value.copy(cab.max); }
        }
        // Color carne (o el del estilo)
        o.material = new THREE.MeshStandardMaterial({ color: colorCSS('--fig3d-cuerpo', '#f2f1ef'), roughness: 0.55, metalness: 0 });
        if (o.geometry.getAttribute('aPrin')) prepararMaterial(o.material, u);
        o.castShadow = true; o.frustumCulled = false;
      }
    });
    escena.add(modelo);
    modelo.updateMatrixWorld(true);
    rig = prepararRig(huesos, modelo);
    encuadrar();
  }).catch(e => { error = String(e?.stack || e); console.error('Atleta 3D:', e); });
  let error = null;

  // ---- Esqueleto: dirección de reposo de cada hueso (hacia su hijo) ----
  function prepararRig(H, raiz) {
    const pos = n => H[n].getWorldPosition(new THREE.Vector3());
    const reposo = {};
    for (const [n, b] of Object.entries(H)) reposo[n] = b.quaternion.clone();
    const pierna = pos('thigh_l').distanceTo(pos('calf_l')) + pos('calf_l').distanceTo(pos('foot_l'));
    const s = pierna / 76;   // 76 = muslo + pierna del dibujo
    const holgura = { foot_l: pos('foot_l').y, foot_r: pos('foot_r').y, ball_l: pos('ball_l').y, ball_r: pos('ball_r').y,
      hand_l: 0.025, hand_r: 0.025, lowerarm_l: 0.04, lowerarm_r: 0.04, calf_l: 0.055, calf_r: 0.055,
      pelvis: 0.09, spine_02: 0.11, spine_03: 0.11, head: 0.1, upperarm_l: 0.06, upperarm_r: 0.06 };
    return { H, raiz, reposo, s, holgura, ajuste: 0 };
  }

  const qTmp = new THREE.Quaternion(), qPadre = new THREE.Quaternion(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  // Gira el hueso para que apunte (en el mundo) hacia "dirección", desde su postura de reposo
  function apuntar(nombre, hijo, direccion) {
    const H = rig.H, b = H[nombre], c = H[hijo];
    if (!b || !c || !direccion) return;
    b.updateMatrixWorld(true);
    b.getWorldPosition(vA); c.getWorldPosition(vB);
    const actual = vB.sub(vA).normalize();
    const q = qTmp.setFromUnitVectors(actual, direccion.clone().normalize());
    const mundo = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
    b.parent.getWorldQuaternion(qPadre);
    b.quaternion.copy(qPadre.invert().multiply(mundo));
    b.updateMatrixWorld(true);
  }

  // Altura del punto más bajo del cuerpo (contando la carne bajo cada hueso de apoyo)
  function piso() {
    let m = Infinity;
    for (const [n, h] of Object.entries(rig.holgura)) { const b = rig.H[n]; if (b) m = Math.min(m, b.getWorldPosition(vA).y - h); }
    return m;
  }
  // Apoyo: como en el dibujo, el cuerpo toca el suelo (o el apoyo elevado). En ejercicios "en el suelo"
  // se apoya en cada instante; en los demás se fija con la postura inicial (así los saltos sí despegan).
  const elevado = (mov.spec.elevado || 0);
  const apoyoCadaCuadro = mov.spec.ancla === 'suelo';

  function posar({ J, de, a, f }) {
    const { H, reposo, s } = rig;
    rig.raiz.position.y = 0;
    for (const [n, q] of Object.entries(reposo)) H[n].quaternion.copy(q);
    // Cadera: el punto medio de las caderas va donde está la cadera del dibujo
    const cad = a3D(vista, J.cadera).multiplyScalar(s);
    H.pelvis.position.set(0, 0, 0);
    rig.raiz.updateMatrixWorld(true);
    const ahora = H.thigh_l.getWorldPosition(new THREE.Vector3()).add(H.thigh_r.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
    const p0 = H.pelvis.getWorldPosition(new THREE.Vector3());
    const destinoPelvis = cad.clone().add(p0.sub(ahora));
    H.pelvis.parent.updateMatrixWorld(true);
    H.pelvis.position.copy(H.pelvis.parent.worldToLocal(destinoPelvis));
    // Columna: el ángulo del tronco a lo largo de la espalda (de la pelvis al pecho)
    const columna = u => a3D(vista, dir2D(J.tronco.angU(u)));
    apuntar('pelvis', 'spine_01', columna(0.05));
    apuntar('spine_01', 'spine_02', columna(0.35));
    apuntar('spine_02', 'spine_03', columna(0.6));
    apuntar('spine_03', 'neck_01', columna(0.88));
    apuntar('neck_01', 'head', a3D(vista, dir2D(J.th)));
    const lados = LADOS[vista];
    for (const [k, x] of Object.entries(J.brazos)) {
      const l = lados[k];
      apuntar(`upperarm_${l}`, `lowerarm_${l}`, a3D(vista, resta2(x.medio, x.raiz)));
      apuntar(`lowerarm_${l}`, `hand_${l}`, a3D(vista, resta2(x.fin, x.medio)));
      apuntar(`hand_${l}`, `middle_01_${l}`, a3D(vista, x.mano != null ? dir2D(x.mano) : resta2(x.fin, x.medio)));
    }
    for (const [k, q] of Object.entries(J.piernas)) {
      const l = lados[k];
      apuntar(`thigh_${l}`, `calf_${l}`, a3D(vista, resta2(q.medio, q.raiz)));
      apuntar(`calf_${l}`, `foot_${l}`, a3D(vista, resta2(q.fin, q.medio)));
      if (vista === 'lado') apuntar(`foot_${l}`, `ball_${l}`, a3D(vista, dir2D(q.pie)));
    }
    rig.raiz.updateMatrixWorld(true);
    rig.raiz.position.y = apoyoCadaCuadro ? elevado * s - piso() : rig.ajuste;
    rig.raiz.updateMatrixWorld(true);
    // Latido del músculo en la fase de esfuerzo (al ir de la postura inicial a la final)
    u.uLatido.value = de !== a ? Math.sin(Math.PI * f) : 0;
  }

  // Encuadre: cámara a la distancia justa para ver todo el movimiento
  let centro = new THREE.Vector3(0, 0.9, 0), radio = 1.2;
  function encuadrar() {
    rig.ajuste = 0;
    posar(mov.postura(0));
    rig.ajuste = elevado * rig.s - piso();
    const caja = new THREE.Box3();
    const n = 12;
    for (let i = 0; i <= n; i++) {
      posar(mov.en(mov.total * i / n));
      rig.raiz.updateMatrixWorld(true);
      for (const b of Object.values(rig.H)) caja.expandByPoint(b.getWorldPosition(new THREE.Vector3()));
    }
    caja.expandByScalar(0.06);
    caja.min.y = Math.min(caja.min.y, 0);
    caja.getCenter(centro);
    tam = caja.getSize(new THREE.Vector3());
    centro.y += tam.y * 0.18;   // la figura baja un poco: la cabeza no queda debajo del anillo del contador
    radio = Math.max(tam.length() / 2, 0.8);
  }
  let tam = new THREE.Vector3(1, 1.8, 1);

  // El tiempo del movimiento avanza al ritmo elegido y solo cuando el atleta ya está listo
  const reloj = new THREE.Clock();
  let t = 0, ultimaVuelta = 0;
  // Se dibuja a unas 30 imágenes por segundo y solo cuando se ve en pantalla (ahorra batería en el teléfono)
  let visible = true, ultimoCuadro = 0;
  const vigia = 'IntersectionObserver' in window ? new IntersectionObserver(e => { visible = e.some(x => x.isIntersecting); }) : null;
  vigia?.observe(cont);
  function dibujar(ahora = 0) {
    if (!vivo) return;
    if (!renderer.domElement.isConnected) { destruir(); return; }
    requestAnimationFrame(dibujar);
    if (!visible || document.hidden || ahora - ultimoCuadro < 32) { if (!visible || document.hidden) reloj.getDelta(); return; }
    ultimoCuadro = ahora;
    const w = cont.clientWidth, h = cont.clientHeight || w * 0.75;
    if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); }
    const dt = Math.min(0.5, reloj.getDelta());   // en teléfonos lentos el movimiento sigue a tiempo real
    if (rig) {
      t += dt * velocidad();
      const fase = mov.en(t);
      posar(fase);
      alFase?.(fase.de, fase.a);
      const vuelta = Math.floor(t / mov.total);
      if (vuelta !== ultimaVuelta) { ultimaVuelta = vuelta; alRepeticion?.(vuelta); }
    }
    // Distancia justa para que el cuerpo llene el cuadro (por alto y por ancho)
    const tg = Math.tan((camara.fov * Math.PI / 180) / 2), ancho = Math.max(tam.x, tam.z);
    const ang = vistaBase + giro, d = Math.max(tam.y / 2 / tg, ancho / 2 / (tg * camara.aspect)) * 1.1 + ancho * 0.35;   // la figura llena el cuadro (con aire arriba para el contador)
    // A la altura del pecho (en ejercicios de suelo, más baja para ver pecho y brazos)
    camara.position.set(centro.x + Math.sin(ang) * d * 0.98, centro.y + d * (apoyoCadaCuadro ? 0.06 : 0.10), centro.z + Math.cos(ang) * d * 0.98);
    luces.rotation.y = ang;   // la luz acompaña a la cámara
    camara.lookAt(centro);
    renderer.render(escena, camara);
    cuadro++;
  }
  dibujar();

  function destruir() {
    vivo = false;
    vigia?.disconnect();
    u.uFoto.value?.dispose();
    // Se liberan foto, materiales y geometría (three la vuelve a subir si otra figura la usa)
    escena.traverse(o => { if (o.isMesh) { o.material?.map?.dispose(); o.material?.dispose?.(); o.geometry?.dispose(); } });
    renderer.dispose();
    renderer.forceContextLoss();   // el teléfono solo admite unos pocos lienzos 3D a la vez
  }
  // Diagnóstico (pruebas): dónde está la cámara, el centro y el cuerpo
  const info = () => {
    const caja = new THREE.Box3();
    escena.traverse(o => { if (o.isSkinnedMesh) { o.computeBoundingBox?.(); caja.expandByObject(o); } });
    const p = rig ? rig.H.pelvis.getWorldPosition(new THREE.Vector3()) : null;
    return { escala: rig?.s, centro: centro.toArray().map(x => +x.toFixed(2)), radio: +radio.toFixed(2), camara: camara.position.toArray().map(x => +x.toFixed(2)),
      pelvis: p?.toArray().map(x => +x.toFixed(2)), cabeza: rig ? rig.H.head.getWorldPosition(new THREE.Vector3()).toArray().map(x => +x.toFixed(3)) : null, cuerpo: [caja.min.toArray().map(x => +x.toFixed(2)), caja.max.toArray().map(x => +x.toFixed(2))], huesos: rig ? Object.keys(rig.H).length : 0 };
  };
  return { destruir, cuadros: () => cuadro, vuelta: () => ultimaVuelta, listo: () => !!rig || !!error, info: () => ({ error, ...info() }) };
}
