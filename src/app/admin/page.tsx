'use client';

import React, { useState } from 'react';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import AdminLoginForm from '@/components/Admin/AdminLoginForm';
import UserManagement from '@/components/Admin/UserManagement';
import Link from 'next/link';

function AdminContent() {
  const { isAdmin, isLoading, adminPassword } = useAdmin();
  const [debugMode, setDebugMode] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  if (isLoading) {
    return (
      <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div
          style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, cursor: 'pointer' }}
          onDoubleClick={toggleDebugMode}
        />
        <AdminLoginForm />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div 
        style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, cursor: 'pointer' }}
        onDoubleClick={toggleDebugMode}
      />
      
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <Link 
            href="/admin/business" 
            className="tab"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            WhatsApp Agent 🤖
          </Link>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && <UserManagement />}
      </div>
      
      {debugMode && (
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          right: 0, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px',
          fontSize: '12px',
          maxWidth: '400px',
          maxHeight: '50vh',
          overflowY: 'auto',
          zIndex: 9999,
          width: typeof window !== 'undefined' && window.innerWidth < 600 ? '100%' : 'auto'
        }}>
          <h4>Debug Info</h4>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>adminPassword: {adminPassword ? `${adminPassword.slice(0, 3)}...` : 'none'}</p>
        </div>
      )}
      
      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .admin-header {
          background: white;
          border-bottom: 1px solid #dee2e6;
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .admin-header h1 {
          margin: 0 0 1rem 0;
          color: #1a1a1a;
          font-size: 1.5rem;
        }
        
        .admin-tabs {
          display: flex;
          gap: 0.5rem;
        }
        
        .tab {
          padding: 0.5rem 1rem;
          border: 1px solid #dee2e6;
          background: white;
          color: #6c757d;
          cursor: pointer;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .tab:hover {
          background: #f8f9fa;
          color: #495057;
        }
        
        .tab.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .admin-content {
          flex: 1;
          padding: 0;
        }
        
        @media (max-width: 768px) {
          .admin-header {
            padding: 1rem;
          }
          
          .admin-header h1 {
            font-size: 1.25rem;
          }
          
          .admin-tabs {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .tab {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}
