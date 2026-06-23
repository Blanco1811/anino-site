'use client';

import React, { useEffect } from 'react';
import LanguageProvider from '@/components/LanguageProvider/LanguageProvider';
import { AuthProvider } from '@/contexts/AuthContext';

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_ID || '1';

interface ClientWrapperProps {
  children: React.ReactNode;
}

const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  // Cache-bust all stylesheets and scripts with build version param,
  // including ones added dynamically during client-side navigation
  useEffect(() => {
    const addVersion = (el: HTMLLinkElement | HTMLScriptElement) => {
      const attr = el instanceof HTMLLinkElement ? 'href' : 'src';
      const val = el.getAttribute(attr);
      if (!val || val.includes('v=' + BUILD_VERSION)) return;
      try {
        const url = new URL(val, window.location.origin);
        url.searchParams.set('v', BUILD_VERSION);
        el.setAttribute(attr, url.toString());
      } catch (e) {}
    };

    // Only cache-bust elements already in the DOM at mount time.
    // Do NOT use a MutationObserver to intercept dynamically-added stylesheets/scripts:
    // Next.js tracks navigation-injected <link rel="stylesheet"> by their exact href and
    // waits for them to load before swapping the UI. Mutating the href breaks that signal,
    // causing client-side navigation to hang forever ("nothing happens").
    // Next.js content-hashes its chunk filenames (e.g. src_abc123._.css), so those chunks
    // never go stale and do not need a version param added.
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => addVersion(el as HTMLLinkElement));
    document.querySelectorAll('script[src]').forEach(el => addVersion(el as HTMLScriptElement));
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        {children}
        {/* Floating WhatsApp Button */}
        <a
          href="https://wa.me/972556888870?text=שלום%20אני%20מעוניין%20בסוכן%20AI"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Contact"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            backgroundColor: '#25D366',
            color: '#FFF',
            borderRadius: '50px',
            textAlign: 'center',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            textDecoration: 'none',
            transition: 'transform 0.2s ease-in-out, background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.backgroundColor = '#20ba56';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#25D366';
          }}
        >
          <svg 
            viewBox="0 0 24 24" 
            width="32" 
            height="32" 
            fill="currentColor"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73.001-2.595-1.013-5.035-2.856-6.88C16.635 2.14 14.199 1.124 11.604 1.124c-5.437 0-9.862 4.371-9.865 9.734a9.553 9.553 0 0 0 1.493 5.12l-.973 3.553 3.633-.941zm12.39-7.09c-.297-.148-1.758-.854-2.031-.952-.272-.099-.47-.148-.668.148-.198.297-.767.952-.94 1.15-.173.198-.347.223-.644.075-.297-.15-1.255-.456-2.39-1.457-.883-.777-1.48-1.737-1.653-2.031-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.496.099-.198.05-.371-.025-.52-.075-.148-.669-1.586-.916-2.18-.24-.575-.484-.496-.668-.506-.173-.008-.371-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.224 1.36.192 1.871.118.571-.085 1.758-.707 2.006-1.39.248-.683.248-1.266.173-1.39-.074-.124-.272-.198-.57-.347z" />
          </svg>
        </a>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default ClientWrapper;
