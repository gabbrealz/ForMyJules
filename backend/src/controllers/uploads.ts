import type { RequestHandler } from 'express';
import * as uploadsService from '../services/uploads';

// body: { withOriginal?: boolean }
export const signUpload: RequestHandler = (req, res) => {
  const withOriginal = Boolean(req.body?.withOriginal);
  res.json(uploadsService.createUploadSignatures({ withOriginal }));
};
