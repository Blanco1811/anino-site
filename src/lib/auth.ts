import { createHash } from 'crypto';
console.log('auth component loaded');
// Simple password hashing function
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Password validation function
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { isValid: true };
}
