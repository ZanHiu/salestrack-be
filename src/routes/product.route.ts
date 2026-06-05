import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { requireAdmin } from '../middlewares/requireAdmin';

const router = Router();

router.get('/categories', productController.listCategories);
router.patch('/categories/rename', requireAdmin, productController.renameCategory);
router.delete('/categories/:name', requireAdmin, productController.deleteCategory);
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.post('/', requireAdmin, productController.create);
router.patch('/:id', requireAdmin, productController.update);
router.delete('/:id', requireAdmin, productController.remove);

export default router;
