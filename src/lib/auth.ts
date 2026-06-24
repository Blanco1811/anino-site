import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

console.log('auth component loaded');

/**
 * Hash password using bcryptjs (asynchronously).
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Legacy SHA-256 hash function (synchronous) for fallback validation.
 */
export function legacyHashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Compare password against a hash asynchronously.
 * Supports standard Bcrypt hashes (starting with $2a$, $2b$, or $2y$) and falls back to SHA-256.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<{ isValid: boolean; needsUpgrade: boolean }> {
  // Check if hash matches standard bcrypt signature
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    const isValid = await bcrypt.compare(password, hash);
    return { isValid, needsUpgrade: false };
  }

  // Fallback to legacy SHA-256
  const legacyHash = legacyHashPassword(password);
  const isValid = legacyHash === hash;
  return { isValid, needsUpgrade: isValid };
}

/**
 * Password validation function.
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { isValid: true };
}
