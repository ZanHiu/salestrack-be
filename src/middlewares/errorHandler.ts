import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ERROR_CODES } from '../utils/errors';

interface MongoDuplicateError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', err);
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Du lieu khong hop le',
        details: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  const mongoErr = err as MongoDuplicateError;
  if (mongoErr && mongoErr.code === 11000) {
    res.status(409).json({
      error: {
        code: ERROR_CODES.DUPLICATE,
        message: 'Da ton tai ban ghi voi thong tin nay',
      },
    });
    return;
  }

  const e = err as { name?: string; message?: string };
  if (e?.name === 'CastError') {
    res.status(400).json({
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'ID khong hop le' },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: e?.message || 'Loi he thong',
    },
  });
}
