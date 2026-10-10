import { Router } from 'express';
import pool from '../db.js';
import { removeFoto, uploadFoto } from '../upload.js';

const router = Router();
const fields = ['nis', 'nama', 'kelas', 'jurusan', 'alamat', 'tanggal_lahir'];

function parseOptionalPhoto(req, res, next) {
  if (req.is('multipart/form-data')) return uploadFoto(req, res, next);
  next();
}

function validateSiswa(data = {}, { partial = false } = {}) {
  const errors = [];
  const required = ['nis', 'nama', 'kelas', 'jurusan'];

  for (const field of required) {
    if ((!partial || data[field] !== undefined) &&
      (typeof data[field] !== 'string' || !data[field].trim())) {
      errors.push(`${field} wajib diisi dengan teks`);
    }
  }

  for (const field of fields) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'string') {
      errors.push(`${field} harus berupa teks`);
    }
  }

  if (data.tanggal_lahir) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.tanggal_lahir);
    if (!match) {
      errors.push('tanggal_lahir harus menggunakan format YYYY-MM-DD');
    } else {
      const [, year, month, day] = match;
      const parsed = new Date(`${data.tanggal_lahir}T00:00:00Z`);
      if (parsed.getUTCFullYear() !== Number(year) ||
        parsed.getUTCMonth() + 1 !== Number(month) ||
        parsed.getUTCDate() !== Number(day)) {
        errors.push('tanggal_lahir bukan tanggal yang valid');
      }
    }
  }

  return errors;
}

function handleDatabaseError(error, res) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'NIS sudah digunakan' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Data referensi tidak valid' });
  }
  throw error;
}

// GET /api/siswa?search=andi&page=1&limit=10
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const term = `%${search}%`;

    const [rows] = await pool.execute(
      `SELECT id, nis, nama, kelas, jurusan, alamat, tanggal_lahir, foto_url, created_at, updated_at
       FROM siswa
       WHERE (? = '' OR nis LIKE ? OR nama LIKE ? OR kelas LIKE ? OR jurusan LIKE ?)
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [search, term, term, term, term, limit, offset]
    );
    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM siswa
       WHERE (? = '' OR nis LIKE ? OR nama LIKE ? OR kelas LIKE ? OR jurusan LIKE ?)`,
      [search, term, term, term, term]
    );

    res.json({
      data: rows,
      pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/siswa/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, nis, nama, kelas, jurusan, alamat, tanggal_lahir, foto_url, created_at, updated_at FROM siswa WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/siswa
router.post('/', parseOptionalPhoto, async (req, res, next) => {
  const body = req.body ?? {};
  const errors = validateSiswa(body);
  if (errors.length) {
    await removeFoto(req.file && `/uploads/${req.file.filename}`);
    return res.status(400).json({ message: 'Validasi gagal', errors });
  }

  try {
    const { nis, nama, kelas, jurusan, alamat = null, tanggal_lahir = null } = body;
    const [result] = await pool.execute(
      'INSERT INTO siswa (nis, nama, kelas, jurusan, alamat, tanggal_lahir, foto_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nis.trim(), nama.trim(), kelas.trim(), jurusan.trim(), alamat?.trim() || null, tanggal_lahir || null,
        req.file ? `/uploads/${req.file.filename}` : null]
    );
    const [rows] = await pool.execute('SELECT * FROM siswa WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Siswa berhasil ditambahkan', data: rows[0] });
  } catch (error) {
    await removeFoto(req.file && `/uploads/${req.file.filename}`);
    try { handleDatabaseError(error, res); } catch (unhandled) { next(unhandled); }
  }
});

// PUT /api/siswa/:id (menerima pembaruan sebagian atau seluruh field)
router.put('/:id', parseOptionalPhoto, async (req, res, next) => {
  const body = req.body ?? {};
  const errors = validateSiswa(body, { partial: true });
  const updates = fields.filter((field) => body[field] !== undefined);
  if (errors.length) {
    await removeFoto(req.file && `/uploads/${req.file.filename}`);
    return res.status(400).json({ message: 'Validasi gagal', errors });
  }
  if (req.file) updates.push('foto_url');
  if (!updates.length) return res.status(400).json({ message: 'Tidak ada field yang diperbarui' });

  try {
    const [existingRows] = await pool.execute('SELECT foto_url FROM siswa WHERE id = ?', [req.params.id]);
    if (!existingRows.length) {
      await removeFoto(req.file && `/uploads/${req.file.filename}`);
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }
    const previousPhoto = existingRows[0].foto_url;
    const values = updates.map((field) => {
      if (field === 'foto_url') return `/uploads/${req.file.filename}`;
      const value = body[field];
      return typeof value === 'string' ? value.trim() || null : value;
    });
    const [result] = await pool.execute(
      `UPDATE siswa SET ${updates.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
      [...values, req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM siswa WHERE id = ?', [req.params.id]);
    if (req.file && previousPhoto) await removeFoto(previousPhoto);
    res.json({ message: 'Data siswa berhasil diperbarui', data: rows[0] });
  } catch (error) {
    await removeFoto(req.file && `/uploads/${req.file.filename}`);
    try { handleDatabaseError(error, res); } catch (unhandled) { next(unhandled); }
  }
});

// DELETE /api/siswa/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT foto_url FROM siswa WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    const [result] = await pool.execute('DELETE FROM siswa WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    await removeFoto(rows[0].foto_url);
    res.json({ message: 'Data siswa berhasil dihapus' });
  } catch (error) {
    next(error);
  }
});

export default router;
