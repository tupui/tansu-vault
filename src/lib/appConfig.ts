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
    sorobanDomainContract: 'CDODLZIO3OY5ZBCNYQALDZWLW2NN533WIDZUDNW2NRWJGLTWSABGSMH7',
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

export const getContractAddresses = (network: string = 'testnet') => {
  const config = getNetworkConfig(network);
  return {
    TANSU_PROJECT: config.tansuProjectContract || '',
    SOROBAN_DOMAIN: config.sorobanDomainContract || '',
  };
};

export const SUPPORTED_NETWORKS = Object.keys(NETWORK_CONFIG);

// Reflector Oracle Contract Addresses (three official oracles per network)
export const REFLECTOR_ORACLE_CONTRACTS = {
  mainnet: {
    external_cex: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
    pubnet: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
    forex: 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC'
  },
  testnet: {
    external_cex: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63',
    pubnet: 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP',
    forex: 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W'
  }
};