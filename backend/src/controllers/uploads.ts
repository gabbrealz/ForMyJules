import type { RequestHandler } from 'express';
import * as storageService from '../services/storage';
import * as uploadsService from '../services/uploads';

// No body. Both assets (full + thumb) are always signed.
export const signUpload: RequestHandler = async (_req, res) => {
  const storage = await storageService.getStorageStatus();

  if (!storage.uploadsAllowed) {
    res.status(507).json({
      error: 'Storage is almost full, so new uploads are disabled',
      code: 'storage_full',
      storage,
    });
    return;
  }

  res.json(uploadsService.createUploadSignatures());
};

// For the UI: remaining space next to the compression toggle.
export const getStorage: RequestHandler = async (_req, res) => {
  res.json(await storageService.getStorageStatus());
};
