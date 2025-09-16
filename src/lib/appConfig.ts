export interface NetworkConfig {
  name: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
  sorobanDomainContract?: string;
  tansuProjectContract?: string;
  vaultContract?: string;
}

export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://mainnet.sorobanrpc.com',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    sorobanDomainContract: 'CATRNPHYKNXAPNLHEYH55REB6YSAJLGCPA4YM6L3WUKSZOPI77M2UMKI',
    tansuProjectContract: 'CBCXMB3JKKDOYHMBIBH3IQDPVCLHV4LQPCYA2LPKLLQ6JNJHAYPCUFAN',
    vaultContract: 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC',
  },
  testnet: {
    name: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org:443',
    networkPassphrase: 'Test SDF Network ; September 2015',
    sorobanDomainContract: 'CAQWEZNN5X7LFD6PZBQXALVH4LSJW2KGNDMFJBQ3DWHXUVQ2JIZ6AQU6',
    tansuProjectContract: 'CBCXMB3JKKDOYHMBIBH3IQDPVCLHV4LQPCYA2LPKLLQ6JNJHAYPCUFAN',
    vaultContract: 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC',
  }
};

export const getNetworkConfig = (network: string): NetworkConfig => {
  const config = NETWORK_CONFIG[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  return config;
};

export const getContractAddresses = (network: string = DEFAULT_NETWORK) => {
  const config = getNetworkConfig(network);
  
  // Load DeFindex contract addresses from testnet.contracts.json for testnet
  if (network === 'testnet') {
    return {
      TANSU_PROJECT: config.tansuProjectContract || '',
      SOROBAN_DOMAIN: config.sorobanDomainContract || '',
      VAULT: config.vaultContract || 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC',
      DEFINDEX_FACTORY: 'CD6MEVYGXCCUTOUIC3GNMIDOSRY4A2WGCRQGOOCVG5PK2N7UNGGU6BBQ',
      XLM_HODL_VAULT: 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC',
      XLM_HODL_STRATEGY_0: 'CCEE2VAGPXKVIZXTVIT4O5B7GCUDTZTJ5RIXBPJSZ7JWJCJ2TLK75WVW',
      XLM_HODL_STRATEGY_1: 'CAHWRPKBPX4FNLXZOAD565IBSICQPL5QX37IDLGJYOPWX22WWKFWQUBA'
    };
  }
  
  return {
    TANSU_PROJECT: config.tansuProjectContract || '',
    SOROBAN_DOMAIN: config.sorobanDomainContract || '',
    VAULT: config.vaultContract || '',
  };
};

export const SUPPORTED_NETWORKS = Object.keys(NETWORK_CONFIG);

// Default network for data loading (testnet for development)
export const DEFAULT_NETWORK: 'mainnet' | 'testnet' = 'testnet';

// Default network for pricing (mainnet for accuracy)
export const DEFAULT_PRICING_NETWORK: 'mainnet' | 'testnet' = 'mainnet';

// Helper to convert network string to WalletKit NetworkType
export const getWalletNetworkType = (network: 'mainnet' | 'testnet'): 'MAINNET' | 'TESTNET' => {
  return network === 'mainnet' ? 'MAINNET' : 'TESTNET';
};

// Reflector Oracle Contract Addresses (working addresses from proven code)
export const REFLECTOR_ORACLE_CONTRACTS = {
  mainnet: {
    external_cex: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
    pubnet: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
    forex: 'CBXEUUO3FWPQJE2ZRRF6J5DHHRUDFO3SOWSB7BAFF3TKA3AVCVMEDOEN'
  },
  testnet: {
    external_cex: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
    pubnet: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
    forex: 'CBXEUUO3FWPQJE2ZRRF6J5DHHRUDFO3SOWSB7BAFF3TKA3AVCVMEDOEN'
  }
};

// Cache and rate limiting configuration
export const CACHE_CONFIG = {
  PRICE_TTL: 5 * 60 * 1000, // 5 minutes
  ASSET_LIST_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_MEMORY_ENTRIES: 1000,
  RATE_LIMIT_WINDOW: 10_000, // 10 seconds
  RATE_LIMIT_BURST: 50, // 50 requests per window
};