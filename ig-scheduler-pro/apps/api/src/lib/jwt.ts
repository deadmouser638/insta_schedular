import jwt from 'jsonwebtoken';

export function signAccessToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; email: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { userId: string };
}
