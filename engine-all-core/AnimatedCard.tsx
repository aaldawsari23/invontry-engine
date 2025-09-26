import React, { useState, useRef, useEffect } from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  isSelected?: boolean;
  animationType?: 'fade' | 'slide' | 'scale' | 'flip';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  delay = 0,
  onClick,
  isSelected = false,
  animationType = 'fade'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const getAnimationClass = () => {
    const base = 'transition-all duration-500 ease-out';
    
    if (!isVisible) {
      switch (animationType) {
        case 'fade':
          return `${base} opacity-0`;
        case 'slide':
          return `${base} opacity-0 translate-y-8`;
        case 'scale':
          return `${base} opacity-0 scale-95`;
        case 'flip':
          return `${base} opacity-0 rotateY-90`;
        default:
          return `${base} opacity-0`;
      }
    }

    return `${base} opacity-100 translate-y-0 scale-100`;
  };

  const getHoverClass = () => {
    if (!isHovered) return '';
    return 'transform scale-[1.02] shadow-2xl shadow-teal-500/20 -translate-y-1';
  };

  const getSelectionClass = () => {
    if (!isSelected) return '';
    return 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-teal-400/25';
  };

  return (
    <div
      ref={cardRef}
      className={`${getAnimationClass()} ${getHoverClass()} ${getSelectionClass()} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ 
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {children}
    </div>
  );
};