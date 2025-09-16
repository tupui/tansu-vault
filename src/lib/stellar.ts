import { 
  StellarWalletsKit, 
  WalletNetwork, 
  allowAllModules,
  FREIGHTER_ID,
  LOBSTR_ID,
  RABET_ID,
  XBULL_ID,
  ALBEDO_ID,
  HANA_ID
} from '@creit.tech/stellar-wallets-kit';
import {
  Horizon,
  Networks,
  TransactionBuilder,
  Account,
  Asset,
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
  StrKey,
} from '@stellar/stellar-sdk';
import { Server as SorobanServer, Api } from '@stellar/stellar-sdk/rpc';
import testnetContracts from '@/config/testnet.contracts.json';
import { DEFAULT_NETWORK, getWalletNetworkType } from './appConfig';

// Network configuration
export const NETWORKS = {
  TESTNET: 'TESTNET' as const,
  MAINNET: 'MAINNET' as const,
} as const;

export type NetworkType = keyof typeof NETWORKS;

export const NETWORK_DETAILS = {
  TESTNET: {
    network: Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    walletNetwork: WalletNetwork.TESTNET,
  },
  MAINNET: {
    network: Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',  
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    walletNetwork: WalletNetwork.PUBLIC,
  },
} as const;

// Current network state
let currentNetwork: NetworkType = getWalletNetworkType(DEFAULT_NETWORK);
let horizonServer: Horizon.Server;
let rpcServer: SorobanServer;
let walletKit: StellarWalletsKit | null = null;

// Initialize network-dependent services
const initializeNetwork = (network: NetworkType) => {
  currentNetwork = network;
  horizonServer = new Horizon.Server(NETWORK_DETAILS[network].horizonUrl);
  rpcServer = new SorobanServer(NETWORK_DETAILS[network].rpcUrl);
};

// Initialize with testnet by default
initializeNetwork('TESTNET');

export const TESTNET_VAULT_ADDRESS = 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC';

// Contract addresses based on network
export const getContractAddresses = () => {
  if (currentNetwork === getWalletNetworkType(DEFAULT_NETWORK)) {
    // Explicitly use the provided testnet vault address. No other logic.
    return {
      DEFINDEX_FACTORY: testnetContracts.ids.defindex_factory,
      XLM_HODL_VAULT: TESTNET_VAULT_ADDRESS,
      VAULT_HASH: testnetContracts.hashes.defindex_vault,
    };
  }
  // Add mainnet contracts when available
  return {
    DEFINDEX_FACTORY: '',
    XLM_HODL_VAULT: '',
    VAULT_HASH: '',
  };
};

export const initWalletKit = (network: NetworkType = getWalletNetworkType(DEFAULT_NETWORK)) => {
  const networkConfig = NETWORK_DETAILS[network];
  
  if (!walletKit || currentNetwork !== network) {
    initializeNetwork(network);
    walletKit = new StellarWalletsKit({
      network: networkConfig.walletNetwork,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules()
    });
  }
  return walletKit;
};

export const switchNetwork = (network: NetworkType) => {
  initializeNetwork(network);
  walletKit = null; // Force re-initialization on next use
  return initWalletKit(network);
};

export const getCurrentNetwork = () => currentNetwork;
export const getHorizonServer = () => horizonServer;

export const getWalletKit = () => {
  if (!walletKit) {
    throw new Error('Wallet kit not initialized. Call initWalletKit() first.');
  }
  return walletKit;
};

// Map UI wallet IDs to official wallet kit constants
const getOfficialWalletId = (walletId: string): string => {
  const idMap: Record<string, string> = {
    'freighter': FREIGHTER_ID,
    'xbull': XBULL_ID,
    'lobstr': LOBSTR_ID,
    'rabet': RABET_ID,
    'albedo': ALBEDO_ID,
    'hana': HANA_ID,
    'walletconnect': 'walletconnect',
    'ledger': 'ledger',
  };
  return idMap[walletId] || walletId;
};

// Wallet connection utilities
export const connectWallet = async (walletId: string, network: NetworkType = currentNetwork) => {
  const kit = initWalletKit(network);
  const officialWalletId = getOfficialWalletId(walletId);
  
  try {
    // Direct wallet connection without opening the kit modal
    await kit.setWallet(officialWalletId);
    const { address } = await kit.getAddress();
    return address;
  } catch (error: any) {
    // Handle user cancellation vs provider errors
    if (error?.message?.includes('User rejected') || error?.message?.includes('cancelled')) {
      throw new Error('Connection cancelled by user');
    }
    throw error;
  }
};

