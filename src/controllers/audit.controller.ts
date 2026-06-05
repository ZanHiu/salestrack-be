import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';
import { listAuditQuerySchema } from '../schemas/audit.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listAuditQuerySchema.parse(req.query);
    const result = await auditService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
