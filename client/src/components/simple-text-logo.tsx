import React from 'react';

interface TextLogoProps {
  fontSize?: number;
  className?: string;
}

export function TextLogo({ fontSize = 24, className = '' }: TextLogoProps) {
  return (
    <div className={`text-logo-container ${className}`} style={{ textAlign: 'center', marginBottom: '15px' }}>
      <span style={{ fontWeight: 'bold', fontSize: `${fontSize}px`, color: '#FF69B4' }}>Drama</span>
      <span style={{ fontWeight: 'bold', fontSize: `${fontSize}px`, color: '#22C9C9' }}>Llama</span>
    </div>
  );
}

export default TextLogo;