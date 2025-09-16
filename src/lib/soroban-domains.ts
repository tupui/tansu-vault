import { getNetworkConfig } from './appConfig';
import { isValidDomain } from './validation';
/**
 * Resolve a Soroban domain to a Stellar address using SorobanDomainsSDK
 */
export const resolveSorobanDomain = async (
  domain: string,
  network: 'mainnet' | 'testnet'
): Promise<string | null> => {
  try {
    if (!domain || !isValidDomain(domain)) return null;

    const normalized = domain.trim().toLowerCase();
    const cfg = getNetworkConfig(network);

    // Dynamic imports to keep bundle small
    const StellarSDK: any = await import('@stellar/stellar-sdk');
    const { SorobanDomainsSDK }: any = await import('@creit.tech/sorobandomains-sdk');

    const rpcServer = new StellarSDK.rpc.Server(cfg.sorobanRpcUrl);

    const sdk = new SorobanDomainsSDK({
      stellarSDK: StellarSDK,
      rpc: rpcServer,
      network: cfg.networkPassphrase,
      vaultsContractId: cfg.sorobanDomainContract,
      defaultFee: '100',
      defaultTimeout: 30,
      simulationAccount: 'GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV'
    });

    const res = await sdk.searchDomain({ domain: normalized });
    const v = (res && (res.value ?? res)) as any;

    if (v && typeof v.owner === 'string') {
      const resolved = v.address || v.owner;
      return typeof resolved === 'string' ? resolved : null;
    }

    return null;
  } catch (error) {
    console.error('Soroban domain resolution error:', error);
    return null;
  }
};

/**
 * Check if a domain is available for registration
 */
export const isDomainAvailable = async (domain: string, network: string): Promise<boolean> => {
  if (!domain || !isValidDomain(domain)) {
    return false;
  }

  try {
    // TODO: Implement actual availability check via SDK if needed
    return true;
  } catch (error) {
    console.warn(`Failed to check domain availability for ${domain}:`, error);
    return false;
  }
};

/**
 * Get domain information including owner and expiration
 */
export const getDomainInfo = async (domain: string, network: string) => {
  if (!domain || !isValidDomain(domain)) {
    return null;
  }

  try {
    // Not implemented yet
    return null;
  } catch (error) {
    console.warn(`Failed to get domain info for ${domain}:`, error);
    return null;
  }
};

/**
 * Suggest similar domains if the requested one is not available
 */
export const suggestSimilarDomains = async (domain: string, network: string): Promise<string[]> => {
  if (!domain) {
    return [];
  }

  const baseName = domain.endsWith('.xlm') ? domain.slice(0, -4) : domain;
  const suggestions = [
    `${baseName}1.xlm`,
    `${baseName}2.xlm`,
    `${baseName}3.xlm`,
    `my${baseName}.xlm`,
    `${baseName}app.xlm`,
    `${baseName}wallet.xlm`,
  ];

  const availableSuggestions: string[] = [];
  
  for (const suggestion of suggestions) {
    try {
      const isAvailable = await isDomainAvailable(suggestion, network);
      if (isAvailable) {
        availableSuggestions.push(suggestion);
      }
    } catch (error) {
      // Skip suggestions that fail to check
      continue;
    }
    
    // Limit suggestions to avoid too many API calls
    if (availableSuggestions.length >= 3) {
      break;
    }
  }

  return availableSuggestions;
};