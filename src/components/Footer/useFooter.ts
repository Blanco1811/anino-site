"use client";

import { useCallback } from 'react';

export const useFooter = () => {
  // Function to scroll back to the top of the page
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
  
  return {
    scrollToTop
  };
};
