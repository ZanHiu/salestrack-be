import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import { unauthorized } from '../utils/errors';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await userService.list();
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = createUserSchema.parse(req.body);
    const user = await userService.create(dto, req.user.id);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = updateUserSchema.parse(req.body);
    const user = await userService.update(req.params.id, dto, req.user.id);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const user = await userService.deactivate(req.params.id, req.user.id);
    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
}
