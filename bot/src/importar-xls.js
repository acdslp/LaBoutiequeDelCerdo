// Importa los productos del BOUTIQUE.xls (export de SYH) a MySQL.
// Se puede correr a mano (npm run importar) y el server lo re-ejecuta
// automaticamente cuando detecta que el archivo cambio.
//
// Estructura de la hoja "PRECIOS SISTEMA" (por indice de columna):
//   0 = CODIGO | 1 = PRECIO 1 | 8 = COSTO (NO se importa) | 10 = NOMBRE | 14 = CATEGORIA
import xlsx from 'xlsx';
const { readFile, utils } = xlsx;
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { pool } from './db.js';
import 'dotenv/config';

const here = dirname(fileURLToPath(import.meta.url));

export function rutaXls() {
  return resolve(here, '..', process.env.XLS_PATH || '../BOUTIQUE.xls');
}

export async function importar() {
  const ruta = rutaXls();
  const hoja = process.env.XLS_HOJA || 'PRECIOS SISTEMA';
  const wb = readFile(ruta);
  const ws = wb.Sheets[hoja];
  if (!ws) throw new Error(`No existe la hoja "${hoja}" en ${ruta}. Hojas: ${wb.SheetNames.join(', ')}`);

  const filas = utils.sheet_to_json(ws, { header: 1, defval: null });
  const productos = [];

  for (const fila of filas.slice(1)) { // saltar encabezado
    const codigo = String(fila[0] ?? '').trim();
    const precio = parseFloat(fila[1]);
    const nombre = String(fila[10] ?? '').replace(/\s+/g, ' ').trim();
    const categoria = String(fila[14] ?? 'GENERAL').trim() || 'GENERAL';
    if (!codigo || !nombre || !Number.isFinite(precio) || precio <= 0) continue;
    productos.push([codigo, nombre, precio, categoria]);
  }

  if (!productos.length) throw new Error('No se encontraron productos validos en el Excel');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Marcar todo como no disponible; lo que este en el Excel se reactiva.
    await conn.query('UPDATE productos SET disponible = 0');
    await conn.query(
      `INSERT INTO productos (codigo, nombre, precio, categoria, disponible)
       VALUES ? AS nuevo(codigo, nombre, precio, categoria, disponible)
       ON DUPLICATE KEY UPDATE
         nombre = nuevo.nombre, precio = nuevo.precio,
         categoria = nuevo.categoria, disponible = 1`,
      [productos.map(p => [...p, 1])]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return productos.length;
}

// Ejecucion directa: npm run importar
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const n = await importar();
    console.log(`✅ ${n} productos importados desde ${rutaXls()}`);
  } catch (e) {
    console.error('❌ Error importando:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
