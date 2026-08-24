// Simulador de WhatsApp en la terminal: chatea con Bouti sin necesitar Meta.
//   npm run chat
import readline from 'readline/promises';
import { stdin, stdout } from 'process';
import { responderBouti, reiniciarConversacion } from './bouti.js';
import { pool } from './db.js';

const TELEFONO_PRUEBA = '58424TEST';
const rl = readline.createInterface({ input: stdin, output: stdout });

console.log('🐷 Simulador de Bouti — escribe como si fueras un cliente de WhatsApp.');
console.log('   Comandos: /reset (borrar conversacion) · /salir\n');

while (true) {
  const texto = (await rl.question('Tú: ')).trim();
  if (!texto) continue;
  if (texto === '/salir') break;
  if (texto === '/reset') {
    reiniciarConversacion(TELEFONO_PRUEBA);
    console.log('(conversacion reiniciada)\n');
    continue;
  }
  try {
    const t0 = Date.now();
    const respuesta = await responderBouti(TELEFONO_PRUEBA, texto);
    console.log(`\nBouti 🐷: ${respuesta}\n   (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  } catch (e) {
    console.error('\n❌ Error:', e.message, '\n');
  }
}

rl.close();
await pool.end();