export const getWalletAddress = async () => {
  const kit = getWalletKit();
  const { address } = await kit.getAddress();
  return address;
};

export const signTransaction = async (tx: any) => {
  const kit = getWalletKit();
  const networkPassphrase = NETWORK_DETAILS[currentNetwork].network;

  // Prefer passing a Transaction object to satisfy wallets that expect it
  const txObj = typeof tx === 'string'
    ? TransactionBuilder.fromXDR(tx, networkPassphrase)
    : tx;

  try {
    const { signedTxXdr } = await kit.signTransaction(txObj, {
      networkPassphrase,
    });
    return signedTxXdr;
  } catch (primaryError) {
    // Fallback: some wallets expect a raw XDR string
    try {
      const xdrString = typeof tx === 'string' ? tx : txObj.toXDR();
      const { signedTxXdr } = await kit.signTransaction(xdrString, {
        networkPassphrase,
      });
      return signedTxXdr;
    } catch (secondaryError) {
      console.error('Failed to sign transaction (both object and XDR attempts):', secondaryError);
      throw secondaryError;
    }
  }
};

// Account utilities
export const loadAccount = async (address: string): Promise<Account> => {
  try {
    return await getHorizonServer().loadAccount(address);
  } catch (error) {
    console.error('Failed to load account:', error);
    throw new Error('Account not found or network error');
  }
};

export const getAccountBalances = async (address: string): Promise<any[]> => {
  try {
    const account = await getHorizonServer().loadAccount(address);
    // Return balances in the format expected by AssetBalancePanel (balance as string)
    return account.balances.map(balance => {
      const baseBalance = {
        asset_type: balance.asset_type,
        balance: balance.balance // Keep as string to match Stellar-Stratum format
      };
      
      // Add asset_code and asset_issuer for non-native assets
      if (balance.asset_type !== 'native' && 'asset_code' in balance) {
        return {
          ...baseBalance,
          asset_code: balance.asset_code,
          asset_issuer: balance.asset_issuer
        };
      }
      
      return baseBalance;
    });
  } catch (error) {
    console.error('Failed to get account balances:', error);
    throw new Error('Failed to fetch account balances');
  }
};

export const getAssetBalance = async (address: string, asset: Asset): Promise<number> => {
  const balances = await getAccountBalances(address);
  const balance = balances.find(b => {
    if (asset.isNative()) {
      return b.asset_type === 'native';
    } else {
      return 'asset_code' in b && 'asset_issuer' in b && 
             b.asset_code === asset.code && b.asset_issuer === asset.issuer;
    }
  });
  return balance ? parseFloat(balance.balance) : 0;
};

// Helper function to build contract transactions
const buildContractTransaction = async (
  userAddress: string,
  contractAddress: string,
  method: string,
  params: any[] = []
) => {
  const account = await loadAccount(userAddress);
  const contract = new Contract(contractAddress);

  const operation = contract.call(
    method,
    ...params
  );

  return new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_DETAILS[currentNetwork].network,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
};

export const depositToVault = async (userAddress: string, amount: string): Promise<string> => {
  // Use simple Tansu-style function
  const { depositToVault: deposit } = await import('./vault-transactions');
  return await deposit(userAddress, amount);
};

export const withdrawFromVault = async (userAddress: string, xlmAmount: string, slippagePercent: number = 5): Promise<string> => {
  // Use the new Tansu-style withdraw function
  const { withdrawFromVault: withdraw } = await import('./vault-transactions');
  return await withdraw(userAddress, xlmAmount, slippagePercent);
};

export const getVaultTotalBalance = async (): Promise<string> => {
  const { getVaultTotalBalance: getTotalBalance } = await import('./vault-transactions');
  return await getTotalBalance();
};

export const getVaultBalance = async (userAddress: string): Promise<string> => {
  const { getVaultBalance: getBalance } = await import('./vault-transactions');
  return await getBalance(userAddress);
};

// Pricing utilities using Reflector Network (always mainnet for accurate rates)
export const fetchAssetPrice = async (assetCode: string, currency: string = 'USD', network?: 'mainnet' | 'testnet'): Promise<number> => {
  const { getAssetPrice } = await import('@/lib/reflector');
  return await getAssetPrice(assetCode, currency); // Always uses mainnet
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatAssetAmount = (amount: string | number, decimals: number = 7): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};