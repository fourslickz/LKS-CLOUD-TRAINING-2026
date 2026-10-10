# API Data Siswa

REST API sederhana untuk mengelola data siswa menggunakan Node.js, Express, dan MariaDB.

## Menjalankan

1. Jalankan MariaDB dengan Docker Compose mengikuti petunjuk di `database-container/README.md`, atau siapkan MariaDB sendiri dan jalankan `backend/database/schema.sql`.
2. Masuk ke folder backend, salin `.env.example` menjadi `.env`, lalu sesuaikan konfigurasi database.
3. Jalankan `npm install`, lalu `npm run dev` untuk mode pengembangan atau `npm start`.
4. Buka `http://localhost:3000` untuk frontend, atau akses endpoint API langsung di alamat yang sama.

Frontend berada di folder `frontend/` dan disajikan otomatis oleh Express. Dari halaman tersebut, admin dapat mencari, menambah, mengedit, dan menghapus data siswa.

## Endpoint

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Memeriksa status API |
| GET | `/api/siswa` | Daftar siswa; mendukung `search`, `page`, dan `limit` |
| GET | `/api/siswa/:id` | Detail siswa |
| POST | `/api/siswa` | Menambah siswa |
| PUT | `/api/siswa/:id` | Memperbarui satu atau beberapa field siswa |
| DELETE | `/api/siswa/:id` | Menghapus siswa |

Field wajib saat membuat siswa: `nis`, `nama`, `kelas`, dan `jurusan`. `alamat`, `tanggal_lahir`, dan foto bersifat opsional. Foto menerima JPG, PNG, atau WebP hingga 5 MB dan disimpan di `backend/uploads/`.

Contoh body `POST /api/siswa`:

```json
{
  "nis": "2026001",
  "nama": "Andi Saputra",
  "kelas": "XI RPL 1",
  "jurusan": "Rekayasa Perangkat Lunak",
  "alamat": "Jakarta",
  "tanggal_lahir": "2009-04-12"
}
```
