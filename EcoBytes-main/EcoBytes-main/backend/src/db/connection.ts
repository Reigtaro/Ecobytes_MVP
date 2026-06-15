import mysql from 'mysql2/promise';

const dbName = process.env.DB_NAME || 'zfranca';

// Conexión sin base de datos (para crear la BD)
export const createConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
};

// Pool de conexiones con la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export { dbName };
export default pool;
