import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lbdc',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function tasaBs() {
  try {
    const [rows] = await pool.query("SELECT valor FROM config WHERE clave = 'tasa_bs'");
    if (rows.length) return parseFloat(rows[0].valor);
  } catch { /* fallback al .env */ }
  return parseFloat(process.env.TASA_BS || '160');
}
