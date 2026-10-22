import { Router } from 'express';
import * as uploadsController from '../controllers/uploads';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// POST /api/uploads/sign   body: { withOriginal?: boolean }
// Returns one signature per file the browser is allowed to upload.
router.post('/uploads/sign', requireAuth, uploadsController.signUpload);

export default router;
