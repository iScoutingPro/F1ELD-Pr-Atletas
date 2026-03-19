import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'minimal';
}

export const Logo = ({ className = '', variant = 'full' }: LogoProps) => {
  if (variant === 'icon') {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="5" y="5" width="90" height="90" rx="8" stroke="white" strokeWidth="8"/>
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fill="white" 
          fontSize="50" 
          fontWeight="900" 
          fontStyle="italic"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          F
        </text>
      </svg>
    );
  }

  const SvgContent = () => (
    <svg 
      viewBox="0 0 300 120" 
      className={variant === 'minimal' ? className : "w-full h-auto"}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="10" width="280" height="100" stroke="white" strokeWidth="10" rx="4"/>
      <text 
        x="50%" 
        y="50%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fill="white" 
        fontSize="70" 
        fontWeight="900" 
        fontStyle="italic"
        letterSpacing="-0.05em"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        F1ELD
      </text>
    </svg>
  );

  if (variant === 'minimal') {
    return <SvgContent />;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Boxed F1ELD */}
      <SvgContent />
      {/* Subtitle */}
      <div className="mt-2 text-[10px] font-bold tracking-[0.4em] text-white/60 uppercase">
        Pró Atletas
      </div>
    </div>
  );
};
