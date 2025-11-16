import React from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  active = false,
  size = 'md',
  variant = 'default',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`${styles.iconButton} ${styles[size]} ${styles[variant]} ${
        active ? styles.active : ''
      } ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
