import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { unauthorized, validationError } from '../utils/errors';
import type { LoginDto, ChangePasswordDto } from '../schemas/auth.schema';

interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: 'admin' | 'staff';
  };
}

function signToken(user: IUser): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign({ userId: user._id.toString(), role: user.role }, secret, { expiresIn });
}

export async function login(dto: LoginDto): Promise<LoginResult> {
  const user = await User.findOne({ username: dto.username.toLowerCase() });
  if (!user) {
    throw unauthorized('Tai khoan hoac mat khau khong dung');
  }

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    throw unauthorized('Tai khoan hoac mat khau khong dung');
  }

  const token = signToken(user);
  return {
    token,
    user: {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

export async function changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw unauthorized('User khong ton tai');

  const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
  if (!ok) {
    throw validationError('Mat khau hien tai khong dung');
  }

  user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
  await user.save();
}
