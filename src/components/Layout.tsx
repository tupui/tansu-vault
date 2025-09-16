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
      
      {/* Main content with top padding to account for fixed navbar */}
      <main className="relative z-10 pt-16">
        {children}
      </main>
    </div>
  );
};