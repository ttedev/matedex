import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variants = {
  filled: 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80',
  outlined: 'border-2 border-primary text-primary hover:bg-primary/10',
  text: 'text-primary hover:bg-primary/10',
  tonal: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
};

const sizes = {
  sm: 'px-4 py-2 text-label-lg',
  md: 'px-6 py-3 text-body-md font-semibold',
  lg: 'px-8 py-4 text-body-lg font-semibold',
};

export default function Button({
  variant = 'filled',
  size = 'md',
  children,
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full font-montserrat font-semibold
        transition-all duration-150 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
      ) : null}
      {children}
    </button>
  );
}