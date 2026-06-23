'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiMail, FiLock, FiPhone, FiUser, FiCheckCircle } from 'react-icons/fi';
import './RegistrationForm.css';

interface RegistrationFormProps {
  isVisible: boolean;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ isVisible }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreeTerms: false
  });
  const [formStep, setFormStep] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const validateStep = () => {
    const errors: Record<string, string> = {};
    
    if (formStep === 0) {
      if (!formData.firstName.trim()) {
        errors.firstName = t('registration.errors.firstNameRequired');
      }
      if (!formData.lastName.trim()) {
        errors.lastName = t('registration.errors.lastNameRequired');
      }
      if (!formData.email.trim()) {
        errors.email = t('registration.errors.emailRequired');
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = t('registration.errors.emailInvalid');
      }
    } else if (formStep === 1) {
      if (!formData.password) {
        errors.password = t('registration.errors.passwordRequired');
      } else if (formData.password.length < 8) {
        errors.password = t('registration.errors.passwordLength');
      }
      
      if (!formData.confirmPassword) {
        errors.confirmPassword = t('registration.errors.confirmPasswordRequired');
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = t('registration.errors.passwordsDoNotMatch');
      }
      
      if (!formData.agreeTerms) {
        errors.agreeTerms = t('registration.errors.termsRequired');
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setFormStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setFormStep(prev => prev - 1);
  };

  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) {
      return;
    }
    
    setIsSubmitting(true);
    setApiError(null);
    
    try {
      // Call the registration API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Success
      setIsSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          agreeTerms: false
        });
        setFormStep(0);
        setIsSuccess(false);
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      setIsSubmitting(false);
      // Handle error
      console.error('Registration error:', error);
      setApiError(error instanceof Error ? error.message : 'An unexpected error occurred');
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

  const renderFormStep = () => {
    if (isSuccess) {
      return (
        <div className="success-message">
          <FiCheckCircle className="success-icon" />
          <h3>{t('registration.successTitle')}</h3>
          <p>{t('registration.successMessage')}</p>
        </div>
      );
    }
    
    // Display API error if present
    if (apiError) {
      return (
        <div className="error-container">
          <div className="api-error-message">{apiError}</div>
          <button 
            className="retry-button"
            onClick={() => {
              setApiError(null);
              setFormStep(0);
            }}
          >
            {t('registration.retry')}
          </button>
        </div>
      );
    }

    switch (formStep) {
      case 0:
        return (
          <>
            <div className="form-group">
              <label htmlFor="firstName">
                <FiUser className="input-icon" />
                {t('registration.firstName')}
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder={t('registration.firstNamePlaceholder')}
                className={formErrors.firstName ? 'error' : ''}
              />
              {formErrors.firstName && <div className="error-message">{formErrors.firstName}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">
                <FiUser className="input-icon" />
                {t('registration.lastName')}
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder={t('registration.lastNamePlaceholder')}
                className={formErrors.lastName ? 'error' : ''}
              />
              {formErrors.lastName && <div className="error-message">{formErrors.lastName}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">
                <FiMail className="input-icon" />
                {t('registration.email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('registration.emailPlaceholder')}
                className={formErrors.email ? 'error' : ''}
              />
              {formErrors.email && <div className="error-message">{formErrors.email}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">
                <FiPhone className="input-icon" />
                {t('registration.phone')} ({t('registration.optional')})
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('registration.phonePlaceholder')}
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="next-button"
                onClick={handleNextStep}
              >
                {t('registration.next')}
              </button>
            </div>
          </>
        );
      
      case 1:
        return (
          <>
            <div className="form-group">
              <label htmlFor="password">
                <FiLock className="input-icon" />
                {t('registration.password')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('registration.passwordPlaceholder')}
                className={formErrors.password ? 'error' : ''}
              />
              {formErrors.password && <div className="error-message">{formErrors.password}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <FiLock className="input-icon" />
                {t('registration.confirmPassword')}
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('registration.confirmPasswordPlaceholder')}
                className={formErrors.confirmPassword ? 'error' : ''}
              />
              {formErrors.confirmPassword && <div className="error-message">{formErrors.confirmPassword}</div>}
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className={formErrors.agreeTerms ? 'error' : ''}
              />
              <label htmlFor="agreeTerms">
                {t('registration.agreeTerms')} <a href="#">{t('registration.termsLink')}</a>
              </label>
              {formErrors.agreeTerms && <div className="error-message">{formErrors.agreeTerms}</div>}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="back-button"
                onClick={handlePrevStep}
              >
                {t('registration.back')}
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('registration.submitting') : t('registration.submit')}
              </button>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="inline-registration-container"
          variants={formVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="registration-header">
            <h2>{t('registration.title')}</h2>
            <p>{t('registration.subtitle')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="registration-form">
            {renderFormStep()}
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RegistrationForm;
