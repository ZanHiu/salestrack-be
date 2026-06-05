import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { requireAdmin } from '../middlewares/requireAdmin';

const router = Router();

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.post('/', requireAdmin, customerController.create);
router.patch('/:id', requireAdmin, customerController.update);
router.delete('/:id', requireAdmin, customerController.remove);

export default router;
