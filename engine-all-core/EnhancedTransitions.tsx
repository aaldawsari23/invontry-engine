import React, { useState, useEffect } from 'react';

interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({ 
  show, 
  children, 
  duration = 300, 
  className = '' 
}) => {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setShouldRender(false);
  };

  return shouldRender ? (
    <div
      className={`transition-opacity ${duration === 150 ? 'duration-150' : duration === 200 ? 'duration-200' : duration === 300 ? 'duration-300' : duration === 500 ? 'duration-500' : 'duration-300'} ${
        show ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      onTransitionEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
};

interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  show,
  children,
  direction = 'up',
  duration = 300,
  className = ''
}) => {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) setShouldRender(true);
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) setShouldRender(false);
  };

  const getTransform = () => {
    if (show) return 'translate-x-0 translate-y-0';
    
    switch (direction) {
      case 'up': return 'translate-y-4';
      case 'down': return '-translate-y-4';
      case 'left': return 'translate-x-4';
      case 'right': return '-translate-x-4';
      default: return 'translate-y-4';
    }
  };

  return shouldRender ? (
    <div
      className={`transition-all ${duration === 150 ? 'duration-150' : duration === 200 ? 'duration-200' : duration === 300 ? 'duration-300' : duration === 500 ? 'duration-500' : 'duration-300'} ${
        show ? 'opacity-100' : 'opacity-0'
      } ${getTransform()} ${className}`}
      onTransitionEnd={onAnimationEnd}
    >
      {children}
    </div>
  ) : null;
};

interface StaggeredListProps {
  items: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  items,
  staggerDelay = 50,
  className = ''
}) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    items.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, index]));
      }, index * staggerDelay);
    });

    return () => {
      setVisibleItems(new Set());
    };
  }, [items, staggerDelay]);

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ${
            visibleItems.has(index) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

// Loading state component with smooth transitions
interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  minimumDuration?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  loadingComponent,
  minimumDuration = 300
}) => {
  const [shouldShowLoading, setShouldShowLoading] = useState(isLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading && !startTime) {
      setStartTime(Date.now());
      setShouldShowLoading(true);
    } else if (!isLoading && startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minimumDuration - elapsed);
      
      setTimeout(() => {
        setShouldShowLoading(false);
        setStartTime(null);
      }, remaining);
    }
  }, [isLoading, startTime, minimumDuration]);

  return (
    <div className="relative">
      <FadeTransition show={!shouldShowLoading}>
        {children}
      </FadeTransition>
      
      <FadeTransition 
        show={shouldShowLoading}
        className="absolute inset-0 flex items-center justify-center"
      >
        {loadingComponent || <div className="loading-spinner" />}
      </FadeTransition>
    </div>
  );
};

// Interactive feedback component
interface InteractiveFeedbackProps {
  children: React.ReactNode;
  onClick?: () => void;
  onHover?: (isHovered: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const InteractiveFeedback: React.FC<InteractiveFeedbackProps> = ({
  children,
  onClick,
  onHover,
  disabled = false,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    onHover?.(false);
  };

  const handleMouseDown = () => {
    if (disabled) return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  return (
    <div
      className={`
        transition-all duration-150 cursor-pointer select-none
        ${isPressed ? 'scale-95' : isHovered ? 'scale-105' : 'scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

// Status indicator with pulsing animation
interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  pulse = false
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      case 'loading': return 'bg-gray-500';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm': return 'w-2 h-2';
      case 'md': return 'w-3 h-3';
      case 'lg': return 'w-4 h-4';
    }
  };

  return (
    <div
      className={`
        rounded-full ${getStatusColor()} ${getSize()}
        ${pulse ? 'animate-pulse' : ''}
        ${status === 'loading' ? 'animate-spin' : ''}
      `}
    />
  );
};