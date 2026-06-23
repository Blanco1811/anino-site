'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiMail, FiLock, FiCheckCircle } from 'react-icons/fi';
import './LoginForm.css';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  isVisible: boolean;
  onLoginSuccess?: () => void;
  onRegisterClick: () => void;
  onClose?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  isVisible, 
  onLoginSuccess,
  onRegisterClick
}) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = t('login.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('login.errors.emailInvalid');
    }
    
    if (!formData.password) {
      errors.password = t('login.errors.passwordRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setApiError(null);
    
    try {
      // Authenticate via context
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        throw new Error(result.error);
      }
      setIsSuccess(true);
      // Reset form and notify parent component
      setTimeout(() => {
        setFormData({ email: '', password: '', rememberMe: false });
        setIsSuccess(false);
        setIsSubmitting(false);
        if (onLoginSuccess) onLoginSuccess();
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
      console.error('Login error:', error);
      setApiError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleForgotPassword = async () => {
    
    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordMessage('Please enter your email address');
      setForgotPasswordStatus('error');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setForgotPasswordMessage('Please enter a valid email address');
      setForgotPasswordStatus('error');
      return;
    }

    setForgotPasswordStatus('loading');
    setForgotPasswordMessage('');

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordStatus('success');
        setForgotPasswordMessage(data.message);
      } else {
        setForgotPasswordStatus('error');
        setForgotPasswordMessage(data.error || 'An error occurred');
      }
    } catch (error) {
      setForgotPasswordStatus('error');
      setForgotPasswordMessage('An unexpected error occurred');
      console.error('Forgot password error:', error);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { 
        opacity: { duration: 0.3 },
        height: { duration: 0.4 }
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: { 
        opacity: { duration: 0.2 },
        height: { duration: 0.3 }
      }
    }
  };

  const renderForm = () => {
    if (showForgotPassword) {
      return (
        <div className="forgot-password-form">
          <h3>{t('login.forgotPasswordTitle', 'Reset Password')}</h3>
          <p>{t('login.forgotPasswordSubtitle', 'Enter your email address and we\'ll send you a link to reset your password.')}</p>
          
          <div className="form-group">
            <label htmlFor="forgotPasswordEmail">
              <FiMail className="input-icon" />
              {t('login.email')}
            </label>
            <input
              type="email"
              id="forgotPasswordEmail"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className={forgotPasswordStatus === 'error' ? 'error' : ''}
            />
          </div>

          {forgotPasswordMessage && (
            <div className={`message ${forgotPasswordStatus === 'success' ? 'success-message' : 'error-message'}`}>
              {forgotPasswordMessage}
            </div>
          )}

          <div className="forgot-password-actions">
            <button 
              type="button" 
              className="reset-button"
              onClick={handleForgotPassword}
              disabled={forgotPasswordStatus === 'loading'}
            >
              {forgotPasswordStatus === 'loading' ? t('login.sending', 'Sending...') : t('login.sendResetLink', 'Send Reset Link')}
            </button>
            
            <button 
              type="button" 
              className="back-to-login"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
                setForgotPasswordMessage('');
                setForgotPasswordStatus('idle');
              }}
            >
              {t('login.backToLogin', 'Back to Login')}
            </button>
          </div>
        </div>
      );
    }

    if (isSuccess) {
      return (
        <div className="success-message">
          <FiCheckCircle className="success-icon" />
          <h3>{t('login.successTitle')}</h3>
          <p>{t('login.successMessage')}</p>
        </div>
      );
    }
    
    if (apiError) {
      return (
        <div className="error-container">
          <div className="api-error-message">{apiError}</div>
          <button 
            className="retry-button"
            onClick={() => setApiError(null)}
          >
            {t('login.retry')}
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="form-group">
          <label htmlFor="email">
            <FiMail className="input-icon" />
            {t('login.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('login.emailPlaceholder')}
            className={formErrors.email ? 'error' : ''}
          />
          {formErrors.email && <div className="error-message">{formErrors.email}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            <FiLock className="input-icon" />
            {t('login.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t('login.passwordPlaceholder')}
            className={formErrors.password ? 'error' : ''}
          />
          {formErrors.password && <div className="error-message">{formErrors.password}</div>}
        </div>
        
        <div className="form-options">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <label htmlFor="rememberMe">{t('login.rememberMe')}</label>
          </div>
          
          <button 
            type="button" 
            className="forgot-password"
            onClick={() => setShowForgotPassword(true)}
          >
            {t('login.forgotPassword')}
          </button>
        </div>
        
        <button 
          type="submit" 
          className="login-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </button>
        
        <div className="register-prompt">
          <p>{t('login.noAccount')}</p>
          <button 
            type="button" 
            className="register-link"
            onClick={onRegisterClick}
          >
            {t('login.register')}
          </button>
        </div>
      </>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="inline-login-container"
          variants={formVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="login-header">
            <h2>{t('login.title')}</h2>
            <p>{t('login.subtitle')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            {renderForm()}
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginForm;
