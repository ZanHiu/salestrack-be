import { Router } from 'express';
import * as productController from '../controllers/product.controller';

const router = Router();

router.get('/categories', productController.listCategories);
router.get('/', productController.list);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.patch('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
