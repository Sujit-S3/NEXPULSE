import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { Readable } from 'node:stream';
import { config } from '../../config/env.js';
import { logger } from '../../logger/index.js';

let initialized = false;

function initialize(): void {
  if (initialized) return;

  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.warn('Cloudinary not configured — image upload is disabled. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable.');
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  initialized = true;
}

function isConfigured(): boolean {
  if (!initialized) initialize();
  return initialized;
}

function generatePublicId(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  return `${sanitized}-${timestamp}-${random}`;
}

const DEFAULT_OPTIONS: UploadApiOptions = {
  resource_type: 'image',
  format: 'auto',
  quality: 'auto',
  secure: true,
  overwrite: false,
  unique_filename: false,
};

export const cloudinaryService = {
  async uploadImage(
    filePath: string,
    folder = 'uploads',
  ): Promise<{ url: string; publicId: string }> {
    if (!isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const publicId = generatePublicId(filePath);
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      ...DEFAULT_OPTIONS,
      folder,
      public_id: publicId,
    });

    return { url: result.secure_url, publicId: result.public_id };
  },

  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
  ): Promise<{ url: string; publicId: string }> {
    if (!isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const publicId = generatePublicId(originalName);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          ...DEFAULT_OPTIONS,
          folder,
          public_id: publicId,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result) {
            reject(new Error('Upload returned no result'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
  },

  async uploadImages(
    files: { buffer: Buffer; originalname: string }[],
    folder = 'uploads',
  ): Promise<{ url: string; publicId: string }[]> {
    if (!isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const results = await Promise.allSettled(
      files.map((f) => this.uploadBuffer(f.buffer, f.originalname, folder)),
    );

    const uploaded: { url: string; publicId: string }[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value);
      } else {
        logger.error('Cloudinary batch upload failed', { error: result.reason?.message });
      }
    }
    return uploaded;
  },

  async deleteImage(publicId: string): Promise<void> {
    if (!isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok') {
      logger.error('Cloudinary delete failed', { publicId, result: result.result });
      throw new Error(`Failed to delete image: ${result.result}`);
    }
  },

  async deleteImages(publicIds: string[]): Promise<void> {
    if (!isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const results = await Promise.allSettled(publicIds.map((id) => this.deleteImage(id)));
    const errors = results.filter((r) => r.status === 'rejected');
    if (errors.length > 0) {
      logger.error('Cloudinary batch delete had errors', { errorCount: errors.length });
      throw new Error(`${errors.length} image(s) failed to delete`);
    }
  },

  isConfigured(): boolean {
    return isConfigured();
  },
};
