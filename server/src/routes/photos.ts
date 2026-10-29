import { Router } from 'express';
import * as photosController from '../controllers/photos';
import { requireAuth } from '../middlewares/auth';
import { createPhotoLimiter } from '../middlewares/rate-limit';
import { validate } from '../middlewares/validate';
import { createPhotoSchema, listPhotosQuerySchema } from '../validators/photo';

const router = Router();

router.use(requireAuth);

// GET /api/photos?cursor=<id>&limit=40&kind=photo|graphic|sticker
// -> { photos: [{ id, kind, w, h, thumbhash, hasAlpha, takenAt, createdAt, thumbUrl, fullUrl }], nextCursor }
router.get('/', validate('query', listPhotosQuerySchema), photosController.listPhotos);

// POST /api/photos   body: see createPhotoSchema. Call only after BOTH Cloudinary uploads succeeded.
// -> 201 { photo }
router.post('/', createPhotoLimiter, validate('body', createPhotoSchema), photosController.createPhoto);

export default router;
