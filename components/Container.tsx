import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ children, className = '', ...props }) => {
  const classes = ['max-w-6xl mx-auto px-4', className].filter(Boolean).join(' ');
  return <div className={classes} {...props}>{children}</div>;
};

export default Container;
