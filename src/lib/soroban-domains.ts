import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { getNetworkConfig } from './appConfig';
import { isValidDomain, isValidPublicKey } from './validation';

// Simple domain resolution without external SDK
let rpcServer: SorobanServer | null = null;
let currentNetwork: string | null = null;

/**
 * Initialize the RPC server for the given network
 */
export const initializeDomainRPC = (network: string): void => {
  if (rpcServer && currentNetwork === network) {
    return; // Already initialized for this network
  }

  const config = getNetworkConfig(network);
  rpcServer = new SorobanServer(config.sorobanRpcUrl);
  currentNetwork = network;
};

/**
 * Resolve a Soroban domain to a Stellar address
 */
export const resolveSorobanDomain = async (domain: string, network: string): Promise<string | null> => {
  if (!domain || !isValidDomain(domain)) {
    return null;
  }

  // If it's already a valid public key, return as-is
  if (isValidPublicKey(domain)) {
    return domain;
  }

  try {
    // Initialize RPC if needed
    initializeDomainRPC(network);
    
    if (!rpcServer) {
      throw new Error('RPC server not initialized');
    }

    // For now, return null as domain resolution needs proper contract integration
    // This would require calling the actual Soroban domain contract
    console.log(`Domain resolution for ${domain} is not yet implemented`);
    return null;
  } catch (error) {
    console.warn(`Failed to resolve domain ${domain}:`, error);
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
    initializeDomainRPC(network);
    
    if (!rpcServer) {
      return false;
    }

    // For now, assume all domains are available
    // This would require calling the actual Soroban domain contract
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
    initializeDomainRPC(network);
    
    if (!rpcServer) {
      return null;
    }

    // For now, return null as this needs proper contract integration
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