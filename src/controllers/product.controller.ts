import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '../schemas/product.schema';

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
    const dto = createProductSchema.parse(req.body);
    const product = await productService.create(dto);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = updateProductSchema.parse(req.body);
    const product = await productService.update(req.params.id, dto);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await productService.remove(req.params.id);
    if (result.softDeleted) {
      res.status(200).json({ data: { softDeleted: true } });
    } else {
      res.status(204).end();
    }
  } catch (err) {
    next(err);
  }
}
