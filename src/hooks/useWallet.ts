import { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, getAccountBalances } from '@/lib/stellar';

// Wallet constants
const FREIGHTER_ID = 'freighter';
const LOBSTR_ID = 'lobstr';
const RABET_ID = 'rabet';
const ALBEDO_ID = 'albedo';
const XBULL_ID = 'xbull';
const HANA_ID = 'hana';
const WALLETCONNECT_ID = 'walletconnect';
const LEDGER_ID = 'ledger';
const TREZOR_ID = 'trezor';

// Wallet Context Interface
interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  balances: any[];
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

// Wallet Context and Hook
const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// useWalletState Hook Implementation
export const useWalletState = (): WalletContextType => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);

  const isConnected = Boolean(address);

  // Initialize wallet kit and restore connection
  useEffect(() => {
    const savedAddress = localStorage.getItem('tansu_wallet_address');
    if (savedAddress) {
      setAddress(savedAddress);
      refreshBalances(savedAddress);
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
    } catch (err) {
      console.error('Failed to refresh balances:', err);
      setBalances([]);
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
    refreshBalances,
  };
};

export { WalletContext };

// Wallet types and constants - Updated with all supported wallets
export const WALLET_TYPES = {
  FREIGHTER: {
    id: FREIGHTER_ID,
    name: 'Freighter',
    description: 'Browser extension wallet for Stellar',
  },
  ALBEDO: {
    id: ALBEDO_ID,
    name: 'Albedo',
    description: 'Web-based wallet for Stellar',
  },
  RABET: {
    id: RABET_ID,
    name: 'Rabet',
    description: 'Browser extension wallet',
  },
  LOBSTR: {
    id: LOBSTR_ID,
    name: 'LOBSTR',
    description: 'Mobile wallet with web connector',
  },
  XBULL: {
    id: XBULL_ID,
    name: 'xBull Wallet',
    description: 'Multi-platform wallet (Mobile, Web, Extension)',
  },
  HANA: {
    id: HANA_ID,
    name: 'Hana Wallet',
    description: 'Mobile and browser extension wallet',
  },
  WALLETCONNECT: {
    id: WALLETCONNECT_ID,
    name: 'WalletConnect',
    description: 'Connect mobile wallets via QR code',
  },
  LEDGER: {
    id: LEDGER_ID,
    name: 'Ledger',
    description: 'Hardware wallet (via USB or Bluetooth)',
  },
  TREZOR: {
    id: TREZOR_ID,
    name: 'Trezor',
    description: 'Hardware wallet',
  },
} as const;