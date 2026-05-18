import { Router } from 'express';
import multer from 'multer';
import * as salesEntryController from '../controllers/salesEntry.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get('/', salesEntryController.list);
router.post('/', salesEntryController.upsert);
router.post('/bulk-import', upload.single('file'), salesEntryController.bulkImport);
router.patch('/:id', salesEntryController.update);
router.delete('/:id', salesEntryController.remove);

export default router;
