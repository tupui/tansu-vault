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
  walletId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  balances: any[];
  isDomainConnected: boolean;
  connectedDomain: string | null;
  connect: (walletId: string) => Promise<void>;
  connectViaDomain: (walletId: string, domain: string) => Promise<void>;
  connectReadOnly: (address: string, source?: string) => Promise<void>;
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
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [isDomainConnected, setIsDomainConnected] = useState(false);
  const [connectedDomain, setConnectedDomain] = useState<string | null>(null);

  const { network } = useNetwork();

  const isConnected = Boolean(address);

  // Initialize wallet kit and restore connection
  useEffect(() => {
  const restoreConnection = async () => {
      const savedAddress = localStorage.getItem('tansu_wallet_address');
      const savedWalletId = localStorage.getItem('tansu_wallet_id');
      const savedDomain = localStorage.getItem('tansu_connected_domain');
      
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
          setWalletId(savedWalletId);
          setIsDomainConnected(!!savedDomain);
          setConnectedDomain(savedDomain);
          await refreshBalances(savedAddress);
        } catch (error) {
          console.warn('Failed to restore wallet connection:', error);
          // Clear invalid saved data
          localStorage.removeItem('tansu_wallet_address');
          localStorage.removeItem('tansu_wallet_id');
          localStorage.removeItem('tansu_connected_domain');
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
      setWalletId(walletId);
      setIsDomainConnected(false);
      setConnectedDomain(null);
      localStorage.setItem('tansu_wallet_address', connectedAddress);
      localStorage.setItem('tansu_wallet_id', walletId);
      localStorage.removeItem('tansu_connected_domain');
      await refreshBalances(connectedAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const connectViaDomain = async (walletId: string, domain: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const targetNetwork: NetworkType = network === 'mainnet' ? 'MAINNET' : 'TESTNET';
      const connectedAddress = await connectWallet(walletId, targetNetwork);
      setAddress(connectedAddress);
      setWalletId(walletId);
      setIsDomainConnected(true);
      setConnectedDomain(domain);
      localStorage.setItem('tansu_wallet_address', connectedAddress);
      localStorage.setItem('tansu_wallet_id', walletId);
      localStorage.setItem('tansu_connected_domain', domain);
      await refreshBalances(connectedAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const connectReadOnly = async (address: string, source?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set up read-only connection (no wallet signing capability)
      setAddress(address);
      setWalletId(null); // No wallet ID for read-only
      setIsDomainConnected(!!source);
      setConnectedDomain(source || null);
      localStorage.setItem('tansu_wallet_address', address);
      localStorage.setItem('tansu_readonly_mode', 'true');
      if (source) {
        localStorage.setItem('tansu_connected_domain', source);
      }
      await refreshBalances(address);
    } catch (err: any) {
      setError(err.message || 'Failed to connect in read-only mode');
      console.error('Read-only connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setWalletId(null);
    setBalances([]);
    setError(null);
    setIsDomainConnected(false);
    setConnectedDomain(null);
    localStorage.removeItem('tansu_wallet_address');
    localStorage.removeItem('tansu_wallet_id');
    localStorage.removeItem('tansu_connected_domain');
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
    walletId,
    isConnected,
    isLoading,
    error,
    balances,
    isDomainConnected,
    connectedDomain,
    connect,
    connectViaDomain,
    connectReadOnly,
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