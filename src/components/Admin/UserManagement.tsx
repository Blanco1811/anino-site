'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import './UserManagement.css';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

const UserManagement: React.FC = () => {
  const { adminPassword, isAdmin, logout } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${window.location.origin}/api/admin/users`, {
        headers: {
          'X-Admin-Password': adminPassword
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('Fetched users data:', data);
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, adminPassword]);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return null; // Don't render anything if not admin
  }

  const [showRawData, setShowRawData] = useState(false);

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>User Management</h1>
        <div className="header-actions">
          <button 
            className="debug-button"
            onClick={() => setShowRawData(!showRawData)}
            style={{ marginRight: '10px', background: '#555' }}
          >
            {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
          </button>
          <button className="logout-button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Raw data display for debugging */}
      {showRawData && (
        <div className="raw-data-container" style={{ 
          padding: '15px', 
          background: '#f5f5f5', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '20px',
          overflow: 'auto'
        }}>
          <h3>Raw Users Data:</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(users, null, 2)}
          </pre>
          <div style={{ marginTop: '15px' }}>
            <button onClick={fetchUsers} className="reload-button">
              Reload Data
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-indicator">Loading users...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-results">
                    {users.length > 0 
                      ? 'No matching users found. Try clearing the search.'
                      : 'No users found in the database.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td data-label="Name">{user.firstName} {user.lastName}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Phone">{user.phone || '-'}</td>
                    <td data-label="Created">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;