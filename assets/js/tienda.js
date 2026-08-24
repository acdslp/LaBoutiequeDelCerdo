/* ============================================================
   TIENDA DEMO — Carrito + Bouti (asistente IA)
   Los precios son de referencia (demo). En producción vendrían
   sincronizados desde el sistema administrativo (SYH).
   ============================================================ */

const WHATSAPP = '584244159679';
const TASA_BS = 160; // tasa demo Bs/USD

const PRODUCTOS = [
  { id: 'molido',      nombre: 'Cerdo Molido',        precio: 4.50, img: 'assets/img/products/cerdo-molido.png',   tags: ['albondiga', 'albóndiga', 'relleno', 'guiso', 'pasta', 'boloñesa', 'bolonesa', 'hamburguesa', 'empanada', 'arepa', 'hallaca', 'hallacas', 'bollo', 'bollos'] },
  { id: 'coppa',       nombre: 'Coppa de Cerdo',      precio: 7.80, img: 'assets/img/products/coppa.png',          tags: ['parrilla', 'asado', 'brasa', 'jugoso'] },
  { id: 'chicharron',  nombre: 'Chicharrón Especial', precio: 6.20, img: 'assets/img/products/chicharron.png',     tags: ['chicharron', 'chicharrón', 'crocante', 'snack', 'picar', 'cerveza', 'frito', 'cachapa', 'yuca'] },
  { id: 'costilla',    nombre: 'Costilla China',      precio: 5.90, img: 'assets/img/products/costilla-china.png', tags: ['bbq', 'barbacoa', 'horno', 'salsa', 'costilla', 'sancocho', 'sopa', 'hervido', 'cruzado', 'caldo', 'olla'] },
  { id: 'lomo',        nombre: 'Lomo de Cerdo',       precio: 6.80, img: 'assets/img/products/lomo.png',           tags: ['saludable', 'magro', 'plancha', 'dieta', 'mechada', 'ensalada', 'wok', 'ligero'] },
  { id: 'porkbelly',   nombre: 'Pork Belly',          precio: 8.50, img: 'assets/img/products/pork-belly.png',     tags: ['ahumado', 'ahumar', 'ramen', 'taco', 'tacos', 'panceta', 'tocineta', 'crispy', 'asiatico', 'asiático'] },
  { id: 'punta',       nombre: 'Punta',               precio: 9.20, img: 'assets/img/products/punta.png',          tags: ['asar', 'horno', 'navidad', 'navideño', 'diciembre', 'pernil', 'fiesta', 'entero', 'parrilla'] },
  { id: 'saintlouis',  nombre: 'Saint Louis',         precio: 8.90, img: 'assets/img/products/saint-louis.png',    tags: ['bbq', 'barbacoa', 'costillar', 'fin de semana', 'ahumado', 'americano'] },
];

const fmt = n => '$' + n.toFixed(2);
const fmtBs = n => 'Bs. ' + (n * TASA_BS).toLocaleString('es-VE', { maximumFractionDigits: 0 });

/* ---- Moneda seleccionada ($ o Bs) ---- */
let moneda = localStorage.getItem('lbdc_moneda') || 'USD';
const fmtSel = n => moneda === 'USD' ? fmt(n) : fmtBs(n);
const fmtAlt = n => moneda === 'USD' ? fmtBs(n) : fmt(n);

function precioHTML(p) {
  return `${fmtSel(p.precio)} <small>/ kg · ${fmtAlt(p.precio)}</small>`;
}

function actualizarPrecios() {
  document.querySelectorAll('.product-price').forEach(el => {
    const p = PRODUCTOS.find(x => x.id === el.dataset.pid);
    if (p) el.innerHTML = precioHTML(p);
  });
  document.querySelectorAll('.currency-toggle').forEach(b => {
    b.innerHTML = moneda === 'USD' ? '<strong>$</strong> / Bs' : '$ / <strong>Bs</strong>';
  });
  renderCarrito();
}

