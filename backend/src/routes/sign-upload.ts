import { Router } from 'express';
import * as uploadsController from '../controllers/uploads';
import { requireAuth } from '../middlewares/auth';
import { signUploadLimiter } from '../middlewares/rate-limit';

const router = Router();

// POST /api/uploads/sign   (no body)
// Returns one signature each for `full` and `thumb`. Rate limited, and refused with 507 when
// Cloudinary storage is past the guard threshold.
router.post('/sign', requireAuth, signUploadLimiter, uploadsController.signUpload);

// GET /api/uploads/storage -> { usedBytes, budgetBytes, remainingBytes, usedRatio, uploadsAllowed }
router.get('/storage', requireAuth, uploadsController.getStorage);

export default router;
