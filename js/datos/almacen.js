// Almacenamiento local en el dispositivo (IndexedDB).
// Todas las fases futuras guardan aquí: cada tipo de dato tiene su "almacén".
// Para agregar uno nuevo: sumar 1 a VERSION y añadirlo en ALMACENES.

const NOMBRE_BD = 'la-forja';
const VERSION = 3;   // 2 = FASE 4 (nutrición, hidratación, sueño y recuperación) · 3 = pasos

// almacén -> índices (campo por el que se busca)
export const ALMACENES = {
  atletas: [],
  mediciones: ['atletaId'],        // peso y medidas corporales a lo largo del tiempo
  evaluaciones: ['atletaId'],      // cada evaluación física completa (inicial y reevaluaciones)
  retos: ['atletaId'],             // retos/objetivos por etapas
  // Preparados para las siguientes fases:
  sesiones: ['atletaId'],          // entrenamientos realizados
  retroalimentacion: ['atletaId'], // respuestas de "¿Cómo te fue?"
  registrosDiarios: ['atletaId'],  // sueño, fatiga, dolor muscular, energía
  ajustes: [],                     // preferencias de la app
  // FASE 4: nutrición, hidratación, sueño y recuperación
  nutrition_profiles: ['atletaId'],         // objetivo nutricional, número y horario de comidas, presupuesto, días de entreno
  nutrition_plans: ['atletaId'],            // energía y nutrientes orientativos calculados (historial)
  meal_plans: ['atletaId'],                 // un plan por semana (4 semanas = plan mensual)
  meals: ['atletaId', 'mealPlanId'],        // cada comida planificada o registrada
  meal_items: ['atletaId', 'mealId'],       // alimentos y porciones de cada comida
  food_preferences: ['atletaId'],           // omnívoro/vegetariano/vegano, cultura, favoritos
  food_restrictions: ['atletaId'],          // alimentos rechazados o de bajo consumo
  allergies: ['atletaId'],                  // alergias declaradas (tienen prioridad absoluta)
  hydration_goals: ['atletaId'],            // configuración de la meta de agua
  hydration_logs: ['atletaId'],             // cada registro de agua: cantidad, fecha y hora
  sleep_goals: ['atletaId'],                // horario objetivo y recordatorio de sueño
  sleep_logs: ['atletaId'],                 // cada noche registrada
  recovery_logs: ['atletaId'],              // puntuación orientativa de recuperación por día
  supplements: ['atletaId'],                // suplementos que el usuario decide registrar
  supplement_reminders: ['atletaId'],       // recordatorios de esos suplementos
  supplement_logs: ['atletaId'],            // cada toma marcada ("ya la tomé"): fecha y hora
  shopping_lists: ['atletaId'],             // lista de compras por semana
  shopping_list_items: ['atletaId', 'listaId'],
  steps: ['atletaId'],                      // pasos de cada día: { fecha, app, manual }
};

let conexion = null;

// Quien quiera enterarse de los cambios (la copia en la nube del seguimiento) se apunta aquí
let vigilante = null;
export const vigilarCambios = fn => { vigilante = fn; };
const avisar = (tipo, almacen, ids) => { try { vigilante?.(tipo, almacen, ids); } catch {} };

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((resolver, rechazar) => {
    const pet = indexedDB.open(NOMBRE_BD, VERSION);
    pet.onupgradeneeded = () => {
      const bd = pet.result;
      for (const [nombre, indices] of Object.entries(ALMACENES)) {
        const almacen = bd.objectStoreNames.contains(nombre)
          ? pet.transaction.objectStore(nombre)
          : bd.createObjectStore(nombre, { keyPath: 'id' });
        for (const campo of indices) {
          if (!almacen.indexNames.contains(campo)) almacen.createIndex(campo, campo);
        }
      }
    };
    pet.onsuccess = () => { const bd = pet.result; bd.onversionchange = () => { bd.close(); conexion = null; }; resolver(bd); };
    pet.onblocked = () => alert('LA FORJA se actualizó. Cierra las otras ventanas o pestañas de LA FORJA para continuar.');
    pet.onerror = () => rechazar(pet.error);
  });
  return conexion;
}

async function operar(almacen, modo, accion) {
  const bd = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(almacen, modo);
    const pet = accion(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(pet ? pet.result : undefined);
    tx.onerror = () => rechazar(tx.error);
  });
}

export const nuevoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const obtener = (almacen, id) => operar(almacen, 'readonly', s => s.get(id));
export const todos = (almacen) => operar(almacen, 'readonly', s => s.getAll());
export const porAtleta = (almacen, atletaId) =>
  operar(almacen, 'readonly', s => s.index('atletaId').getAll(atletaId));
export const borrar = (almacen, id) => operar(almacen, 'readwrite', s => s.delete(id)).then(r => { avisar('borrado', almacen, [id]); return r; });
export const porIndice = (almacen, indice, valor) =>
  operar(almacen, 'readonly', s => s.index(indice).getAll(valor));

// Guarda o borra muchos registros en una sola transacción (menús y listas de compras)
export async function guardarVarios(almacen, lista) {
  const ahora = new Date().toISOString();
  for (const obj of lista) { if (!obj.id) obj.id = nuevoId(); obj.actualizado = ahora; if (!obj.creado) obj.creado = ahora; }
  if (lista.length) { await operar(almacen, 'readwrite', s => { lista.forEach(o => s.put(o)); return null; }); avisar('guardado', almacen, lista.map(o => o.id)); }
  return lista;
}
export async function borrarVarios(almacen, ids) {
  if (ids.length) { await operar(almacen, 'readwrite', s => { ids.forEach(id => s.delete(id)); return null; }); avisar('borrado', almacen, ids); }
}

export async function guardar(almacen, obj) {
  if (!obj.id) obj.id = nuevoId();
  obj.actualizado = new Date().toISOString();
  if (!obj.creado) obj.creado = obj.actualizado;
  await operar(almacen, 'readwrite', s => s.put(obj));
  avisar('guardado', almacen, [obj.id]);
  return obj;
}

// Borra un atleta y todo lo asociado a él
export async function borrarAtleta(atletaId) {
  for (const [nombre, indices] of Object.entries(ALMACENES)) {
    if (!indices.includes('atletaId')) continue;
    for (const reg of await porAtleta(nombre, atletaId)) await borrar(nombre, reg.id);
  }
  await borrar('atletas', atletaId);
}
