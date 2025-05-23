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
  const baseStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    border: '1px solid #EC4899',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const solidStyle = {
    ...baseStyle,
    backgroundColor: '#EC4899',
    color: 'white',
  };

  const outlineStyle = {
    ...baseStyle,
    backgroundColor: 'transparent',
    color: '#DB2777',
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const getStyle = () => {
    if (variant === 'solid') {
      return {
        ...solidStyle,
        backgroundColor: isHovered && !disabled ? '#DB2777' : '#EC4899',
      };
    } else {
      return {
        ...outlineStyle,
        backgroundColor: isHovered && !disabled ? '#FDF2F8' : 'transparent',
        color: isHovered && !disabled ? '#BE185D' : '#DB2777',
      };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={getStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}