function cambiarMoneda() {
  moneda = moneda === 'USD' ? 'BS' : 'USD';
  localStorage.setItem('lbdc_moneda', moneda);
  actualizarPrecios();
}

/* ============ CARRITO ============ */
let carrito = JSON.parse(localStorage.getItem('lbdc_carrito') || '{}');

function guardarCarrito() {
  localStorage.setItem('lbdc_carrito', JSON.stringify(carrito));
  renderCarrito();
}

function agregarAlCarrito(id, kg = 1) {
  carrito[id] = (carrito[id] || 0) + kg;
  guardarCarrito();
  toast('Agregado al carrito 🐷');
}

function totalCarrito() {
  return Object.entries(carrito).reduce((sum, [id, kg]) => {
    const p = PRODUCTOS.find(x => x.id === id);
    return p ? sum + p.precio * kg : sum;
  }, 0);
}

function renderCarrito() {
  const cont = document.getElementById('cartItems');
  const items = Object.entries(carrito).filter(([, kg]) => kg > 0);

  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.textContent = items.length;
    badge.classList.toggle('hidden', items.length === 0);
  });

  if (!items.length) {
    cont.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br>¡Agrega tus cortes favoritos! 🐷</p>';
  } else {
    cont.innerHTML = items.map(([id, kg]) => {
      const p = PRODUCTOS.find(x => x.id === id);
      return `
      <div class="cart-item">
        <img src="${p.img}" alt="${p.nombre}">
        <div class="cart-item-info">
          <strong>${p.nombre}</strong>
          <span>${fmtSel(p.precio)}/kg · ${fmtSel(p.precio * kg)}</span>
          <div class="qty-controls">
            <button onclick="cambiarKg('${id}', -0.5)">−</button>
            <span class="qty">${kg} kg</span>
            <button onclick="cambiarKg('${id}', 0.5)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="quitarDelCarrito('${id}')" aria-label="Quitar">✕</button>
      </div>`;
    }).join('');
  }

  const total = totalCarrito();
  document.getElementById('cartTotal').textContent = fmtSel(total);
  document.getElementById('cartTotalBs').textContent = fmtAlt(total);
  const altLabel = document.getElementById('cartAltLabel');
  if (altLabel) altLabel.textContent = moneda === 'USD' ? 'Referencia en Bs' : 'Referencia en $';
}

function cambiarKg(id, delta) {
  carrito[id] = Math.max(0.5, (carrito[id] || 0) + delta);
  guardarCarrito();
}

function quitarDelCarrito(id) {
  delete carrito[id];
  guardarCarrito();
}

/* ============ CHECKOUT → WHATSAPP ============ */
function enviarPedido(e) {
  e.preventDefault();
  const f = e.target;
  const items = Object.entries(carrito).filter(([, kg]) => kg > 0);
  if (!items.length) return;

  const lineas = items.map(([id, kg]) => {
    const p = PRODUCTOS.find(x => x.id === id);
    return `• ${p.nombre}: ${kg} kg — ${fmt(p.precio * kg)}`;
  }).join('\n');

  const total = totalCarrito();
  const msg =
`*Nuevo pedido — La Boutique del Cerdo*

*Cliente:* ${f.nombre.value}
*Teléfono:* ${f.telefono.value}
*Entrega:* ${f.entrega.value}${f.direccion.value ? '\n*Dirección:* ' + f.direccion.value : ''}
*Pago:* ${f.pago.value}

*Pedido:*
${lineas}

*Total: ${fmt(total)}* (${fmtBs(total)})`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  carrito = {};
  guardarCarrito();
  document.getElementById('checkoutModal').classList.remove('open');
  cerrarCarrito();
  toast('¡Pedido enviado por WhatsApp! 🎉');
}

/* ============ UI: DRAWER / MODAL / TOAST ============ */
function abrirCarrito() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}
function cerrarCarrito() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

