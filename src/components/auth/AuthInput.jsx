'use client';

import { forwardRef } from 'react';

const AuthInput = forwardRef(({ 
  label, 
  icon, 
  error, 
  className = '', 
  showPasswordToggle = false, 
  showPassword, 
  onTogglePassword, 
  ...rest 
}, ref) => {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400 block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500">
          {icon}
        </div>
        <input
          ref={ref}
          className={`
            w-full bg-white/5 border border-white/10 rounded-xl
            py-3 pl-10 pr-4 text-white text-sm
            placeholder:text-slate-600
            focus:outline-none focus:border-white/25
            transition-colors
            ${error ? 'border-red-400' : ''}
            ${showPasswordToggle ? 'pr-12' : ''}
            ${className}
          `}
          {...rest}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

AuthInput.displayName = 'AuthInput';

export default AuthInput;
