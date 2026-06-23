"use client";

import { useState, useEffect, useRef } from 'react';

export const useFeatures = () => {
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes visible in the viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (featuresRef.current) {
            observer.unobserve(featuresRef.current);
          }
        }
      },
      {
        // Start animations when section is 20% visible
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    // Capture the ref value inside the effect to avoid stale ref in cleanup
    const currentRef = featuresRef.current;
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return {
    isVisible,
    featuresRef
  };
};
