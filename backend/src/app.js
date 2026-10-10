import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import siswaRoutes from './routes/siswa.js';
import { uploadDirectory } from './upload.js';

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(currentDir, '../../frontend');

app.use(express.json());
app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API Data Siswa aktif' });
});

app.use('/api/siswa', siswaRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Format JSON tidak valid' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Ukuran foto maksimal 5 MB' });
  }
  if (err.code === 'INVALID_IMAGE_TYPE') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
});

export default app;
