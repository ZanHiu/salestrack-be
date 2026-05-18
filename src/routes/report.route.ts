import { Router } from 'express';
import * as reportController from '../controllers/report.controller';

const router = Router();

router.get('/by-product', reportController.byProduct);
router.get('/by-customer', reportController.byCustomer);
router.get('/export-excel', reportController.exportExcel);

export default router;
