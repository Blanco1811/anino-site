"use client";

import { useEffect } from 'react';
import { 
  Header,
  HomeShowcase,
  About,
  Features,
  CTA,
  Footer,
  ServiceSections
} from '@/components';
import HomeLiveTranslation from '@/components/HomeLiveTranslation/HomeLiveTranslation';

export default function Home() {
  // Add debugging logs to help identify the "to" argument error
  useEffect(() => {
    console.log('Home page mounted - Adding global error handler');
    
    // Add a global error handler to catch and log all errors
    const originalError = console.error;
    console.error = function(...args) {
      // Log the error with a stack trace
      console.log('ERROR CAUGHT:', args);
      console.log('Error location:', new Error().stack);
      
      // Check for the specific "to" argument error
      const errorString = args.join(' ');
      if (errorString.includes('to argument') && errorString.includes('undefined')) {
        console.log('FOUND THE "TO" ARGUMENT ERROR!');
      }
      
      // Call the original error function
      originalError.apply(console, args);
    };
    
    // Cleanup function to restore original console.error
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <HomeLiveTranslation>
      <div className="app-container">
        <Header />
        <main className="home-main">
          <HomeShowcase />
          <ServiceSections />
          <About />
          <Features />
          <CTA />
        </main>
        <Footer />
      </div>
    </HomeLiveTranslation>
  );
}

