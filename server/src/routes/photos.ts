import { Router } from 'express';
import * as photosController from '../controllers/photos';
import { requireAuth, requireContributor } from '../middlewares/auth';
import { createPhotoLimiter, deletePhotoLimiter } from '../middlewares/rate-limit';
import { validate } from '../middlewares/validate';
import {
  createPhotoSchema,
  listPhotosQuerySchema,
  photoIdParamSchema,
  updatePhotoSchema,
} from '../validators/photo';

const router = Router();

router.use(requireAuth);

// Viewing is open to every approved role, guests included.
// Writing (create / edit / delete) needs admin or partner, and applies to any photo.

// GET /api/photos?cursor=<id>&limit=40&kind=photo|graphic|sticker
// -> { photos: [{ id, kind, w, h, thumbhash, hasAlpha, takenAt, createdAt, thumbUrl, fullUrl }], nextCursor }
router.get('/', validate('query', listPhotosQuerySchema), photosController.listPhotos);

// POST /api/photos   body: see createPhotoSchema. Call only after BOTH Cloudinary uploads succeeded.
// -> 201 { photo }
router.post(
  '/',
  requireContributor,
  createPhotoLimiter,
  validate('body', createPhotoSchema),
  photosController.createPhoto,
);

// PATCH /api/photos/:id   body: { kind?, takenAt? }  (takenAt: null clears it)
// -> 200 { photo }
router.patch(
  '/:id',
  requireContributor,
  validate('params', photoIdParamSchema),
  validate('body', updatePhotoSchema),
  photosController.updatePhoto,
);

// DELETE /api/photos/:id  -> 204. Removes the record and both Cloudinary assets.
router.delete(
  '/:id',
  requireContributor,
  deletePhotoLimiter,
  validate('params', photoIdParamSchema),
  photosController.deletePhoto,
);

export default router;
