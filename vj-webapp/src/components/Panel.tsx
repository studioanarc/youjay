import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className = '',
  headerActions,
  noPadding = false,
}) => {
  return (
    <div className={`${styles.panel} ${className}`}>
      {title && (
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {headerActions && <div className={styles.actions}>{headerActions}</div>}
        </div>
      )}
      <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
        {children}
      </div>
    </div>
  );
};
