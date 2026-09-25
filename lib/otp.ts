import { createHash, randomInt } from 'crypto';

/** 4-digit numeric OTP — short enough to read off a notification, long
 * enough that guessing isn't practical within the short expiry window. */
export function generateOtp(): string {
  return String(randomInt(1000, 10000));
}

/** We only ever need to compare, never recover the OTP — a plain SHA-256
 * hash (no bcrypt dependency needed) is sufficient for a value this short-
 * lived (see expires_at on delivery_otp). */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export function verifyOtp(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}
