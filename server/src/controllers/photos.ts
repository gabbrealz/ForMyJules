import type { RequestHandler, Response } from 'express';
import * as photoService from '../services/photo';
import type { CreatePhotoInput, ListPhotosQuery, UpdatePhotoInput } from '../validators/photo';

// query: { cursor?, limit?, kind? }  (already validated into res.locals.query)
export const listPhotos: RequestHandler = async (req, res) => {
  res.json(await photoService.listPhotos(res.locals.query as ListPhotosQuery, req.user!));
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

const sendNotFound = (res: Response) => {
  res.status(404).json({ error: 'Photo not found', code: 'not_found' });
};

// body: { kind?, takenAt? }. Expects requireAuth + requireContributor to have run.
export const updatePhoto: RequestHandler<{ id: string }> = async (req, res) => {
  const result = await photoService.updatePhoto(req.params.id, req.body as UpdatePhotoInput);

  if (!result.ok) {
    sendNotFound(res);
    return;
  }
  res.json({ photo: result.photo });
};

// Expects requireAuth + requireContributor to have run.
export const deletePhoto: RequestHandler<{ id: string }> = async (req, res) => {
  const result = await photoService.deletePhoto(req.params.id);

  if (!result.ok) {
    sendNotFound(res);
    return;
  }
  res.status(204).end();
};
