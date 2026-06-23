'use client';
console.log('[LOADED] AuthContext.tsx');
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  userId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Make sure we're in a browser environment before making requests
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        // Safe way to get the base URL
        let apiUrl;
        try {
          apiUrl = `${window.location.origin}/api/auth/me`;
        } catch (e) {
          console.error('Error constructing API URL:', e);
          apiUrl = '/api/auth/me'; // Fallback to relative URL
        }

        try {
          const response = await fetch(apiUrl, {
            // Include credentials to ensure cookies are sent
            credentials: 'same-origin',
            // Add cache control to prevent browser caching
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Clear any invalid auth state
            setUser(null);
            // If in production, clear any invalid cookies
            if (process.env.NODE_ENV === 'production') {
              document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
          }
        } catch (fetchError) {
          console.error('Fetch error during auth check:', fetchError);
          // Continue with application in unauthenticated state
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Safe URL construction
      let loginUrl;
      try {
        loginUrl = `${window.location.origin}/api/login`;
      } catch (e) {
        loginUrl = '/api/login'; // Fallback to relative URL
      }

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Fetch full user details from /api/auth/me
      let meUrl;
      try {
        meUrl = `${window.location.origin}/api/auth/me`;
      } catch (e) {
        meUrl = '/api/auth/me'; // Fallback to relative URL
      }

      try {
        const meResponse = await fetch(meUrl, {
          credentials: 'same-origin',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          setUser(meData.user);
        }
      } catch (fetchError) {
        console.error('Error fetching user details:', fetchError);
        // Still return success since login succeeded
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };


  const logout = async () => {
    try {
      // Safe URL construction
      let logoutUrl;
      try {
        logoutUrl = `${window.location.origin}/api/logout`;
      } catch (e) {
        logoutUrl = '/api/logout'; // Fallback to relative URL
      }

      try {
        await fetch(logoutUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
      } catch (fetchError) {
        console.error('Error calling logout API:', fetchError);
        // Continue with local logout even if API call fails
      }
      
      setUser(null);
      // Clear any auth cookies
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
