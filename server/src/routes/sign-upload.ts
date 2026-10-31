import { Router } from 'express';
import * as uploadsController from '../controllers/uploads';
import { requireAuth, requireContributor } from '../middlewares/auth';
import { signUploadLimiter } from '../middlewares/rate-limit';

const router = Router();

// Uploading is for admins and partners only; guests are view-only.

// POST /api/uploads/sign   (no body)
// Returns one signature each for `full` and `thumb`. Rate limited, and refused with 507 when
// Cloudinary storage is past the guard threshold.
router.post('/sign', requireAuth, requireContributor, signUploadLimiter, uploadsController.signUpload);

// GET /api/uploads/storage -> { usedBytes, budgetBytes, remainingBytes, usedRatio, uploadsAllowed }
// Only useful next to the upload UI, so it follows the same rule as uploading.
router.get('/storage', requireAuth, requireContributor, uploadsController.getStorage);

export default router;
