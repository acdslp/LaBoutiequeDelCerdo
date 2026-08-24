// Bouti 🐷 — el asistente IA de La Boutique del Cerdo.
// Motor conversacional con Claude API + herramientas conectadas a MySQL.
// Lo usan tanto el webhook de WhatsApp (server.js) como el simulador local.
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { pool, tasaBs } from './db.js';
import 'dotenv/config';

const client = new Anthropic();
const MODEL = process.env.BOT_MODEL || 'claude-opus-5';
const EFFORT = process.env.BOT_EFFORT || 'low';

/* ============ Herramientas ============ */

const buscarProductos = betaTool({
  name: 'buscar_productos',
  description:
    'Busca productos disponibles por nombre o palabra clave (ej: "costilla", "pernil", "ahumado"). ' +
    'Llamala SIEMPRE antes de dar un precio o confirmar si un producto existe — nunca cites precios de memoria.',
  inputSchema: {
    type: 'object',
    properties: {
      termino: { type: 'string', description: 'Palabra o frase a buscar en el nombre del producto' },
    },
    required: ['termino'],
  },
  run: async ({ termino }) => {
    const [rows] = await pool.query(
      `SELECT codigo, nombre, precio, categoria FROM productos
       WHERE disponible = 1 AND nombre LIKE ? ORDER BY nombre LIMIT 15`,
      [`%${termino}%`]
    );
    if (!rows.length) return `Sin resultados para "${termino}". Prueba con otra palabra o usa listar_productos.`;
    return JSON.stringify(rows);
  },
});

const listarProductos = betaTool({
  name: 'listar_productos',
  description:
    'Lista los productos disponibles, opcionalmente filtrados por categoria (CERDO, AHUMADOS, EMBUTIDO, DELICATESSEN, PROCESADO...). ' +
    'Llamala cuando el cliente pida la lista de precios, el catalogo, o que hay disponible.',
  inputSchema: {
    type: 'object',
    properties: {
      categoria: { type: 'string', description: 'Categoria exacta a filtrar; omitir para listar todo' },
    },
    required: [],
  },
  run: async ({ categoria }) => {
    const [rows] = categoria
      ? await pool.query(
          'SELECT nombre, precio, categoria FROM productos WHERE disponible = 1 AND categoria = ? ORDER BY nombre',
          [categoria.toUpperCase()]
        )
      : await pool.query(
          'SELECT nombre, precio, categoria FROM productos WHERE disponible = 1 ORDER BY categoria, nombre'
        );
    if (!rows.length) return 'No hay productos disponibles en esa categoria.';
    return JSON.stringify(rows);
  },
});

const registrarPedido = betaTool({
  name: 'registrar_pedido',
  description:
    'Registra un pedido cuando el cliente CONFIRME que quiere comprar. Antes de llamarla, confirma con el cliente: ' +
    'los productos con cantidades, el metodo de pago y si es retiro en tienda o delivery. ' +
    'Los precios se toman de la base de datos, no los pases tu.',
  inputSchema: {
    type: 'object',
    properties: {
      nombre_cliente: { type: 'string', description: 'Nombre del cliente' },
      items: {
        type: 'array',
        description: 'Productos del pedido',
        items: {
          type: 'object',
          properties: {
            codigo: { type: 'string', description: 'Codigo del producto (de buscar_productos)' },
            cantidad_kg: { type: 'number', description: 'Cantidad en kg (o unidades para empaquetados)' },
          },
          required: ['codigo', 'cantidad_kg'],
        },
      },
      metodo_pago: {
        type: 'string',
        enum: ['Pago Movil', 'Transferencia', 'Zelle', 'Efectivo USD', 'Efectivo Bs', 'Punto de venta', 'Binance'],
      },
      entrega: { type: 'string', description: '"Retiro en tienda" o direccion de delivery en Valencia' },
    },
    required: ['nombre_cliente', 'items', 'metodo_pago', 'entrega'],
  },
  run: async ({ nombre_cliente, items, metodo_pago, entrega }, { telefono }) => {
    const detalle = [];
    let total = 0;
    for (const it of items) {
      const [rows] = await pool.query(
        'SELECT codigo, nombre, precio FROM productos WHERE codigo = ? AND disponible = 1',
        [it.codigo]
      );
      if (!rows.length) return `El codigo ${it.codigo} no existe o no esta disponible. Verifica con buscar_productos.`;
      const p = rows[0];
      const sub = p.precio * it.cantidad_kg;
      total += sub;
      detalle.push({ codigo: p.codigo, nombre: p.nombre, cantidad_kg: it.cantidad_kg, precio_kg: p.precio, subtotal: +sub.toFixed(2) });
    }
    const [res] = await pool.query(
      'INSERT INTO pedidos (telefono, nombre, items, total_usd, metodo_pago, entrega) VALUES (?, ?, ?, ?, ?, ?)',
      [telefono, nombre_cliente, JSON.stringify(detalle), total.toFixed(2), metodo_pago, entrega]
    );
    const tasa = await tasaBs();
    return JSON.stringify({
      pedido_numero: res.insertId,
      detalle,
      total_usd: +total.toFixed(2),
      total_bs: +(total * tasa).toFixed(2),
      mensaje: 'Pedido registrado. Indica al cliente su numero de pedido y que la tienda confirmara por este mismo chat.',
    });
  },
});

