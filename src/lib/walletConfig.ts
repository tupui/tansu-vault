/**
 * Wallet configuration for Stellar-Stratum style wallet connections
 */

export interface WalletConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: 'extension' | 'hardware' | 'mobile' | 'web';
  isHardware?: boolean;
  detectAvailability?: () => boolean;
  installUrl?: string;
}

export const WALLET_CONFIGS: Record<string, WalletConfig> = {
  freighter: {
    id: 'freighter',
    name: 'Freighter',
    description: 'Browser extension wallet for Stellar',
    type: 'extension',
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).freighter,
    installUrl: 'https://freighter.app/'
  },
  xbull: {
    id: 'xbull',
    name: 'xBull Wallet',
    description: 'Multi-platform wallet (Mobile, Web, Extension)',
    type: 'extension',
    detectAvailability: () => typeof window !== 'undefined' && (!!(window as any).xBullWalletConnect || !!(window as any).xBull),
    installUrl: 'https://xbull.app/'
  },
  ledger: {
    id: 'ledger',
    name: 'Ledger',
    description: 'Hardware wallet (via USB or Bluetooth)',
    type: 'hardware',
    isHardware: true,
    detectAvailability: () => true,
    installUrl: 'https://www.ledger.com/'
  },
  lobstr: {
    id: 'lobstr',
    name: 'LOBSTR',
    description: 'Mobile wallet with web connector',
    type: 'mobile',
    detectAvailability: () => true,
    installUrl: 'https://lobstr.co/'
  },
  rabet: {
    id: 'rabet',
    name: 'Rabet',
    description: 'Browser extension wallet',
    type: 'extension',
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).rabet,
    installUrl: 'https://rabet.io/'
  },
  hana: {
    id: 'hana',
    name: 'Hana Wallet',
    description: 'Mobile and browser extension wallet',
    type: 'extension',
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).hana,
    installUrl: 'https://hanawallet.io/'
  },
  walletconnect: {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Connect mobile wallets via QR code',
    type: 'mobile',
    detectAvailability: () => true,
    installUrl: 'https://walletconnect.org/'
  },
  albedo: {
    id: 'albedo',
    name: 'Albedo',
    description: 'Web-based wallet for Stellar',
    type: 'web',
    detectAvailability: () => true,
    installUrl: 'https://albedo.link/'
  },
  hot: {
    id: 'hot',
    name: 'HOT Wallet',
    description: 'Available',
    type: 'mobile',
    detectAvailability: () => true,
    installUrl: 'https://hot.stellar.org/'
  }
};

export const DEFAULT_WALLET_CONFIG = {
  defaultWalletId: 'freighter',
  autoConnectOnLoad: false,
  showAllWallets: true,
  allowHardwareWallets: true,
  allowMobileWallets: true,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Get wallet configuration by ID
 */
export const getWalletConfig = (walletId: string): WalletConfig | null => {
  return WALLET_CONFIGS[walletId] || null;
};

/**
 * Get all available wallets
 */
export const getAllWallets = (): WalletConfig[] => {
  return Object.values(WALLET_CONFIGS);
};

/**
 * Get wallets by type
 */
export const getWalletsByType = (type: WalletConfig['type']): WalletConfig[] => {
  return Object.values(WALLET_CONFIGS).filter(wallet => wallet.type === type);
};

/**
 * Get available wallets (those that can be detected)
 */
export const getAvailableWallets = (): WalletConfig[] => {
  return Object.values(WALLET_CONFIGS).filter(wallet => 
    !wallet.detectAvailability || wallet.detectAvailability()
  );
};

/**
 * Check if a wallet is available
 */
export const isWalletAvailable = (walletId: string): boolean => {
  const config = getWalletConfig(walletId);
  if (!config) return false;
  
  return !config.detectAvailability || config.detectAvailability();
};

/**
 * Get primary wallets (most commonly used)
 */
export const getPrimaryWallets = (): WalletConfig[] => {
  const primaryIds = ['freighter', 'xbull', 'ledger'];
  return primaryIds.map(id => WALLET_CONFIGS[id]).filter(Boolean);
};

/**
 * Get secondary wallets (less common)
 */
export const getSecondaryWallets = (): WalletConfig[] => {
  const primaryIds = ['freighter', 'xbull', 'ledger'];
  return Object.values(WALLET_CONFIGS).filter(wallet => 
    !primaryIds.includes(wallet.id)
  );
};