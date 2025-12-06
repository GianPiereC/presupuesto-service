import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => {
    const baseClasses = 'w-full bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 px-2 py-2 text-xs';
    
    return (
      <select
        ref={ref}
        className={cn(baseClasses, className)}
        style={{
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-primary)',
        }}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';

export { Select };

