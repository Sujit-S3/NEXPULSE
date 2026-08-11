import multer from 'multer';
import path from 'node:path';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
  if (allowedExts.includes(ext)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, AVIF`));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export const UPLOAD_CONFIG = {
  maxSize: MAX_SIZE,
  allowedMimes: ALLOWED_MIMES,
};
