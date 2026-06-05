import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { requireAdmin } from '../middlewares/requireAdmin';

const router = Router();

router.use(requireAdmin);
router.get('/', auditController.list);

export default router;
