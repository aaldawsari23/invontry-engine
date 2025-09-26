import React from 'react';

// Design tokens for consistent theming
export const designTokens = {
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf', // Main teal
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    }
  },
  typography: {
    fontFamily: {
      sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
};

// Enhanced button component with consistent design
export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  onClick, 
  className = '',
  icon,
  iconPosition = 'left'
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg 
    transition-all duration-200 focus:outline-none focus:ring-2 
    focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 
    disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 
      text-white shadow-lg shadow-teal-600/25 focus:ring-teal-400
    `,
    secondary: `
      bg-slate-700 hover:bg-slate-600 text-white shadow-md 
      focus:ring-slate-400
    `,
    outline: `
      border-2 border-teal-500 text-teal-400 hover:bg-teal-500 
      hover:text-white focus:ring-teal-400
    `,
    ghost: `
      text-slate-300 hover:bg-slate-800 hover:text-white 
      focus:ring-slate-400
    `
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs gap-1',
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <div className="loading-spinner w-4 h-4" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
};

// Enhanced card component
export const Card: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'success' | 'warning' | 'error';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ 
  children, 
  variant = 'default', 
  padding = 'md', 
  className = '',
  header,
  footer
}) => {
  const baseClasses = `
    bg-slate-800 rounded-xl border transition-all duration-200
  `;

  const variantClasses = {
    default: 'border-slate-700 shadow-md',
    elevated: 'border-slate-700 shadow-xl',
    outlined: 'border-slate-600 shadow-none',
    success: 'border-green-500/30 bg-green-500/5 shadow-lg shadow-green-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/5 shadow-lg shadow-yellow-500/10',
    error: 'border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/10',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {header && (
        <div className="border-b border-slate-700 px-6 py-4">
          {header}
        </div>
      )}
      
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-slate-700 px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  );
};

// Status indicator with enhanced design
export const StatusBadge: React.FC<{
  status: 'accepted' | 'review' | 'rejected' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}> = ({ status, size = 'md', showIcon = true }) => {
  const config = {
    accepted: {
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: '✅',
      label: 'Accepted'
    },
    review: {
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: '📋',
      label: 'Review'
    },
    rejected: {
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: '❌',
      label: 'Rejected'
    },
    pending: {
      color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      icon: '⏳',
      label: 'Pending'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  const statusConfig = config[status];

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-lg border
      ${statusConfig.color} ${sizeClasses[size]}
    `}>
      {showIcon && <span>{statusConfig.icon}</span>}
      {statusConfig.label}
    </span>
  );
};

// Enhanced progress bar
export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}> = ({ 
  value, 
  max = 100, 
  variant = 'default', 
  size = 'md', 
  showLabel = true,
  animated = true,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variantClasses = {
    default: 'bg-teal-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm text-slate-400">
          <span>Progress</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
      
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`
            ${sizeClasses[size]} ${variantClasses[variant]} rounded-full 
            transition-all duration-500 ease-out relative
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced tooltip with better positioning
export const EnhancedTooltip: React.FC<{
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}> = ({ children, content, position = 'top', size = 'md', delay = 100 }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs max-w-xs',
    md: 'px-3 py-2 text-sm max-w-sm',
    lg: 'px-4 py-3 text-base max-w-md',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-slate-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-slate-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-slate-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-slate-900',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div 
          className={`
            absolute z-50 ${positionClasses[position]} ${sizeClasses[size]}
            bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700
            pointer-events-none animate-fadeIn
          `}
          role="tooltip"
        >
          {content}
          <div 
            className={`
              absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}
            `}
          />
        </div>
      )}
    </div>
  );
};

// Typography components with consistent styling
export const Typography = {
  H1: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h1 className={`text-4xl font-bold text-white leading-tight ${className}`}>
      {children}
    </h1>
  ),
  
  H2: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h2 className={`text-3xl font-bold text-white leading-tight ${className}`}>
      {children}
    </h2>
  ),
  
  H3: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-2xl font-semibold text-white leading-tight ${className}`}>
      {children}
    </h3>
  ),
  
  H4: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h4 className={`text-xl font-semibold text-white leading-tight ${className}`}>
      {children}
    </h4>
  ),
  
  Body: ({ children, className = '', size = 'md' }: { 
    children: React.ReactNode; 
    className?: string; 
    size?: 'sm' | 'md' | 'lg' 
  }) => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };
    
    return (
      <p className={`text-slate-300 leading-relaxed ${sizeClasses[size]} ${className}`}>
        {children}
      </p>
    );
  },
  
  Caption: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={`text-xs text-slate-400 ${className}`}>
      {children}
    </span>
  ),
  
  Code: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <code className={`font-mono text-sm bg-slate-900 px-2 py-1 rounded text-teal-400 ${className}`}>
      {children}
    </code>
  ),
};

// Enhanced input component
export const Input: React.FC<{
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  helperText,
  label,
  required = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full rounded-lg border bg-slate-900 text-white placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            ${error ? 'border-red-500' : 'border-slate-600'}
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${sizeClasses[size]}
          `}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`text-xs ${error ? 'text-red-400' : 'text-slate-400'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};