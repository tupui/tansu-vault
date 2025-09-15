export interface WalletModuleConfig {
  allowedWallets: string[];
  walletConnectProjectId?: string;
  trezorConfig?: {
    email: string;
    appUrl: string;
  };
}

export const DEFAULT_WALLET_CONFIG: WalletModuleConfig = {
  allowedWallets: [
    'freighter',
    'albedo',
    'ledger',
    'walletconnect',
    'trezor',
    'rabet'
  ],
  // Optional: Configure WalletConnect project ID
  // walletConnectProjectId: 'your-project-id',
  
  // Optional: Configure Trezor
  // trezorConfig: {
  //   email: 'your-email@example.com',
  //   appUrl: 'https://your-app.com'
  // }
};

export const WALLET_DISPLAY_NAMES = {
  freighter: 'Freighter',
  albedo: 'Albedo',
  ledger: 'Ledger',
  walletconnect: 'WalletConnect',
  trezor: 'Trezor',
  rabet: 'Rabet'
};