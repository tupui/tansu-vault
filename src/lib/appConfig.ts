export interface NetworkConfig {
  name: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  networkPassphrase: string;
  sorobanDomainContract?: string;
  tansuProjectContract?: string;
}

export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    sorobanDomainContract: 'CATRNPHYKNXAPNLHEYH55REB6YSAJLGCPA4YM6L3WUKSZOPI77M2UMKI',
    tansuProjectContract: 'CBCXMB3JKKDOYHMBIBH3IQDPVCLHV4LQPCYA2LPKLLQ6JNJHAYPCUFAN',
  },
  testnet: {
    name: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org:443',
    networkPassphrase: 'Test SDF Network ; September 2015',
    sorobanDomainContract: 'CAQWEZNN5X7LFD6PZBQXALVH4LSJW2KGNDMFJBQ3DWHXUVQ2JIZ6AQU6',
    tansuProjectContract: 'CBCXMB3JKKDOYHMBIBH3IQDPVCLHV4LQPCYA2LPKLLQ6JNJHAYPCUFAN',
  }
};

export const getNetworkConfig = (network: string): NetworkConfig => {
  const config = NETWORK_CONFIG[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  return config;
};

export const SUPPORTED_NETWORKS = Object.keys(NETWORK_CONFIG);

// Reflector Oracle Contract Addresses
export const REFLECTOR_ORACLE_CONTRACTS = {
  mainnet: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGIH67Y',
  testnet: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGIH67Y'
};