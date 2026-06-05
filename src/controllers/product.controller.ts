import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '../schemas/product.schema';
import { unauthorized } from '../utils/errors';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await productService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await productService.listCategories();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function renameCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { oldName, newName, newOrder } = req.body as {
      oldName: string;
      newName: string;
      newOrder: number;
    };
    if (!oldName || typeof oldName !== 'string') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'oldName là bắt buộc' } });
      return;
    }
    if (!newName || typeof newName !== 'string') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'newName là bắt buộc' } });
      return;
    }
    const orderNum = Number(newOrder);
    if (!Number.isInteger(orderNum) || orderNum < 1 || orderNum > 99) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'newOrder phải là số nguyên 1-99' } });
      return;
    }
    if (!req.user) throw unauthorized();
    const result = await productService.renameCategory(oldName, newName, orderNum, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
      return;
    }
    next(err);
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const name = decodeURIComponent(req.params.name);
    const result = await productService.deleteCategory(name, req.user.id);
    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      res.status(409).json({ error: { code: 'HAS_REFERENCES', message: err.message } });
      return;
    }
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.getById(req.params.id);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = createProductSchema.parse(req.body);
    const product = await productService.create(dto, req.user.id);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = updateProductSchema.parse(req.body);
    const product = await productService.update(req.params.id, dto, req.user.id);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const result = await productService.remove(req.params.id, req.user.id);
    if (result.softDeleted) {
      res.status(200).json({ data: { softDeleted: true } });
    } else {
      res.status(204).end();
    }
  } catch (err) {
    next(err);
  }
}
