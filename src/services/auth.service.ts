import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { unauthorized, validationError } from '../utils/errors';
import * as audit from './audit.service';
import type {
  LoginDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from '../schemas/auth.schema';

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
    await audit.record({
      action: 'login_failed',
      resource: 'auth',
      userFullNameOverride: dto.username,
      metadata: { reason: 'unknown_user' },
    });
    throw unauthorized('Tài khoản hoặc mật khẩu không đúng');
  }

  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    await audit.record({
      action: 'login_failed',
      resource: 'auth',
      userId: user._id.toString(),
      userFullNameOverride: user.fullName,
      userRoleOverride: user.role,
      metadata: { reason: 'wrong_password' },
    });
    throw unauthorized('Tài khoản hoặc mật khẩu không đúng');
  }

  if (!user.isActive) {
    await audit.record({
      action: 'login_failed',
      resource: 'auth',
      userId: user._id.toString(),
      userFullNameOverride: user.fullName,
      userRoleOverride: user.role,
      metadata: { reason: 'inactive' },
    });
    throw unauthorized('Tài khoản đã bị vô hiệu hóa');
  }

  const token = signToken(user);
  await audit.record({
    action: 'login',
    resource: 'auth',
    userId: user._id.toString(),
  });
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
  await audit.record({
    action: 'password_change',
    resource: 'auth',
    userId,
  });
}

export async function updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUser> {
  const existing = await User.findById(userId);
  if (!existing) throw unauthorized('User không tồn tại');
  const oldFullName = existing.fullName;

  const user = await User.findByIdAndUpdate(
    userId,
    { fullName: dto.fullName },
    { new: true, runValidators: true },
  );
  if (!user) throw unauthorized('User không tồn tại');

  if (oldFullName !== dto.fullName) {
    await audit.record({
      action: 'profile_update',
      resource: 'auth',
      userId,
      changes: [{ field: 'fullName', before: oldFullName, after: dto.fullName }],
    });
  }

  return user;
}
