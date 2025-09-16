import { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, getAccountBalances, initWalletKit, switchNetwork } from '@/lib/stellar';
import type { NetworkType } from '@/lib/stellar';
import { useNetwork } from '@/contexts/NetworkContext';

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

  const { network } = useNetwork();

  const isConnected = Boolean(address);

  // Initialize wallet kit and restore connection
  useEffect(() => {
    const restoreConnection = async () => {
      const savedAddress = localStorage.getItem('tansu_wallet_address');
      const savedWalletId = localStorage.getItem('tansu_wallet_id');
      
      if (savedAddress && savedWalletId) {
        try {
          // Initialize wallet kit first
          const targetNetwork: NetworkType = network === 'mainnet' ? 'MAINNET' : 'TESTNET';
          try {
            switchNetwork(targetNetwork);
          } catch {
            initWalletKit(targetNetwork);
          }
          
          // Restore the address without triggering a new connection
          setAddress(savedAddress);
          await refreshBalances(savedAddress);
        } catch (error) {
          console.warn('Failed to restore wallet connection:', error);
          // Clear invalid saved data
          localStorage.removeItem('tansu_wallet_address');
          localStorage.removeItem('tansu_wallet_id');
        }
      }
    };

    restoreConnection();
  }, [network]);

  useEffect(() => {
    const target: NetworkType = network === 'mainnet' ? 'MAINNET' : 'TESTNET';
    try {
      switchNetwork(target);
    } catch {
      initWalletKit(target);
    }
    if (address) {
      refreshBalances(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  const connect = async (walletId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const targetNetwork: NetworkType = network === 'mainnet' ? 'MAINNET' : 'TESTNET';
      const connectedAddress = await connectWallet(walletId, targetNetwork);
      setAddress(connectedAddress);
      localStorage.setItem('tansu_wallet_address', connectedAddress);
      localStorage.setItem('tansu_wallet_id', walletId);
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
    localStorage.removeItem('tansu_wallet_id');
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