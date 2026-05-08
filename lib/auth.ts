import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SECRET = process.env.JWT_SECRET || 'gms-secret-key-change-in-prod';

export async function hashPassword(pw: string) { return bcrypt.hash(pw, 12); }
export async function comparePassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}
export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}
export async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get('gms_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
