import 'dotenv/config';
import app from './app.js';
import pool from './db.js';

const port = Number(process.env.PORT || 3000);

try {
  await pool.query('SELECT 1');
  app.listen(port, () => {
    console.log(`API Data Siswa berjalan di http://localhost:${port}`);
  });
} catch (error) {
  console.error('Gagal terhubung ke MariaDB:', error.message);
  process.exit(1);
}
