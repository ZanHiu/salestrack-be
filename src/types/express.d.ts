import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'staff';
        fullName: string;
      };
    }
  }
}

export {};
