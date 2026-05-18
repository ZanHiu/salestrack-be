export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  HAS_REFERENCES: 'HAS_REFERENCES',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const unauthorized = (message = 'Khong co quyen truy cap') =>
  new AppError(401, ERROR_CODES.UNAUTHORIZED, message);

export const notFound = (message = 'Khong tim thay') =>
  new AppError(404, ERROR_CODES.NOT_FOUND, message);

export const validationError = (message = 'Du lieu khong hop le') =>
  new AppError(400, ERROR_CODES.VALIDATION_ERROR, message);

export const duplicate = (message = 'Da ton tai ban ghi nay') =>
  new AppError(409, ERROR_CODES.DUPLICATE, message);
