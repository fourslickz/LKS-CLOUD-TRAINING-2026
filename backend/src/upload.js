import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import multer from 'multer';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const uploadDirectory = path.resolve(currentDir, '../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${imageExtensions[file.mimetype] || ''}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      const error = new Error('Foto harus berformat JPG, PNG, atau WebP');
      error.code = 'INVALID_IMAGE_TYPE';
      return callback(error);
    }
    callback(null, true);
  }
});

export const uploadFoto = upload.single('foto');

export async function removeFoto(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) return;
  const filename = path.basename(photoUrl);
  if (!filename || filename !== photoUrl.slice('/uploads/'.length)) return;
  await fs.promises.rm(path.join(uploadDirectory, filename), { force: true });
}
