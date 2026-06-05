import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/requireAuth';
import { ERROR_CODES } from '../utils/errors';

const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: ERROR_CODES.RATE_LIMIT,
      message: 'Qua nhieu lan thu. Vui long doi 1 phut.',
    },
  },
});

const router = Router();

router.post('/login', authRateLimit, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/password', requireAuth, authController.changePassword);
router.patch('/profile', requireAuth, authController.updateProfile);

export default router;
