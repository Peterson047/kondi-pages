import React from 'react';

interface LogoProps {
  className?: string;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', height = 36 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 64"
      height={height}
      className={className}
      style={{ width: 'auto' }}
    >
      {/* Icon: rounded square with stylized N */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#F97316" />
      <path d="M18 20h10v28H18V20zm16 0h10v16l-12 12h-10l12-12h-6V20h6z" fill="#FFFFFF" />
      <rect x="16" y="40" width="32" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />

      {/* Brand text with adaptive fill */}
      <text
        x="76"
        y="42"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="32"
        fontWeight="700"
        className="fill-zinc-900 dark:fill-white"
        letterSpacing="-0.5"
      >
        Kondi
      </text>
    </svg>
  );
};

export default Logo;
