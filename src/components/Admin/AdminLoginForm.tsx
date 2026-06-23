'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import './AdminLoginForm.css';

const AdminLoginForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Submitting admin login form...');
      const result = await login(password);
      console.log('Login result:', result);
      
      if (!result.success) {
        // If there's a specific error message, use it
        if (result.error) {
          setError(result.error);
        } else {
          // Otherwise, show a generic message about the password
          setError('Invalid admin password. Check your .env.local file for the correct password.');
        }
      }
    } catch (err) {
      console.error('Login form error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-password">Admin Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button 
            type="submit" 
            className="admin-login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginForm;