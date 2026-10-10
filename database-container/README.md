# MariaDB dengan Docker Compose

## Menjalankan

```sh
cp .env.example .env
docker compose up -d --build
```

Jalankan perintah dari folder `database-container/`. Compose membangun image dari `Dockerfile`, memetakan port host `3307` ke port MariaDB `3306`, dan menyimpan data di volume `mariadb_data`. Skema siswa otomatis dimuat saat volume baru pertama kali dibuat.

Untuk melihat status dan log:

```sh
docker compose ps
docker compose logs -f mariadb
```

Untuk menghentikan container tanpa menghapus data:

```sh
docker compose down
```

## Menghubungkan backend lokal

Salin `backend/.env.example` menjadi `backend/.env`, lalu gunakan konfigurasi berikut (atau samakan dengan nilai di `database-container/.env`):

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=siswa_app
DB_PASSWORD=siswa_app_password
DB_NAME=db_siswa
```

Skrip inisialisasi hanya dijalankan ketika volume data masih kosong. Perubahan pada `backend/database/schema.sql` tidak diterapkan otomatis ke database yang sudah pernah diinisialisasi.

Untuk database lama, jalankan migrasi yang diperlukan secara manual. Contoh untuk menambahkan kolom foto siswa:

```sh
docker compose exec -T mariadb mariadb -u siswa_app -psiswa_app_password db_siswa < ../backend/database/migrations/001_add_foto_url.sql
```
