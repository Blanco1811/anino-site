'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiLogIn, FiLogOut, FiUser, FiChevronDown, FiDollarSign } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '../LoginForm/LoginForm';
import './LoginButton.css';

interface LoginButtonProps {
  isMobile?: boolean;
  onLoginClick?: () => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({ isMobile = false, onLoginClick }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginFormVisible, setIsLoginFormVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 'calc(100% + 0.75rem)', right: '0', left: 'auto', bottom: 'auto' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      setIsLoginFormVisible(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
  };

  const handleCampaignManagement = () => {
    router.push('/campaigns/manage');
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  const handleLoginSuccess = () => {
    setIsLoginFormVisible(false);
  };

  // Calculate popup position to ensure it stays within viewport
  useEffect(() => {
    if (isLoginFormVisible && buttonRef.current && popupRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check if popup would be positioned outside the viewport
      let topPosition = 'calc(100% + 0.75rem)';
      let bottomPosition = 'auto';
      
      // Check if popup would extend beyond bottom of viewport
      if (buttonRect.bottom + popupRect.height > viewportHeight) {
        // Position popup above the button instead of below
        topPosition = 'auto';
        bottomPosition = 'calc(100% + 0.75rem)';
      }
      
      // Check horizontal positioning
      if (buttonRect.right - popupRect.width < 0) {
        // Position popup to the right of the button
        setPopupPosition({
          top: topPosition,
          bottom: bottomPosition,
          right: 'auto',
          left: '0'
        });
      } else if (buttonRect.right + popupRect.width > viewportWidth) {
        // Position popup to the left side to keep it in viewport
        const rightOffset = viewportWidth - buttonRect.right;
        setPopupPosition({
          top: topPosition,
          bottom: bottomPosition,
          right: `${rightOffset}px`,
          left: 'auto'
        });
      } else {
        // Default positioning
        setPopupPosition({
          top: topPosition,
          bottom: bottomPosition,
          right: '0',
          left: 'auto'
        });
      }
    }
  }, [isLoginFormVisible]);

  if (isMobile) {
    // Mobile version
    return (
      <>
        {isAuthenticated ? (
          <div className="mobile-user-section">
            <div className="mobile-user-greeting">
              <FiUser className="user-icon" />
              <span>{t('header.greeting', { name: user?.name ? user.name.split(' ')[0] : 'User' })}</span>
            </div>
            <button 
              className="mobile-campaign-button"
              onClick={handleCampaignManagement}
            >
              <FiDollarSign />
              <span>{t('campaigns.manage', 'Manage Campaigns')}</span>
            </button>
            <button 
              className="mobile-logout-button"
              onClick={handleLogout}
            >
              <FiLogOut />
              <span>{t('header.logout')}</span>
            </button>
          </div>
        ) : (
          <button 
            className="mobile-login-button"
            onClick={handleLoginClick}
          >
            <FiLogIn />
            <span>{t('header.login')}</span>
          </button>
        )}
      </>
    );
  }

  // Desktop version
  return (
    <div className="login-button-container">
      {isAuthenticated ? (
        <div className="user-menu">
          <motion.button 
            className="user-button"
            onClick={toggleDropdown}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiUser className="user-icon" />
            <span className="user-name">{user?.name ? user.name.split(' ')[0] : 'User'}</span>
            <FiChevronDown className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
          </motion.button>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                className="user-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{user?.name || 'User'}</span>
                  <span className="dropdown-user-email">{user?.email || ''}</span>
                </div>
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-campaign-button"
                  onClick={handleCampaignManagement}
                >
                  <FiDollarSign />
                  <span>{t('campaigns.manage', 'Manage Campaigns')}</span>
                </button>
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-logout-button"
                  onClick={handleLogout}
                >
                  <FiLogOut />
                  <span>{t('header.logout')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.button 
          className="login-button"
          onClick={handleLoginClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          ref={buttonRef}
        >
          <FiLogIn className="login-icon" />
          <span>{t('header.login')}</span>
        </motion.button>
      )}
      
      {/* Login Form Popup */}
      <AnimatePresence>
        {isLoginFormVisible && !isAuthenticated && (
          <motion.div 
            className="login-form-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            ref={popupRef}
            style={{
              top: popupPosition.top,
              right: popupPosition.right,
              left: popupPosition.left,
              bottom: popupPosition.bottom
            }}
          >
            <button
              type="button"
              className="login-form-close"
              aria-label="Close login form"
              onClick={() => setIsLoginFormVisible(false)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: 24,
                cursor: 'pointer',
                zIndex: 2
              }}
            >
              ×
            </button>
            <LoginForm 
              isVisible={true} 
              onLoginSuccess={handleLoginSuccess}
              onRegisterClick={() => {
                setIsLoginFormVisible(false);
                window.location.href = '#cta';
              }}
              onClose={() => setIsLoginFormVisible(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginButton;
