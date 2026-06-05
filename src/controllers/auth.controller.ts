import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import * as authService from '../services/auth.service';
import * as audit from '../services/audit.service';
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/auth.schema';
import { unauthorized } from '../utils/errors';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const user = await User.findById(req.user.id);
    if (!user) throw unauthorized();

    res.status(200).json({
      data: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.user) {
    await audit.record({
      action: 'logout',
      resource: 'auth',
      userId: req.user.id,
    });
  }
  res.status(204).end();
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, dto);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const dto = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user.id, dto);
    res.status(200).json({
      data: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
