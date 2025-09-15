import { useState, useEffect, createContext, useContext } from 'react';
import { 
  initWalletKit, 
  connectWallet, 
  getWalletAddress,
  loadAccount,
  getAccountBalances
} from '@/lib/stellar';
import { FREIGHTER_ID, LOBSTR_ID, RABET_ID } from '@creit.tech/stellar-wallets-kit';

export interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  balances: any[];
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const useWalletState = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);

  const isConnected = !!address;

  useEffect(() => {
    // Initialize wallet kit on mount
    try {
      initWalletKit();
      // Try to restore previous connection
      const savedAddress = localStorage.getItem('tansu_wallet_address');
      if (savedAddress) {
        setAddress(savedAddress);
        refreshBalances(savedAddress);
      }
    } catch (err) {
      console.error('Failed to initialize wallet kit:', err);
    }
  }, []);

  const connect = async (walletId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connectedAddress = await connectWallet(walletId);
      setAddress(connectedAddress);
      localStorage.setItem('tansu_wallet_address', connectedAddress);
      await refreshBalances(connectedAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setBalances([]);
    setError(null);
    localStorage.removeItem('tansu_wallet_address');
  };

  const refreshBalances = async (walletAddress?: string) => {
    const addressToUse = walletAddress || address;
    if (!addressToUse) return;

    try {
      const accountBalances = await getAccountBalances(addressToUse);
      setBalances(accountBalances);
    } catch (err: any) {
      console.error('Failed to refresh balances:', err);
      setError('Failed to load account balances');
    }
  };

  return {
    address,
    isConnected,
    isLoading,
    error,
    balances,
    connect,
    disconnect,
    refreshBalances: () => refreshBalances()
  };
};

export { WalletContext };

// Wallet types and constants
export const WALLET_TYPES = {
  FREIGHTER: {
    id: FREIGHTER_ID,
    name: 'Freighter',
    description: 'Browser extension wallet for Stellar',
  },
  LOBSTR: {
    id: LOBSTR_ID,
    name: 'Lobstr',
    description: 'Mobile-first Stellar wallet',
  },
  RABET: {
    id: RABET_ID,
    name: 'Rabet',
    description: 'Multi-chain wallet with Stellar support',
  }
};