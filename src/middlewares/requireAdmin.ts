import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES } from '../utils/errors';

/** Requires requireAuth to run first. Allows only role === 'admin'. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: { code: ERROR_CODES.UNAUTHORIZED, message: 'Chưa đăng nhập' },
    });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Chỉ admin mới được truy cập' },
    });
    return;
  }
  next();
}
