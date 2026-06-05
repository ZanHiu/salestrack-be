import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User';
import { notFound, duplicate, validationError } from '../utils/errors';
import * as audit from './audit.service';
import { diff } from './audit.service';
import type { CreateUserDto, UpdateUserDto } from '../schemas/user.schema';

export async function list(): Promise<IUser[]> {
  return User.find({}).sort({ createdAt: 1 });
}

export async function getById(id: string): Promise<IUser> {
  const user = await User.findById(id);
  if (!user) throw notFound('Không tìm thấy người dùng');
  return user;
}

export async function create(dto: CreateUserDto, actorId: string): Promise<IUser> {
  const exists = await User.findOne({ username: dto.username });
  if (exists) throw duplicate('Tên tài khoản đã tồn tại');

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const user = await User.create({
    username: dto.username,
    passwordHash,
    fullName: dto.fullName,
    role: dto.role,
    isActive: true,
  });

  await audit.record({
    userId: actorId,
    action: 'create',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: `${user.username} (${user.fullName})`,
    changes: [
      { field: 'username', after: user.username },
      { field: 'fullName', after: user.fullName },
      { field: 'role', after: user.role },
    ],
  });

  return user;
}

export async function update(
  id: string,
  dto: UpdateUserDto,
  actorId: string,
): Promise<IUser> {
  const user = await User.findById(id);
  if (!user) throw notFound('Không tìm thấy người dùng');

  const before = {
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
  };

  if (dto.fullName !== undefined) user.fullName = dto.fullName;
  if (dto.role !== undefined) user.role = dto.role;
  if (dto.isActive !== undefined) user.isActive = dto.isActive;
  const passwordChanged = dto.newPassword !== undefined;
  if (passwordChanged) {
    user.passwordHash = await bcrypt.hash(dto.newPassword!, 10);
  }
  await user.save();

  const changes = diff(before, {
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
  });
  if (passwordChanged) {
    changes.push({ field: 'password', after: '(changed)' });
  }
  if (changes.length > 0) {
    await audit.record({
      userId: actorId,
      action: 'update',
      resource: 'user',
      resourceId: user._id.toString(),
      resourceLabel: `${user.username} (${user.fullName})`,
      changes,
    });
  }

  return user;
}

export async function deactivate(
  id: string,
  currentUserId: string,
): Promise<IUser> {
  if (id === currentUserId) {
    throw validationError('Không thể vô hiệu hóa chính mình');
  }
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!user) throw notFound('Không tìm thấy người dùng');

  await audit.record({
    userId: currentUserId,
    action: 'deactivate',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: `${user.username} (${user.fullName})`,
  });

  return user;
}
