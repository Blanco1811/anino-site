"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export const useCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ctaRef = useRef<HTMLElement | null>(null);

  // Function to handle join button click
  const handleJoinClick = useCallback(() => {
    // In a real implementation, this would open a modal or redirect to a signup page
    window.open('https://ethereum.org/en/', '_blank');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes visible in the viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (ctaRef.current) {
            observer.unobserve(ctaRef.current);
          }
        }
      },
      {
        // Start animations when section is 20% visible
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    if (ctaRef.current) {
      observer.observe(ctaRef.current);
    }

    // Capture the ref value inside the effect to avoid stale ref in cleanup
    const currentRef = ctaRef.current;
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return {
    isVisible,
    ctaRef,
    handleJoinClick
  };
};
