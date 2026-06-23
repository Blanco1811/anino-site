'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  adminPassword: string;
  setAdminPassword: (password: string) => void;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = async (password: string) => {
    try {
      console.log('Attempting admin login with password...');
      
      // Make a test request to the users API with the password
      const response = await fetch(`${window.location.origin}/api/admin/users`, {
        headers: {
          'X-Admin-Password': password
        }
      });

      console.log('Admin login response status:', response.status);
      
      if (response.ok) {
        // Try to parse the response to verify it's properly formatted
        const data = await response.json();
        console.log('Admin login response data:', data);
        
        // Store the password for future requests
        setAdminPassword(password);
        setIsAdmin(true);
        // Store in sessionStorage (cleared when browser is closed)
        sessionStorage.setItem('adminPassword', password);
        return { success: true };
      }

      console.log('Admin login failed - invalid password');
      return { success: false, error: 'Invalid admin password' };
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = () => {
    setAdminPassword('');
    setIsAdmin(false);
    sessionStorage.removeItem('adminPassword');
  };

  // Check for admin password in sessionStorage on mount
  React.useEffect(() => {
    const checkSavedPassword = async () => {
      const savedPassword = sessionStorage.getItem('adminPassword');
      console.log('Found saved admin password in sessionStorage:', savedPassword ? '✓' : '✗');

      if (savedPassword) {
        console.log('Attempting to login with saved password');
        await login(savedPassword);
      }

      setIsLoading(false);
    };

    checkSavedPassword();
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isLoading,
        adminPassword,
        setAdminPassword,
        login,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};