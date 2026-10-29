import type { RequestHandler } from 'express';
import * as photoService from '../services/photo';
import type { CreatePhotoInput, ListPhotosQuery } from '../validators/photo';

// query: { cursor?, limit?, kind? }  (already validated into res.locals.query)
export const listPhotos: RequestHandler = async (_req, res) => {
  res.json(await photoService.listPhotos(res.locals.query as ListPhotosQuery));
};

// Expects requireAuth to have run, which sets req.user.
export const createPhoto: RequestHandler = async (req, res) => {
  const result = await photoService.createPhoto(req.user!.id, req.body as CreatePhotoInput);

  if (!result.ok) {
    switch (result.reason) {
      case 'already_saved':
        res.status(409).json({ error: 'This photo has already been saved', code: 'already_saved' });
        return;
      case 'assets_missing':
        res.status(422).json({
          error: 'The uploaded files were not found on Cloudinary. Finish both uploads, then try again.',
          code: 'assets_missing',
        });
        return;
      case 'invalid_assets':
        res.status(422).json({ error: result.message, code: 'invalid_assets' });
        return;
    }
  }

  res.status(201).json({ photo: result.photo });
};
