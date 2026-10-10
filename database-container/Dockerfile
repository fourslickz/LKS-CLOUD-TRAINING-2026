FROM mariadb:11.4

# MariaDB menjalankan skrip ini saat direktori data pertama kali dibuat.
COPY backend/database/schema.sql /docker-entrypoint-initdb.d/01-schema.sql
