import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import { Vault, Leaf, Settings, BarChart3 } from 'lucide-react';

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 glass backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-stellar">
            <Vault className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-stellar bg-clip-text text-transparent">
            Tansu Vault
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/dashboard'}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Vault className="mr-2 h-4 w-4" />
            Vault
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Leaf className="mr-2 h-4 w-4" />
            Carbon Offset
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>

        {/* Wallet Connection */}
        <WalletConnect />
      </div>
    </nav>
  );
};