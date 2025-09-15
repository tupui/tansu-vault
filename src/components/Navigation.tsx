import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import { Vault, Leaf, Settings, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border glass backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover-lift">
          <div className="p-2 rounded-lg bg-primary">
            <Vault className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary">
            Tansu Vault
          </h1>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          <Button 
            asChild
            variant={isActive('/dashboard') ? 'default' : 'ghost'} 
            size="sm"
          >
            <Link to="/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          
          <Button 
            asChild
            variant={isActive('/vault') ? 'default' : 'ghost'} 
            size="sm"
          >
            <Link to="/vault">
              <Vault className="mr-2 h-4 w-4" />
              Vault
            </Link>
          </Button>
          
          <Button 
            asChild
            variant={isActive('/carbon') ? 'default' : 'ghost'} 
            size="sm"
          >
            <Link to="/carbon">
              <Leaf className="mr-2 h-4 w-4" />
              Carbon
            </Link>
          </Button>
          
          <Button 
            asChild
            variant={isActive('/admin') ? 'default' : 'ghost'} 
            size="sm"
          >
            <Link to="/admin">
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </div>

        {/* Wallet Connection */}
        <WalletConnect />
      </div>
    </nav>
  );
};