// src/components/ui/Button.tsx
import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
type ButtonHTMLType = 'button' | 'submit' | 'reset';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  typeVariant?: ButtonVariant;
  htmlType?: ButtonHTMLType;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const gradientBorders: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-[#7F00FF] to-[#00F0FF]',
  secondary: 'bg-gradient-to-r from-gray-500 to-gray-700',
  danger: 'bg-gradient-to-r from-red-500 to-yellow-500',
  outline: 'bg-gradient-to-r from-white/30 to-white/10',
};

const innerBg: Record<ButtonVariant, string> = {
  primary: 'bg-[#101828]',
  secondary: 'bg-[#1f1f2a]',
  danger: 'bg-[#1f1f2a]',
  outline: 'bg-transparent',
};

const Button: React.FC<ButtonProps> = ({
  typeVariant = 'primary',
  htmlType = 'button',
  className,
  children,
  leftIcon,
  rightIcon,
  ...props
}) => {
  return (
    <button
      type={htmlType}
      className={clsx(
        'relative inline-block rounded-lg p-[1.5px] group',
        gradientBorders[typeVariant],
        className
      )}
      {...props}
    >
      <span
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200',
          innerBg[typeVariant],
          'text-white'
        )}
      >
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </span>
    </button>
  );
};

export default Button;
