import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../config/jwt.js';

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (!user.status) throw Object.assign(new Error('Account is inactive'), { status: 403 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = { id: user.id, email: user.email, role: user.role, permissions: user.permissions };
  return {
    token: signAccessToken(payload),
    refreshToken: signRefreshToken({ id: user.id }),
    user: sanitizeUser(user),
  };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.status) throw Object.assign(new Error('User not found'), { status: 401 });

  const tokenPayload = { id: user.id, email: user.email, role: user.role, permissions: user.permissions };
  return {
    token: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken({ id: user.id }),
    user: sanitizeUser(user),
  };
}

export async function getMe(userId) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return sanitizeUser(user);
}

export function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
