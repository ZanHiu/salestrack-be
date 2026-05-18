import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customer.service';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from '../schemas/customer.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await customerService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customer = await customerService.getById(req.params.id);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = createCustomerSchema.parse(req.body);
    const customer = await customerService.create(dto);
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(req.params.id, dto);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await customerService.remove(req.params.id);
    if (result.softDeleted) {
      res.status(200).json({ data: { softDeleted: true } });
    } else {
      res.status(204).end();
    }
  } catch (err) {
    next(err);
  }
}
