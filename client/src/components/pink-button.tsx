import React from 'react';

interface PinkButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  className?: string;
  type?: 'button' | 'submit';
}

export function PinkButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'solid',
  className = '',
  type = 'button'
}: PinkButtonProps) {
  if (variant === 'solid') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${className} px-4 py-2 rounded-md font-medium text-white transition-colors`}
        style={{
          backgroundColor: disabled ? '#9CA3AF' : '#EC4899',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = '#DB2777';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = '#EC4899';
          }
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${className} px-4 py-2 rounded-md font-medium transition-colors`}
      style={{
        backgroundColor: 'transparent',
        border: `1px solid ${disabled ? '#9CA3AF' : '#EC4899'}`,
        color: disabled ? '#9CA3AF' : '#DB2777',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#FDF2F8';
          e.currentTarget.style.color = '#BE185D';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#DB2777';
        }
      }}
    >
      {children}
    </button>
  );
}