let toastTimer;
function toast(txt) {
  const t = document.getElementById('toast');
  t.textContent = txt;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============ BOUTI — ASISTENTE 🐷 ============ */
/* Demo con reglas locales. En producción, Bouti se conecta a una IA real
   (API de Claude) con el inventario y precios actualizados. */

const RECETAS = {
  molido: [
    '🫔 *Guiso para hallacas:* sofríe el cerdo molido con cebolla, ají dulce, ajo y pimentón. Agrega alcaparras, aceitunas, pasas, un toque de papelón y vino dulce. Cocina a fuego lento hasta que seque. ¡El corazón de la hallaca navideña!',
    '🥟 *Empanadas de cochino:* guiso criollo del molido con ají dulce, cebollín y onoto. Rellena la masa de maíz, fríe hasta dorar y acompaña con guasacaca. Desayuno de campeones.',
    '🍝 *Albóndigas caseras:* mezcla el molido con ajo, cebolla rallada, pan remojado y huevo. Dóralas y termínalas en salsa de tomate. Brutales con pasta o arroz.',
  ],
  coppa: [
    '🔥 *Parrilla criolla:* sal gruesa 30 min antes, brasa media, 4-5 min por lado y reposo de 5 min. Sírvela con guasacaca, yuca sancochada y bollitos. La reina de la parrilla venezolana.',
    '🍻 *Coppa en vara:* córtala en trozos grandes, ensarta y ásala lento dándole vuelta, bañándola con mojo de ajo y cerveza. Estilo llanero, para compartir.',
  ],
  chicharron: [
    '🌽 *Cachapa con chicharrón:* cachapa dulce recién hecha, queso de mano y chicharrón bien crocante encima. La combinación más venezolana que existe.',
    '🫓 *Arepa de chicharrón:* pica el chicharrón fino y amásalo directo con la masa de maíz. Ásalas y rellénalas con queso rallado. Crujiente por dentro y por fuera.',
    '🍺 *Chicharrón clásico:* seca bien la piel, sal por todos lados. Fuego bajo primero para soltar la grasa, luego fuego alto para que infle y truene. Con yuca frita y ají, no falla.',
  ],
  costilla: [
    '🍲 *Hervido de costilla:* sancocha la costilla con jojoto, yuca, ocumo, auyama, ñame y cilantro. Fuego lento hasta que la carne se despegue del hueso. El levanta-muertos del domingo.',
    '🍖 *Costilla china BBQ:* horno tapado a 160 °C por 2 horas con su salsa, destapa y sube a 200 °C 15 min para caramelizar. Se deshace sola.',
  ],
  lomo: [
    '🍊 *Lomo en salsa de parchita:* sella los medallones y báñalos en reducción de parchita con un toque de papelón. Agridulce criollo, espectacular con arroz con coco.',
    '🥗 *Lomo a la plancha:* medallones de 2 cm, sal, pimienta y mostaza. Plancha bien caliente, 3 min por lado. Magro, rápido y saludable.',
    '🥪 *Pan con lomo:* lomo horneado en rebanadas finas, pan campesino, tomate y salsa de ajo. El clásico de las fiestas decembrinas.',
  ],
  porkbelly: [
    '🐷 *Cochino frito criollo:* corta en trozos, sancocha con sal y ajo, y luego fríe en su propia grasa hasta dorar. Con yuca, arepitas y guasacaca. Estilo estado Portuguesa.',
    '🌮 *Pork belly crispy:* piel bien seca, horno a 160 °C por 1 h y luego 220 °C hasta que la piel truene. Ideal para tacos o ramen.',
  ],
  punta: [
    '🎄 *Pernil navideño:* marina desde la víspera con naranja, ajo machacado, orégano y papelón. Horno a 150 °C, 3-4 horas tapado, y al final dorado fuerte. El plato de diciembre en Venezuela.',
    '🎉 *Punta asada entera:* ajo, comino y sal la noche anterior. Horno lento o parrilla con tapa. Córtala en láminas y sírvela con guasacaca.',
  ],
  saintlouis: [
    '🍬 *Costillas glaseadas con papelón:* rub de sal, ajo y comino, horno lento 3 horas, y al final glasea con melado de papelón y un chorrito de ron. Dulce-criollo, para chuparse los dedos.',
    '🇺🇸 *Saint Louis low & slow:* rub de paprika, azúcar morena y ajo. Horno o ahumador a 130 °C por 4 horas. El costillar clásico del fin de semana.',
  ],
};

function recetaDe(id) {
  const lista = RECETAS[id];
  return lista[Math.floor(Math.random() * lista.length)];
}

let ultimoProductoBouti = null;

const boutiMsgs = [];

function boutiResponder(texto) {
  const t = texto.toLowerCase();

  // Saludos
  if (/^(hola|buenas|hey|epa|saludos|hi)/.test(t)) {
    return { texto: '¡Hola! 🐷 Soy Bouti, tu asistente de La Boutique del Cerdo. Dime qué quieres cocinar y te recomiendo el corte perfecto, con receta criolla incluida. Por ejemplo: *"quiero hacer hallacas"*, *"un hervido"* o *"una parrilla"*.' };
  }

  // Otra receta del mismo corte
  if (/(otra|otro|una mas|una más|mas recetas|más recetas|dame otra)/.test(t) && ultimoProductoBouti) {
    const p = PRODUCTOS.find(x => x.id === ultimoProductoBouti);
    return { texto: `¡Claro! Otra idea con ${p.nombre} 🐷\n\n${recetaDe(p.id)}`, productos: [p.id] };
  }

  // Conversión de moneda ("¿cuánto son 20 dólares en bolívares?", "convierte 500 bs a $")
  const conv = t.match(/([\d]+(?:[.,]\d+)?)\s*(d[oó]lares?|d[oó]lar|\$|usd|bol[ií]vares?|bol[ií]var|bs)/);
  if (conv && /(cuanto|cuánto|convierte|conviert|conversi|cambio|cambia|equivale|pasa|son|serian|serían|es)/.test(t)) {
    const num = parseFloat(conv[1].replace(',', '.'));
    const esUsd = /d[oó]lar|\$|usd/.test(conv[2]);
    if (!isNaN(num)) {
      const resultado = esUsd
        ? `💱 *$${num.toLocaleString('es-VE')}* son *Bs. ${(num * TASA_BS).toLocaleString('es-VE', { maximumFractionDigits: 2 })}*`
        : `💱 *Bs. ${num.toLocaleString('es-VE')}* son *$${(num / TASA_BS).toLocaleString('es-VE', { maximumFractionDigits: 2 })}*`;
      return { texto: `${resultado}\n\n(Tasa de referencia: Bs ${TASA_BS}/$) 🐷\nSi quieres ver toda la página en ${esUsd ? 'bolívares' : 'dólares'}, usa el botón *$ / Bs* de arriba.` };
    }
  }

  // Precios
  if (/(precio|cuanto|cuánto|cuesta|vale|tasa|bolivar|bolívar|dolar|dólar)/.test(t)) {
    const lista = PRODUCTOS.map(p => `• ${p.nombre}: ${fmt(p.precio)}/kg (${fmtBs(p.precio)})`).join('\n');
    return { texto: `Estos son nuestros precios de hoy 🐷\n\n${lista}\n\nTasa de referencia: Bs ${TASA_BS}/$. Puedes cambiar la moneda de la página con el botón *$ / Bs* de arriba. ¿Te agrego alguno al carrito?` };
  }

  // Formas de pago
  if (/(pago movil|pago móvil|zelle|transferencia|forma de pago|formas de pago|metodo|método|como pago|cómo pago|como puedo pagar|punto de venta|efectivo|binance)/.test(t)) {
    return { texto: 'Aceptamos varias formas de pago 🐷💳\n\n• *Pago Móvil*\n• *Transferencia* (Bs)\n• *Zelle*\n• *Efectivo* ($ o Bs)\n• *Punto de venta*\n• *Binance (USDT)*\n\nEliges la tuya al finalizar el pedido en el carrito, y confirmamos todo por WhatsApp.' };
  }

  // Buscar producto mencionado directamente
  const porNombre = PRODUCTOS.find(p =>
    t.includes(p.nombre.toLowerCase()) || t.includes(p.id) ||
    p.nombre.toLowerCase().split(' ').some(w => w.length > 4 && t.includes(w))
  );
  if (porNombre) {
    ultimoProductoBouti = porNombre.id;
    return {
      texto: `¡Excelente elección! ${porNombre.nombre} — ${fmtSel(porNombre.precio)}/kg.\n\n${recetaDe(porNombre.id)}\n\nSi quieres, pídeme *otra receta* con este corte.`,
      productos: [porNombre.id],
    };
  }

  // Buscar por tags (qué quiere cocinar)
  const matches = PRODUCTOS
    .map(p => ({ p, hits: p.tags.filter(tag => t.includes(tag)).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 2);

  if (matches.length) {
    ultimoProductoBouti = matches[0].p.id;
    const nombres = matches.map(m => `*${m.p.nombre}* (${fmtSel(m.p.precio)}/kg)`).join(' o ');
    return {
      texto: `Para eso te recomiendo ${nombres} 🐷\n\n${recetaDe(matches[0].p.id)}\n\nSi quieres, pídeme *otra receta*.`,
      productos: matches.map(m => m.p.id),
    };
  }

  // Fallback
  return { texto: 'Mmm, cuéntame más 🐷 Puedo ayudarte si me dices qué quieres cocinar (hallacas, hervido, parrilla, cachapa con chicharrón, pernil, algo saludable...), pregúntame por los *precios* o las *formas de pago*, o pídeme convertir un monto (ej: *"¿cuánto son 20 dólares en bolívares?"*).' };
}

function boutiAgregar(rol, contenido, productos) {
  const cont = document.getElementById('boutiMsgs');
  const div = document.createElement('div');
  div.className = 'bouti-msg ' + rol;
  div.innerHTML = contenido.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  if (productos) {
    productos.forEach(id => {
      const p = PRODUCTOS.find(x => x.id === id);
      const btn = document.createElement('button');
      btn.className = 'msg-add';
      btn.textContent = `🛒 Agregar ${p.nombre}`;
      btn.onclick = () => agregarAlCarrito(id);
      div.appendChild(document.createElement('br'));
      div.appendChild(btn);
    });
  }
  cont.appendChild(div);
  cont.scrollTop = cont.scrollHeight;
}

function boutiEnviar(textoForzado) {
  const input = document.getElementById('boutiInput');
  const texto = (textoForzado || input.value).trim();
  if (!texto) return;
  input.value = '';
  boutiAgregar('user', texto);

  const cont = document.getElementById('boutiMsgs');
  const typing = document.createElement('div');
  typing.className = 'bouti-typing';
  typing.textContent = 'Bouti está escribiendo…';
  cont.appendChild(typing);
  cont.scrollTop = cont.scrollHeight;

  setTimeout(() => {
    typing.remove();
    const r = boutiResponder(texto);
    boutiAgregar('bot', r.texto, r.productos);
  }, 700 + Math.random() * 600);
}

function toggleBouti() {
  const panel = document.getElementById('boutiPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open') && !panel.dataset.saludado) {
    panel.dataset.saludado = '1';
    setTimeout(() => {
      boutiAgregar('bot', '¡Hola! 🐷 Soy *Bouti*, el cerdito de La Boutique. Dime qué quieres cocinar y te recomiendo el corte ideal con su receta. ¿En qué te ayudo?');
    }, 400);
  }
}

/* ============ MONTAJE ============ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Decorar tarjetas de producto con precio + botón
  document.querySelectorAll('.product-card').forEach(card => {
    const nombre = card.querySelector('h3').textContent.trim();
    const p = PRODUCTOS.find(x =>
      x.nombre.toLowerCase() === nombre.toLowerCase() ||
      nombre.toLowerCase().includes(x.nombre.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (!p) return;
    const body = card.querySelector('.product-body');
    const precio = document.createElement('div');
    precio.className = 'product-price';
    precio.dataset.pid = p.id;
    precio.innerHTML = precioHTML(p);
    body.insertBefore(precio, body.querySelector('.product-link'));

    const btn = document.createElement('button');
    btn.className = 'btn-add';
    btn.innerHTML = '🛒 Agregar';
    btn.onclick = () => {
      agregarAlCarrito(p.id);
      btn.classList.add('added');
      btn.innerHTML = '✓ Agregado';
      setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = '🛒 Agregar'; }, 1500);
    };
    body.insertBefore(btn, body.querySelector('.product-link'));
  });

  // 2. Inyectar UI: FABs, drawer, modal, chat, toast
  document.body.insertAdjacentHTML('beforeend', `
    <button class="fab-cart" id="fabCart" aria-label="Ver carrito">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.5"/><circle cx="19" cy="21" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 7H6"/></svg>
      <span class="cart-badge hidden" id="cartBadge">0</span>
    </button>

    <button class="fab-bouti" id="fabBouti" aria-label="Hablar con Bouti">🐷</button>

    <div class="cart-overlay" id="cartOverlay"></div>
    <aside class="cart-drawer" id="cartDrawer" aria-label="Carrito de compras">
      <div class="cart-head">
        <h3>Tu carrito 🛒</h3>
        <button class="cart-close" id="cartClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-foot">
        <div class="cart-total"><span>Total</span><span id="cartTotal">$0.00</span></div>
        <div class="cart-total-bs"><span id="cartAltLabel">Referencia en Bs</span><span id="cartTotalBs">Bs. 0</span></div>
        <button class="btn btn-whatsapp btn-checkout" id="btnCheckout">Finalizar pedido</button>
        <p class="cart-note">Precios de referencia (demo) · Tasa Bs ${TASA_BS}/$</p>
      </div>
    </aside>

    <div class="checkout-modal" id="checkoutModal">
      <div class="cart-overlay open" id="checkoutOverlay" style="z-index:1"></div>
      <form class="checkout-box" id="checkoutForm">
        <h3>Finalizar pedido 🐷</h3>
        <label>Nombre</label>
        <input name="nombre" required placeholder="Tu nombre">
        <label>Teléfono</label>
        <input name="telefono" required placeholder="0424-0000000">
        <label>Entrega</label>
        <select name="entrega" id="selEntrega">
          <option>Retiro en tienda (Prebo)</option>
          <option>Delivery en Valencia</option>
        </select>
        <label>Dirección (solo delivery)</label>
        <input name="direccion" placeholder="Urbanización, calle, casa/apto">
        <label>Método de pago</label>
        <select name="pago">
          <option>Pago Móvil</option>
          <option>Transferencia (Bs)</option>
          <option>Zelle</option>
          <option>Efectivo ($)</option>
          <option>Efectivo (Bs)</option>
          <option>Punto de venta</option>
          <option>Binance (USDT)</option>
        </select>
        <div class="checkout-actions">
          <button type="button" class="btn btn-ghost" id="checkoutCancel">Volver</button>
          <button type="submit" class="btn btn-whatsapp">Enviar por WhatsApp</button>
        </div>
      </form>
    </div>

    <div class="bouti-panel" id="boutiPanel">
      <div class="bouti-head">
        <div class="bouti-avatar">🐷</div>
        <div class="bouti-head-info">
          <strong>Bouti</strong>
          <span>Tu asistente de cortes y recetas</span>
        </div>
        <button class="bouti-close" id="boutiClose" aria-label="Cerrar">✕</button>
      </div>
      <div class="bouti-msgs" id="boutiMsgs"></div>
      <div class="bouti-suggests">
        <button data-q="Quiero hacer hallacas">🫔 Hallacas</button>
        <button data-q="Quiero hacer una parrilla">🔥 Parrilla</button>
        <button data-q="Algo para un hervido">🍲 Hervido</button>
        <button data-q="¿Qué precios tienen?">💰 Precios</button>
        <button data-q="¿Qué formas de pago aceptan?">💳 Pagos</button>
        <button data-q="¿Cuánto son 10 dólares en bolívares?">💱 Convertir</button>
      </div>
      <div class="bouti-input">
        <input id="boutiInput" placeholder="Escríbele a Bouti…" autocomplete="off">
        <button id="boutiSend" aria-label="Enviar">➤</button>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `);

  // 3. Eventos
  document.getElementById('fabCart').onclick = abrirCarrito;
  const headerCart = document.getElementById('headerCart');
  if (headerCart) headerCart.onclick = abrirCarrito;
  document.querySelectorAll('.currency-toggle').forEach(b => b.onclick = cambiarMoneda);
  document.getElementById('cartClose').onclick = cerrarCarrito;
  document.getElementById('cartOverlay').onclick = cerrarCarrito;
  document.getElementById('btnCheckout').onclick = () => {
    if (!Object.keys(carrito).length) { toast('El carrito está vacío 🐷'); return; }
    document.getElementById('checkoutModal').classList.add('open');
  };
  document.getElementById('checkoutCancel').onclick = () =>
    document.getElementById('checkoutModal').classList.remove('open');
  document.getElementById('checkoutOverlay').onclick = () =>
    document.getElementById('checkoutModal').classList.remove('open');
  document.getElementById('checkoutForm').onsubmit = enviarPedido;

  document.getElementById('fabBouti').onclick = toggleBouti;
  document.getElementById('boutiClose').onclick = toggleBouti;
  document.getElementById('boutiSend').onclick = () => boutiEnviar();
  document.getElementById('boutiInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') boutiEnviar();
  });
  document.querySelectorAll('.bouti-suggests button').forEach(b => {
    b.onclick = () => boutiEnviar(b.dataset.q);
  });

  actualizarPrecios();

  // 4. Bouti saluda al entrar (una vez por visita)
  if (!sessionStorage.getItem('lbdc_bouti_hi')) {
    setTimeout(() => {
      sessionStorage.setItem('lbdc_bouti_hi', '1');
      const panel = document.getElementById('boutiPanel');
      if (panel.classList.contains('open')) return;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="bouti-welcome" id="boutiWelcome">
          <button class="bouti-welcome-close" aria-label="Cerrar">✕</button>
          <div class="bouti-welcome-avatar">🐷</div>
          <div>
            <strong>¡Hola! Soy Bouti</strong>
            <p>Si necesitas ayuda con recetas o no sabes qué corte llevar, ¡aquí me tienes!</p>
          </div>
        </div>`);
      const wel = document.getElementById('boutiWelcome');
      requestAnimationFrame(() => wel.classList.add('show'));
      document.getElementById('fabBouti').classList.add('wiggle');
      wel.querySelector('.bouti-welcome-close').onclick = e => { e.stopPropagation(); wel.remove(); };
      wel.onclick = () => { wel.remove(); toggleBouti(); };
      setTimeout(() => { if (document.getElementById('boutiWelcome')) wel.classList.remove('show'); }, 12000);
      setTimeout(() => { const w = document.getElementById('boutiWelcome'); if (w) w.remove(); }, 12600);
    }, 2500);
  }
});
