import { 
  StellarWalletsKit, 
  WalletNetwork, 
  allowAllModules,
  FREIGHTER_ID,
  LOBSTR_ID,
  RABET_ID
} from '@creit.tech/stellar-wallets-kit';
import {
  Horizon,
  Networks,
  TransactionBuilder,
  Account,
  Asset,
  Contract,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import testnetContracts from '@/config/testnet.contracts.json';

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
    rpcUrl: 'https://soroban.stellar.org',
    walletNetwork: WalletNetwork.PUBLIC,
  },
} as const;

// Current network state
let currentNetwork: NetworkType = 'TESTNET';
let horizonServer: Horizon.Server;
let walletKit: StellarWalletsKit | null = null;

// Initialize network-dependent services
const initializeNetwork = (network: NetworkType) => {
  currentNetwork = network;
  horizonServer = new Horizon.Server(NETWORK_DETAILS[network].horizonUrl);
};

// Initialize with testnet by default
initializeNetwork('TESTNET');

// Contract addresses based on network
export const getContractAddresses = () => {
  if (currentNetwork === 'TESTNET') {
    return {
      DEFINDEX_FACTORY: testnetContracts.ids.defindex_factory,
      XLM_HODL_VAULT: testnetContracts.ids.xlm_hodl_vault,
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

export const initWalletKit = (network: NetworkType = 'TESTNET') => {
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

// Wallet connection utilities
export const connectWallet = async (walletId: string) => {
  const kit = getWalletKit();
  await kit.setWallet(walletId);
  const { address } = await kit.getAddress();
  return address;
};

export const getWalletAddress = async () => {
  const kit = getWalletKit();
  const { address } = await kit.getAddress();
  return address;
};

export const signTransaction = async (xdr: string) => {
  const kit = getWalletKit();
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    networkPassphrase: NETWORK_DETAILS[currentNetwork].network
  });
  return signedTxXdr;
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
    return account.balances;
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
  try {
    const contracts = getContractAddresses();

    const amountToI128 = (amt: string, decimals = 7): string => {
      const neg = amt.trim().startsWith('-');
      const s = neg ? amt.trim().slice(1) : amt.trim();
      const [intPart, fracRaw = ''] = s.split('.');
      const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
      const scaled = (BigInt(intPart || '0') * (10n ** BigInt(decimals))) + BigInt(frac || '0');
      return (neg ? -scaled : scaled).toString();
    };

    const i128 = amountToI128(amount);

    const transaction = await buildContractTransaction(
      userAddress,
      contracts.XLM_HODL_VAULT,
      'deposit',
      [nativeToScVal(i128, { type: 'i128' })]
    );

    const signedXdr = await signTransaction(transaction.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_DETAILS[currentNetwork].network);
    const result = await getHorizonServer().submitTransaction(signedTx);
    return result.hash;
  } catch (error) {
    console.error('Deposit failed:', error);
    throw new Error(`Deposit failed: ${error}`);
  }
};

export const withdrawFromVault = async (userAddress: string, amount: string): Promise<string> => {
  try {
    const contracts = getContractAddresses();

    const amountToI128 = (amt: string, decimals = 7): string => {
      const neg = amt.trim().startsWith('-');
      const s = neg ? amt.trim().slice(1) : amt.trim();
      const [intPart, fracRaw = ''] = s.split('.');
      const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
      const scaled = (BigInt(intPart || '0') * (10n ** BigInt(decimals))) + BigInt(frac || '0');
      return (neg ? -scaled : scaled).toString();
    };

    const i128 = amountToI128(amount);

    const transaction = await buildContractTransaction(
      userAddress,
      contracts.XLM_HODL_VAULT,
      'withdraw',
      [nativeToScVal(i128, { type: 'i128' })]
    );

    const signedXdr = await signTransaction(transaction.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_DETAILS[currentNetwork].network);
    const result = await getHorizonServer().submitTransaction(signedTx);
    return result.hash;
  } catch (error) {
    console.error('Withdrawal failed:', error);
    throw new Error(`Withdrawal failed: ${error}`);
  }
};

export const getVaultBalance = async (userAddress: string): Promise<string> => {
  // TODO: Implement actual vault balance fetching from contract
  // For now, return placeholder
  return "0";
};

// Pricing utilities using Reflector Network
export const fetchAssetPrice = async (assetCode: string, currency: string = 'USD'): Promise<number> => {
  try {
    // Use Reflector Network oracles - follows Stellar-Stratum pattern
    const oracle = `${assetCode}${currency}`;
    const response = await fetch(`https://api.reflector.network/v1/oracle/${oracle}/latest`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${assetCode} price in ${currency}`);
    }
    
    const data = await response.json();
    return data.value ? parseFloat(data.value) : 0;
  } catch (error) {
    console.error(`Error fetching ${assetCode} price:`, error);
    
    // Fallback prices for development
    const fallbackPrices: Record<string, number> = {
      XLMUSD: 0.12,
      USDCUSD: 1.00,
      XLMEUR: 0.11,
      USDCEUR: 0.92,
      XLMGBP: 0.095,
      USDCGBP: 0.79,
    };
    
    const key = `${assetCode}${currency}`.toUpperCase();
    return fallbackPrices[key] || 0;
  }
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