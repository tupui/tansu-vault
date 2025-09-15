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
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  Account,
  Asset,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  Soroban
} from '@stellar/stellar-sdk';

// Network configuration
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const RPC_URL = 'https://soroban-testnet.stellar.org';

// DeFindex contract addresses from paltalabs/defindex testnet.contracts.json
export const DEFINDEX_CONTRACTS = {
  factory: 'CD6MEVYGXCCUTOUIC3GNMIDOSRY4A2WGCRQGOOCVG5PK2N7UNGGU6BBQ',
  xlm_hodl_vault: 'CCGKL6U2DHSNFJ3NU4UPRUKYE2EUGYR4ZFZDYA7KDJLP3TKSPHD5C4UP',
  vault_hash: 'ae3409a4090bc087b86b4e9b444d2b8017ccd97b90b069d44d005ab9f8e1468b'
};

// Initialize Stellar services
export const horizonServer = new Horizon.Server(HORIZON_URL);

// Wallet Kit instance
let walletKit: StellarWalletsKit | null = null;

export const initWalletKit = () => {
  if (!walletKit) {
    walletKit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules()
    });
  }
  return walletKit;
};

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
    networkPassphrase: NETWORK_PASSPHRASE
  });
  return signedTxXdr;
};

// Account utilities
export const loadAccount = async (address: string): Promise<Account> => {
  const account = await horizonServer.loadAccount(address);
  return account;
};

export const getAccountBalances = async (address: string) => {
  const accountResponse = await horizonServer.loadAccount(address);
  return accountResponse.balances;
};

// Asset utilities
export const getAssetBalance = async (address: string, asset: Asset) => {
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

// Contract interaction utilities
export const buildContractTransaction = async (
  sourceAccount: string,
  contractAddress: string,
  method: string,
  params: any[]
) => {
  const account = await loadAccount(sourceAccount);
  const contract = new Contract(contractAddress);
  
  const operation = contract.call(
    method,
    ...params.map(param => nativeToScVal(param))
  );

  return new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
};

// DeFindex vault operations
export const depositToVault = async (
  userAddress: string,
  amount: string,
  asset: Asset
) => {
  const contract = new Contract(DEFINDEX_CONTRACTS.xlm_hodl_vault);
  const params = [
    Address.fromString(userAddress),
    nativeToScVal(amount, { type: 'i128' }),
    // Asset parameter for vault
  ];

  const transaction = await buildContractTransaction(
    userAddress,
    DEFINDEX_CONTRACTS.xlm_hodl_vault,
    'deposit',
    params
  );

  const xdr = transaction.toXDR();
  const signedXDR = await signTransaction(xdr);
  const signedTransaction = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
  
  return horizonServer.submitTransaction(signedTransaction);
};

export const withdrawFromVault = async (
  userAddress: string,
  amount: string
) => {
  const contract = new Contract(DEFINDEX_CONTRACTS.xlm_hodl_vault);
  const params = [
    Address.fromString(userAddress),
    nativeToScVal(amount, { type: 'i128' })
  ];

  const transaction = await buildContractTransaction(
    userAddress,
    DEFINDEX_CONTRACTS.xlm_hodl_vault,
    'withdraw',
    params
  );

  const xdr = transaction.toXDR();
  const signedXDR = await signTransaction(xdr);
  const signedTransaction = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
  
  return horizonServer.submitTransaction(signedTransaction);
};

export const getVaultBalance = async (userAddress: string) => {
  // Implementation for reading vault balance from contract
  // This would use Soroban RPC to call a read-only method
  const contract = new Contract(DEFINDEX_CONTRACTS.xlm_hodl_vault);
  // TODO: Implement RPC call to get user's vault balance
  return '0';
};

// Price fetching from Reflector Network (following Stellar-Stratum pattern)
export const fetchAssetPrice = async (assetCode: string, currency: string = 'USD') => {
  try {
    // Using Reflector Network for price data (pattern from Stellar-Stratum)
    const response = await fetch(`https://api.reflector.network/v1/price/${assetCode}/${currency}`);
    const data = await response.json();
    return data.price || 0;
  } catch (error) {
    console.error('Error fetching asset price:', error);
    return 0;
  }
};

// Format currency values
export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatAssetAmount = (amount: string | number, decimals: number = 7) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};