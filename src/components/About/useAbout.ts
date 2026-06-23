"use client";

import { useState, useEffect, useRef } from 'react';

export const useAbout = () => {
  const [isVisible, setIsVisible] = useState(false);
  const aboutRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the section becomes visible in the viewport
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (aboutRef.current) {
            observer.unobserve(aboutRef.current);
          }
        }
      },
      {
        // Start animations when section is 20% visible
        threshold: 0.2,
        rootMargin: '0px'
      }
    );

    if (aboutRef.current) {
      observer.observe(aboutRef.current);
    }

    // Capture the ref value inside the effect to avoid stale ref in cleanup
    const currentRef = aboutRef.current;
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return {
    isVisible,
    aboutRef
  };
};
