// Servidor del bot: webhook de WhatsApp (Meta Cloud API) + API REST de productos.
// Tambien re-importa el Excel de SYH automaticamente cuando cambia.
import express from 'express';
import { statSync } from 'fs';
import { pool, tasaBs } from './db.js';
import { responderBouti } from './bouti.js';
import { importar, rutaXls } from './importar-xls.js';
import 'dotenv/config';

const app = express();
app.use(express.json());

/* ============ API REST (la usa la pagina web) ============ */

app.get('/api/productos', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT codigo, nombre, precio, categoria FROM productos WHERE disponible = 1 ORDER BY categoria, nombre'
  );
  res.json({ tasa_bs: await tasaBs(), productos: rows });
});

app.get('/api/tasa', async (_req, res) => {
  res.json({ tasa_bs: await tasaBs() });
});

app.get('/api/pedidos', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM pedidos ORDER BY creado DESC LIMIT 50');
  res.json(rows);
});

/* ============ Webhook de WhatsApp (Meta Cloud API) ============ */

// Verificacion inicial del webhook (Meta manda un GET con un reto)
app.get('/webhook', (req, res) => {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const reto = req.query['hub.challenge'];
  if (modo === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    return res.status(200).send(reto);
  }
  res.sendStatus(403);
});

// Mensajes entrantes
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responder rapido; Meta reintenta si no

  try {
    const cambio = req.body?.entry?.[0]?.changes?.[0]?.value;
    const mensaje = cambio?.messages?.[0];
    if (!mensaje || mensaje.type !== 'text') return;

    const telefono = mensaje.from;
    const texto = mensaje.text.body;
    console.log(`📩 ${telefono}: ${texto}`);

    const respuesta = await responderBouti(telefono, texto);
    await enviarWhatsApp(telefono, respuesta);
    console.log(`🐷 → ${telefono}: ${respuesta.slice(0, 80)}...`);
  } catch (e) {
    console.error('Error procesando mensaje:', e);
  }
});

async function enviarWhatsApp(telefono, texto) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'text',
      text: { body: texto },
    }),
  });
  if (!r.ok) console.error('Error enviando a WhatsApp:', r.status, await r.text());
}

/* ============ Re-importacion automatica del Excel ============ */

let ultimaModificacion = 0;
async function vigilarExcel() {
  try {
    const mtime = statSync(rutaXls()).mtimeMs;
    if (mtime !== ultimaModificacion) {
      ultimaModificacion = mtime;
      const n = await importar();
      console.log(`🔄 Excel actualizado: ${n} productos re-importados`);
    }
  } catch (e) {
    console.error('Error vigilando el Excel:', e.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🐷 Bot de La Boutique del Cerdo escuchando en http://localhost:${PORT}`);
  await vigilarExcel();
  setInterval(vigilarExcel, 60_000);
});
