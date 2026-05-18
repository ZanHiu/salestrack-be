import { Request, Response, NextFunction } from 'express';
import * as salesEntryService from '../services/salesEntry.service';
import * as bulkImportService from '../services/bulkImport.service';
import {
  upsertEntrySchema,
  updateEntrySchema,
  listEntriesQuerySchema,
} from '../schemas/salesEntry.schema';
import { unauthorized, validationError } from '../utils/errors';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listEntriesQuerySchema.parse(req.query);
    const data = await salesEntryService.list(query);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = upsertEntrySchema.parse(req.body);
    const entry = await salesEntryService.upsert(dto, req.user.id);
    res.status(200).json({ data: entry });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = updateEntrySchema.parse(req.body);
    const entry = await salesEntryService.update(req.params.id, dto, req.user.id);
    res.status(200).json({ data: entry });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await salesEntryService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function bulkImport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    if (!req.file) throw validationError('Thieu file upload');

    const year = Number(req.body.year);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      throw validationError('Truong "year" phai la so nguyen 2020-2100');
    }

    const result = await bulkImportService.importFromBuffer(
      req.file.buffer,
      year,
      req.user.id,
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
