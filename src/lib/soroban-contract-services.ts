import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { Contract, Address, scValToNative, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { getNetworkConfig } from './appConfig';

/**
 * Get RPC server instance for the specified network
 */
function getRpcServer(network: 'mainnet' | 'testnet'): SorobanServer {
  const config = getNetworkConfig(network);
  return new SorobanServer(config.sorobanRpcUrl);
}

/**
 * Get network passphrase for the specified network
 */
function getNetworkPassphrase(network: 'mainnet' | 'testnet'): string {
  const config = getNetworkConfig(network);
  return config.networkPassphrase;
}

/**
 * Soroban Domain Contract Service
 */
export class SorobanDomainContractService {
  private contractId: string;
  private rpcServer: SorobanServer;
  private networkPassphrase: string;

  constructor(contractId: string, network: 'mainnet' | 'testnet') {
    this.contractId = contractId;
    this.rpcServer = getRpcServer(network);
    this.networkPassphrase = getNetworkPassphrase(network);
  }

  /**
   * Resolve a domain name to an address
   */
  async resolve(domain: string): Promise<string | null> {
    try {
      const contract = new Contract(this.contractId);
      const domainParam = nativeToScVal(domain, { type: 'string' });
      
      const operation = contract.call('resolve', domainParam);
      const tx = await this.rpcServer.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        console.warn('Domain resolution failed:', tx.error);
        return null;
      }

      const result = tx.result?.retval;
      return result ? scValToNative(result) : null;
    } catch (error) {
      console.error('Failed to resolve domain:', error);
      return null;
    }
  }

  /**
   * Register a domain name (requires wallet interaction)
   */
  async register(domain: string, address: string, walletKit: any): Promise<boolean> {
    try {
      const contract = new Contract(this.contractId);
      const domainParam = nativeToScVal(domain, { type: 'string' });
      const addressParam = nativeToScVal(Address.fromString(address));
      
      // This would require actual transaction signing with walletKit
      // For now, we'll return false to indicate registration is not implemented
      console.warn('Domain registration not fully implemented');
      return false;
    } catch (error) {
      console.error('Failed to register domain:', error);
      return false;
    }
  }
}

/**
 * Tansu Project Contract Service
 */
export class TansuProjectContractService {
  private contractId: string;
  private rpcServer: SorobanServer;
  private networkPassphrase: string;

  constructor(contractId: string, network: 'mainnet' | 'testnet') {
    this.contractId = contractId;
    this.rpcServer = getRpcServer(network);
    this.networkPassphrase = getNetworkPassphrase(network);
  }

  /**
   * Search for projects based on a query string
   */
  async searchProjects(query: string): Promise<any[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      // Create a simple contract call for search_projects
      const contract = new Contract(this.contractId);
      const searchParam = nativeToScVal(query, { type: 'string' });
      
      // Build transaction for simulation
      const operation = contract.call('search_projects', searchParam);
      const tx = await this.rpcServer.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        console.warn('Contract simulation error:', tx.error);
        return [];
      }

      // Parse results if successful
      const result = tx.result?.retval;
      if (result) {
        const projects = scValToNative(result);
        return Array.isArray(projects) ? projects : [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to search projects:', error);
      throw error;
    }
  }

  /**
   * Get a specific project by ID or domain
   */
  async getProject(identifier: string): Promise<any | null> {
    try {
      const contract = new Contract(this.contractId);
      const identifierParam = nativeToScVal(identifier, { type: 'string' });
      
      const operation = contract.call('get_project', identifierParam);
      const tx = await this.rpcServer.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        console.warn('Failed to get project:', tx.error);
        return null;
      }

      const result = tx.result?.retval;
      return result ? scValToNative(result) : null;
    } catch (error) {
      console.error('Failed to get project:', error);
      return null;
    }
  }

  /**
   * Get admins configuration from the contract
   */
  async getAdminsConfig(): Promise<string[]> {
    try {
      const contract = new Contract(this.contractId);
      
      const operation = contract.call('get_admins_config');
      const tx = await this.rpcServer.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        console.warn('Failed to get admins config:', tx.error);
        return [];
      }

      const result = tx.result?.retval;
      if (result) {
        const admins = scValToNative(result);
        return Array.isArray(admins) ? admins : [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get admins config:', error);
      return [];
    }
  }

  /**
   * Check if an address is a maintainer for a specific project
   */
  async isMaintainer(projectId: string, address: string): Promise<boolean> {
    try {
      const contract = new Contract(this.contractId);
      const projectParam = nativeToScVal(projectId, { type: 'string' });
      const addressParam = nativeToScVal(Address.fromString(address));
      
      const operation = contract.call('is_maintainer', projectParam, addressParam);
      const tx = await this.rpcServer.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        console.warn('Failed to check maintainer status:', tx.error);
        return false;
      }

      const result = tx.result?.retval;
      return result ? Boolean(scValToNative(result)) : false;
    } catch (error) {
      console.error('Failed to check maintainer status:', error);
      return false;
    }
  }
}

/**
 * Create a domain service instance for the specified network
 */
export const createDomainService = (network: 'mainnet' | 'testnet'): SorobanDomainContractService => {
  const config = getNetworkConfig(network);
  const contractId = config.sorobanDomainContract;
  
  if (!contractId) {
    throw new Error(`Domain contract not configured for ${network}`);
  }
  
  return new SorobanDomainContractService(contractId, network);
};

/**
 * Create a project service instance for the specified network
 */
export const createProjectService = (network: 'mainnet' | 'testnet'): TansuProjectContractService => {
  const config = getNetworkConfig(network);
  const contractId = config.tansuProjectContract;
  
  if (!contractId) {
    throw new Error(`Project contract not configured for ${network}`);
  }
  
  return new TansuProjectContractService(contractId, network);
};