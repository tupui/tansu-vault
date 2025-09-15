import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className={cn("min-h-screen relative", className)}>
      {/* Stellar particles background */}
      <div className="stellar-particles" />
      
      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};