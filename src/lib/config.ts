// Configuration settings for the application

/**
 * JWT configuration for authentication
 */
console.log('config component loaded');
export const JWT_CONFIG = {
  // Use process.env.JWT_SECRET if defined, otherwise fall back to a secure default
  SECRET: process.env.JWT_SECRET || 'anino-secure-jwt-secret-key-2026',
  
  // Token expiration
  EXPIRES_IN: '7d',
  
  // Cookie settings
  COOKIE: {
    NAME: 'auth_token',
    MAX_AGE: 60 * 60 * 24 * 7, // 7 days in seconds
    HTTP_ONLY: true,
    PATH: '/',
    // Only set SECURE flag if using HTTPS in production
    // For HTTP-only deployment, this should be false
    SECURE: false, // Changed from process.env.NODE_ENV === 'production'
    SAME_SITE: 'lax' as 'lax' | 'strict' | 'none',
  }
};

/**
 * API configuration
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
};

