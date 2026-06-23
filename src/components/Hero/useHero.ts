"use client";

import { useCallback } from 'react';

export const useHero = () => {
  // Function to scroll to the CTA/join section
  const scrollToJoin = useCallback(() => {
    const element = document.getElementById('cta');
    if (element) {
      const offsetTop = element.offsetTop;
      window.scrollTo({
        top: offsetTop - 100, // Adjust for header height
        behavior: 'smooth'
      });
    }
  }, []);

  return {
    scrollToJoin
  };
};
