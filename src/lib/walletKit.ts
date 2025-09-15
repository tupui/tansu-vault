import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { getNetworkConfig } from '@/lib/appConfig';
import { DEFAULT_WALLET_CONFIG } from '@/lib/walletConfig';
import { isValidNetwork } from '@/lib/validation';

let walletKit: StellarWalletsKit | null = null;
let currentNetwork: string | null = null;

/**
 * Create and configure Stellar Wallets Kit for specific network
 */
export const createWalletKit = (network: string): StellarWalletsKit => {
  if (!isValidNetwork(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  // Return existing kit if network hasn't changed
  if (walletKit && currentNetwork === network) {
    return walletKit;
  }

  const config = getNetworkConfig(network);
  const stellarNetwork: WalletNetwork = network === 'mainnet' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;

  try {
    walletKit = new StellarWalletsKit({
      network: stellarNetwork,
      selectedWalletId: 'freighter', // Default wallet
      modules: allowAllModules()
    });

    currentNetwork = network;
    return walletKit;
  } catch (error) {
    console.error('Failed to create wallet kit:', error);
    throw new Error(`Failed to initialize wallet kit for ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get the current wallet kit instance
 */
export const getWalletKit = (): StellarWalletsKit => {
  if (!walletKit) {
    throw new Error('Wallet kit not initialized. Call createWalletKit first.');
  }
  return walletKit;
};

/**
 * Sign transaction with the connected wallet
 */
export const signWithWallet = async (xdr: string, network?: string): Promise<string> => {
  const kit = network ? createWalletKit(network) : getWalletKit();
  
  try {
    const { signedTxXdr } = await kit.signTransaction(xdr);
    return signedTxXdr;
  } catch (error) {
    console.error('Failed to sign transaction:', error);
    throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Connect to a specific wallet
 */
export const connectToWallet = async (walletId: string, network: string): Promise<string> => {
  const kit = createWalletKit(network);
  
  try {
    await kit.openModal({
      onWalletSelected: async (option) => {
        kit.setWallet(option.id);
      }
    });

    // Get the address after connection
    const { address } = await kit.getAddress();
    return address;
  } catch (error) {
    console.error(`Failed to connect to ${walletId}:`, error);
    throw new Error(`Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Disconnect the current wallet
 */
export const disconnectWallet = (): void => {
  if (walletKit) {
    try {
      // Reset the wallet kit
      walletKit = null;
      currentNetwork = null;
    } catch (error) {
      console.warn('Error during wallet disconnect:', error);
    }
  }
};

/**
 * Check if a wallet is connected
 */
export const isWalletConnected = (): boolean => {
  return walletKit !== null;
};

/**
 * Get supported wallet types with availability check
 */
export const getSupportedWallets = async (network?: string): Promise<any[]> => {
  try {
    // Mock wallet data - in a real implementation, this would query the actual wallet kit
    const mockWallets = [
      {
        id: 'freighter',
        name: 'Freighter',
        icon: null,
        isAvailable: typeof window !== 'undefined' && !!(window as any).freighter
      },
      {
        id: 'xbull',
        name: 'xBull',
        icon: null,
        isAvailable: typeof window !== 'undefined' && !!(window as any).xBullWalletConnect
      },
      {
        id: 'ledger',
        name: 'Ledger',
        icon: null,
        isAvailable: true // Hardware wallets are always "available"
      },
      {
        id: 'lobstr',
        name: 'Lobstr',
        icon: null,
        isAvailable: true
      },
      {
        id: 'hot',
        name: 'Hot Wallet',
        icon: null,
        isAvailable: true
      },
      {
        id: 'albedo',
        name: 'Albedo',
        icon: null,
        isAvailable: true
      }
    ];
    
    return mockWallets;
  } catch (error) {
    console.error('Failed to get supported wallets:', error);
    return [];
  }
};

/**
 * Switch to a different network
 */
export const switchWalletNetwork = (network: string): StellarWalletsKit => {
  if (!isValidNetwork(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  // Disconnect current wallet when switching networks
  disconnectWallet();
  
  // Create new wallet kit for the new network
  return createWalletKit(network);
};