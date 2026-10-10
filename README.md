# API Data Siswa

REST API sederhana untuk mengelola data siswa menggunakan Node.js, Express, dan MariaDB.

## Menjalankan backend dan frontend

Frontend disajikan oleh Express, jadi cukup jalankan database dan backend. Setelah backend aktif, halaman frontend dan API sama-sama tersedia di `http://localhost:3000`.

### 1. Jalankan MariaDB

Buka terminal pertama dari root proyek:

```sh
cd database-container
cp .env.example .env
docker compose up -d --build
```

Compose membuat database dan tabel secara otomatis pada inisialisasi pertama. Database berjalan pada `localhost:3307`. Petunjuk tambahan tersedia di [database-container/README.md](database-container/README.md).

### Migrasi database yang sudah ada

Jika database sudah dibuat sebelum kolom foto ditambahkan, jalankan migrasi setelah MariaDB aktif. Dari root proyek:

```sh
cd database-container
docker compose exec -T mariadb mariadb -u siswa_app -psiswa_app_password db_siswa < ../backend/database/migrations/001_add_foto_url.sql
```

Migrasi ini menambahkan kolom `foto_url` dan aman dijalankan ulang. Database baru yang dibuat lewat Compose sudah mendapat kolom tersebut dari `backend/database/schema.sql`, jadi tidak perlu menjalankan migrasi secara terpisah. Jika kredensial pada `database-container/.env` diubah, sesuaikan username dan password pada perintah di atas.

### 2. Siapkan dan jalankan backend

Buka terminal kedua dari root proyek:

```sh
cd backend
cp .env.example .env
npm install
npm start
```

File `backend/.env.example` sudah berisi konfigurasi koneksi untuk MariaDB Compose. Jika kredensial atau port di `database-container/.env` diubah, sesuaikan juga nilai di `backend/.env`.

Saat berhasil, terminal menampilkan alamat `http://localhost:3000`.

### 3. Buka frontend

Buka `http://localhost:3000` di browser. Frontend berada di folder `frontend/` dan dilayani otomatis oleh backend. Halaman ini dapat mencari, menambah, mengedit, dan menghapus data siswa, termasuk mengunggah foto.

Untuk memastikan API aktif, buka `http://localhost:3000/api/health`.

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