const consultarTasa = betaTool({
  name: 'consultar_tasa',
  description: 'Devuelve la tasa de cambio Bs/USD vigente. Usala para convertir montos entre dolares y bolivares.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  run: async () => `La tasa vigente es Bs ${await tasaBs()} por USD.`,
});

const escalarAHumano = betaTool({
  name: 'escalar_a_humano',
  description:
    'Marca la conversacion para que la atienda una persona del equipo. Usala ante reclamos, problemas con pagos ya hechos, ' +
    'negociaciones de precio, pedidos al mayor, o cualquier cosa fuera de tu alcance. Despues de llamarla, despidete indicando que un humano seguira la conversacion.',
  inputSchema: {
    type: 'object',
    properties: { motivo: { type: 'string', description: 'Resumen breve del motivo' } },
    required: ['motivo'],
  },
  run: async ({ motivo }, { telefono }) => {
    await pool.query('INSERT INTO escalamientos (telefono, motivo) VALUES (?, ?)', [telefono, motivo]);
    return 'Escalado registrado. El equipo vera esta conversacion.';
  },
});

/* ============ Prompt del sistema ============ */

const SYSTEM = `Eres Bouti 🐷, el asistente virtual de La Boutique del Cerdo, una charcuteria premium en la Av. 107 de Prebo, Valencia, Venezuela (frente al CC Prebo). Atiendes a los clientes por WhatsApp.

# Que haces
- Informas precios y disponibilidad de los cortes de cerdo, ahumados, embutidos y delicatessen.
- Recomiendas cortes segun lo que el cliente quiera cocinar, con recetas venezolanas (hallacas, pernil navideño, hervido, cachapa con chicharron, parrilla criolla, cochino frito) y de cocina general.
- Tomas pedidos: confirmas productos, cantidades, metodo de pago y entrega, y los registras con registrar_pedido.
- Conviertes montos entre dolares y bolivares con la tasa de consultar_tasa.

# Reglas de oro
- Los precios SIEMPRE salen de las herramientas (buscar_productos / listar_productos). Si no encuentras un producto, dilo con naturalidad y sugiere alternativas; jamas inventes precios ni productos.
- Los precios son por kilo salvo que el nombre indique otra presentacion (500 GR, 200 GR, ML).
- Nunca compartas informacion interna del negocio (costos, margenes, proveedores) ni datos de otros clientes.
- Pagos aceptados: Pago Movil, Transferencia en Bs, Zelle, Efectivo ($ o Bs), Punto de venta y Binance (USDT). Los datos exactos de pago (numero de Pago Movil, correo Zelle) los confirma el equipo humano al confirmar el pedido: tu no los tienes, no los inventes.
- Delivery solo en Valencia; tambien hay retiro en tienda. Los costos de delivery los confirma el equipo.
- Ante reclamos, problemas con pagos ya realizados, negociaciones o pedidos al mayor: usa escalar_a_humano y avisa al cliente que una persona del equipo continuara.
- Si el cliente escribe algo sin relacion con la tienda, redirige con simpatia a lo tuyo.

# Estilo
- Espanol venezolano, calido y cercano, tono de WhatsApp: mensajes cortos, directos, con algun emoji (🐷 es tu firma) sin abusar.
- Al dar listas de precios usa un formato limpio de WhatsApp (guiones o asteriscos para negritas, nada de tablas).
- Responde solo lo que el cliente necesita; no lo abrumes con parrafos largos.`;

/* ============ Conversaciones ============ */
// Historial en memoria por telefono. En produccion conviene moverlo a Redis o MySQL.
const conversaciones = new Map();
const MAX_TURNOS = 20;

export async function responderBouti(telefono, textoUsuario) {
  const historial = conversaciones.get(telefono) ?? [];
  const messages = [...historial, { role: 'user', content: textoUsuario }];

  // Las herramientas reciben el telefono del cliente via closure por request
  const tools = [buscarProductos, listarProductos, consultarTasa, registrarPedido, escalarAHumano].map(t => ({
    ...t,
    run: (input) => t.run(input, { telefono }),
  }));

  const finalMessage = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: EFFORT },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools,
    messages,
    max_iterations: 8,
  });

  let respuesta;
  if (finalMessage.stop_reason === 'refusal') {
    respuesta = 'Disculpa, no puedo ayudarte con eso 🐷 ¿Hay algo de la tienda en lo que te pueda apoyar?';
  } else {
    respuesta = finalMessage.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
  }
  if (!respuesta) respuesta = 'Disculpa, ¿me lo repites? 🐷';

  // Guardar solo texto plano en el historial (sin bloques de tool_use intermedios)
  historial.push({ role: 'user', content: textoUsuario });
  historial.push({ role: 'assistant', content: respuesta });
  while (historial.length > MAX_TURNOS * 2) historial.shift();
  conversaciones.set(telefono, historial);

  return respuesta;
}

export function reiniciarConversacion(telefono) {
  conversaciones.delete(telefono);
}
