import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { Contract, Address, scValToNative, nativeToScVal, xdr, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
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
      // Build a transaction and simulate using base64 XDR as required by RPC
      const source = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const transaction = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const sim: any = await this.rpcServer.simulateTransaction(transaction);

      if ('error' in sim) {
        console.warn('Domain resolution failed:', sim.error);
        return null;
      }

      const result = sim.result?.retval;
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
   * NOTE: Contract does not expose a full-text search. We attempt direct lookup via get_project.
   */
  async searchProjects(query: string): Promise<any[]> {
    const q = (query || '').trim();
    if (!q) return [];

    try {
      // Reuse getProject under the hood
      const result = await this.getProject(q);
      if (result) return [result];
      return [];
    } catch (error) {
      console.warn('Search fallback (get_project) failed:', error);
      return [];
    }
  }

  /**
   * Get a specific project by ID or domain
   */
  async getProject(identifier: string): Promise<any | null> {
    try {
      const { computeTansuProjectKey } = await import('./hash');
      const projectKey = computeTansuProjectKey(identifier);

      const contract = new Contract(this.contractId);
      const keyParam = nativeToScVal(Buffer.from(projectKey), { type: 'bytes' });
      
      const operation = contract.call('get_project', keyParam);
      const source = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const transaction = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      const sim: any = await this.rpcServer.simulateTransaction(transaction);
      
      if ('error' in sim) {
        console.warn('Failed to get project:', sim.error);
        return null;
      }

      const result = sim.result?.retval;
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
      const source = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const transaction = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      const sim: any = await this.rpcServer.simulateTransaction(transaction);
      
      if ('error' in sim) {
        console.warn('Failed to get admins config:', sim.error);
        return [];
      }

      const result = sim.result?.retval;
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
      // Get the project object using get_project
      const project = await this.getProject(projectId);
      
      if (!project || !project.maintainers) {
        return false;
      }

      // Check if the address is in the maintainers vector
      const maintainers = Array.isArray(project.maintainers) ? project.maintainers : [];
      return maintainers.includes(address);
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