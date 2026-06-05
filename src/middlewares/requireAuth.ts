import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ERROR_CODES } from '../utils/errors';

interface JwtPayload {
  userId: string;
  role: 'admin' | 'staff';
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: ERROR_CODES.UNAUTHORIZED, message: 'Thieu token' },
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: 'User không tồn tại' },
      });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: 'Tài khoản đã bị vô hiệu hóa' },
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      fullName: user.fullName,
    };
    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    const code = isExpired ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.TOKEN_INVALID;
    const message = isExpired ? 'Token het han' : 'Token khong hop le';
    res.status(401).json({ error: { code, message } });
  }
}
