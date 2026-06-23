'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiX, FiDollarSign, FiMessageCircle, FiPhone, FiSend, FiMail, FiShare2, FiUsers, FiMessageSquare } from 'react-icons/fi';
import { usePathname, useRouter } from 'next/navigation';
// Header functionality integrated directly into component
import LoginButton from './LoginButton';
import { useAuth } from '@/contexts/AuthContext';
import './Header.css';

// Define interfaces for navigation items
interface BaseNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  path?: string;
  action?: () => void;
  submenu?: NavItem[];
}

interface ActionNavItem extends BaseNavItem {
  type: 'action';
  action: () => void;
}

interface LinkNavItem extends BaseNavItem {
  type: 'link';
  action: () => void;
  path: string;
}

interface ScrollNavItem extends BaseNavItem {
  type: 'scroll';
}

interface DropdownNavItem extends BaseNavItem {
  type: 'dropdown';
  submenu: NavItem[];
}

type NavItem = ActionNavItem | LinkNavItem | ScrollNavItem | DropdownNavItem;

// Type guard functions to check the type of NavItem
const isActionItem = (item: NavItem): item is ActionNavItem => item.type === 'action';
const isLinkItem = (item: NavItem): item is LinkNavItem => item.type === 'link';
const isScrollItem = (item: NavItem): item is ScrollNavItem => item.type === 'scroll';
const isDropdownItem = (item: NavItem): item is DropdownNavItem => item.type === 'dropdown';

const Header: React.FC = () => {
  const { t } = useTranslation();
  // Using useAuth hook to determine if the user is authenticated
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Integrated Header hook functionality
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll event to add box shadow to header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initial check on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Handle scrolling to sections or navigation to home page with section
  const scrollToSection = useCallback((sectionId: string) => {
    // Check if we're already on the home page
    if (pathname === '/' || pathname === '') {
      // We're on the home page, so scroll to the section
      const element = document.getElementById(sectionId);
      if (element) {
        const offsetTop = element.offsetTop;
        window.scrollTo({
          top: offsetTop - 100, // Adjust for header height
          behavior: 'smooth'
        });
      }
    } else {
      // We're on another page, navigate to home page with hash
      router.push(`/#${sectionId}`);
    }
  }, [pathname, router]);

  // Updated translations to ensure they match ANINO AI values
  const navItems: NavItem[] = [
    { id: 'whatsapp-ai', label: t('header.whatsappAi', 'סוכן WhatsApp AI'), icon: <FiMessageSquare className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'voice-ai', label: t('header.voiceAi', 'סוכן שיחות AI'), icon: <FiPhone className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'whatsapp-marketing', label: t('header.whatsappMarketing', 'שיווק בוואטסאפ'), icon: <FiSend className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'email-marketing', label: t('header.emailMarketing', 'שיווק במייל'), icon: <FiMail className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'social-marketing', label: t('header.socialMarketing', 'שיווק ברשתות'), icon: <FiShare2 className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'leads', label: t('header.leads', 'ניהול לידים'), icon: <FiUsers className="nav-icon" />, type: 'scroll' } as ScrollNavItem,
    { id: 'balance', label: t('header.balance', 'יתרה נטענת'), icon: <FiDollarSign className="nav-icon" />, type: 'scroll' } as ScrollNavItem
  ];

  return (
    <motion.header
      className={`header ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container header-container">
        <motion.div 
          className="logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => scrollToSection('home')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <img 
            src="/logo.png" 
            alt="ANINO AI Logo" 
            style={{ height: '45px', width: 'auto', objectFit: 'contain' }} 
          />
          <span className="logo-coin" style={{ color: '#00D09C', fontWeight: 'bold', fontSize: '22px', letterSpacing: '0.5px' }}>ANINO</span>
          <span className="logo-ai" style={{ color: '#ffffff', fontWeight: 'normal', marginLeft: '2px', fontSize: '22px' }}>AI</span>
        </motion.div>

        <nav className="desktop-nav">
          <ul className="nav-list">
            {navItems.map(item => {
              const isActive = isLinkItem(item) && pathname && pathname.startsWith(item.path);
              
              // Regular menu items
              return (
                <motion.li key={item.id} className="nav-item">
                  <motion.button
                    onClick={() => {
                      if (isActionItem(item)) {
                        item.action();
                      } else if (isLinkItem(item)) {
                        item.action();
                      } else if (isScrollItem(item)) {
                        scrollToSection(item.id);
                      }
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </motion.button>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        <div className="header-right">
          <motion.a
            href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בסוכן%20AI"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-header-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiMessageCircle />
            <span>קבלו דמו בוואטסאפ</span>
          </motion.a>

          <LoginButton />
          
          <motion.button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <motion.div 
          className="mobile-menu"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <ul className="mobile-nav-list">
            {navItems.map(item => {
              const isActive = isLinkItem(item) && pathname && pathname.startsWith(item.path);
              
              // Handle dropdown menu items in mobile view
              if (isDropdownItem(item)) {
                return (
                  <React.Fragment key={item.id}>
                    <motion.li 
                      className="mobile-nav-item mobile-nav-header"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * navItems.indexOf(item) }}
                    >
                      <div className="mobile-nav-category">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    </motion.li>
                    
                    {item.submenu.map((subItem, subIndex) => {
                      const isSubActive = !!(subItem.path && pathname && pathname.startsWith(subItem.path));
                      return (
                        <motion.li 
                          key={subItem.id}
                          className="mobile-nav-item mobile-nav-subitem"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * navItems.indexOf(item) + 0.05 * (subIndex + 1) }}
                        >
                          <button
                            onClick={() => {
                              if (isActionItem(subItem) || isLinkItem(subItem)) {
                                subItem.action();
                              } else if (isScrollItem(subItem)) {
                                scrollToSection(subItem.id);
                              }
                              toggleMobileMenu();
                            }}
                            className={`mobile-nav-link ${isSubActive ? 'active' : ''}`}
                          >
                            {subItem.icon}
                            <span>{subItem.label}</span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </React.Fragment>
                );
              }
              
              // Regular menu items
              return (
                <motion.li 
                  key={item.id} 
                  className="mobile-nav-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * navItems.indexOf(item) }}
                >
                  <button
                    onClick={() => {
                      if (isActionItem(item) || isLinkItem(item)) {
                        item.action();
                      } else if (isScrollItem(item)) {
                        scrollToSection(item.id);
                      }
                      toggleMobileMenu();
                    }}
                    className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </motion.li>
              );
            })}
            <motion.li
              className="mobile-nav-item mobile-auth-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * navItems.length }}
            >
              <LoginButton isMobile={true} onLoginClick={() => toggleMobileMenu()} />
            </motion.li>
          </ul>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
