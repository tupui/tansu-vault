import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import { CurrencySelector } from './CurrencySelector';
import { NetworkSelector } from './NetworkSelector';
import { Vault, Leaf, Settings, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { StratumWalletModal } from './StratumWalletModal';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';

export const Navigation = () => {
  const location = useLocation();
  const { isConnected, address, disconnect } = useWallet();
  const { network } = useNetwork();
  const { getCurrentCurrency } = useFiatCurrency();
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  const currentCurrency = getCurrentCurrency();
  
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

        {/* Wallet Connection - Stratum Style */}
        <div className="flex items-center gap-3">
          {/* Network & Currency Selectors */}
          <div className="hidden sm:flex items-center gap-2">
            <NetworkSelector />
            <CurrencySelector compact />
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono bg-success/10 text-success px-3 py-1 rounded border border-success/20">
                {`${address.slice(0, 4)}...${address.slice(-4)}`}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowWalletModal(true)}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {/* Stratum Wallet Modal */}
      <StratumWalletModal 
        open={showWalletModal} 
        onOpenChange={setShowWalletModal} 
      />
    </nav>
  );
};