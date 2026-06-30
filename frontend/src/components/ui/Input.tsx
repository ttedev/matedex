import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-label-lg text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-surface-container border border-outline-variant
          text-body-md text-on-surface placeholder-on-surface-variant/60
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          transition-colors
          ${error ? 'border-error focus:ring-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-label-sm text-error">{error}</span>}
    </div>
  )
);

Input.displayName = 'Input';

export default Input;