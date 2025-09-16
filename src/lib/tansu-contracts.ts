import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { Contract, nativeToScVal, scValToNative, xdr, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { getNetworkConfig, getContractAddresses, DEFAULT_NETWORK } from './appConfig';


export interface TansuProject {
  id: string;
  name: string;
  description: string;
  domain: string;
  wallet_address?: string;
  maintainers: string[];
  created_at: number;
  status: 'active' | 'inactive';
  ipfs_hash?: string;
  metadata_url?: string;
  logo?: string;
}



/**
 * Updated implementations using the new contract services
 */
export async function searchTansuProjects(query: string, network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<TansuProject[]> {
  try {
    const { createProjectService } = await import('./soroban-contract-services');
    const projectService = createProjectService(network);
    
    let projects: any[] = [];

    // 1) Try direct lookup first (ID or domain)
    try {
      const maybe = await projectService.getProject(query);
      if (maybe) {
        projects = [maybe];
      }
    } catch {
      // ignore
    }

    // 2) If nothing found, skip calling non-existent search function and return []
    if (projects.length === 0) {
      return [];
    }
    
    // Convert to our interface format
    const mappedProjects = projects.map((project: any) => ({
      id: project.id || '',
      name: project.name || '',
      description: project.description || '',
      domain: project.domain || '',
      wallet_address: project.wallet_address,
      maintainers: project.maintainers || [],
      created_at: project.created_at || Date.now(),
      status: (project.status || 'active') as 'active' | 'inactive',
    }));
    
    return mappedProjects;
  } catch (error) {
    console.warn('Search unavailable or failed:', error);
    return [];
  }
}

export async function getTansuProject(identifier: string, network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<TansuProject | null> {
  try {
    const { createProjectService } = await import('./soroban-contract-services');
    const projectService = createProjectService(network);
    
    const project = await projectService.getProject(identifier);
    
    if (!project) return null;
    
    return {
      id: project.id || '',
      name: project.name || '',
      description: project.description || '',
      domain: project.domain || '',
      wallet_address: project.wallet_address,
      maintainers: project.maintainers || [],
      created_at: project.created_at || Date.now(),
      status: (project.status || 'active') as 'active' | 'inactive',
    };
  } catch (error) {
    console.error('Failed to get Tansu project:', error);
    return null;
  }
}

export async function resolveSorobanDomain(domain: string, network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<string | null> {
  try {
    const { resolveSorobanDomain: resolveDomainUtil } = await import('./soroban-domains');
    return await resolveDomainUtil(domain, network);
  } catch (error) {
    console.error('Failed to resolve Soroban domain:', error);
    return null;
  }
}

export async function isProjectMaintainer(projectId: string, walletAddress: string, network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<boolean> {
  try {
    const { createProjectService } = await import('./soroban-contract-services');
    const projectService = createProjectService(network);
    
    return await projectService.isMaintainer(projectId, walletAddress);
  } catch (error) {
    console.error('Failed to check maintainer status:', error);
    return false;
  }
}

/**
 * Get project vault balance and statistics
 */
export async function getProjectVaultStats(projectId: string, network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<{
  vaultBalance: string;
  walletBalance: string;
  totalDeposited: string;
  yieldEarned: string;
}> {
  try {
    const contracts = getContractAddresses(network);
    const config = getNetworkConfig(network);
    const rpcServer = new SorobanServer(config.sorobanRpcUrl);
    const contract = new Contract(contracts.VAULT);
    
    // Get total vault supply
    const totalSupplyOp = contract.call('total_supply');
    
    // Build a proper transaction for simulation
    const sourceAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
    .addOperation(totalSupplyOp)
    .setTimeout(30)
    .build();
    
    const sim: any = await rpcServer.simulateTransaction(transaction);
    
    if ('error' in sim) {
      console.warn(`Vault total supply query error: ${sim.error}`);
      return {
        vaultBalance: '0',
        walletBalance: '0',
        totalDeposited: '0',
        yieldEarned: '0'
      };
    }

    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (!retval) {
      return {
        vaultBalance: '0',
        walletBalance: '0',
        totalDeposited: '0',
        yieldEarned: '0'
      };
    }

    const result = scValToNative(retval);
    const balance = parseFloat(result.toString()) / 10_000_000; // Convert from stroops
    
    return {
      vaultBalance: balance.toString(),
      walletBalance: '0', // Would need separate call with domain address
      totalDeposited: balance.toString(), // Simplified
      yieldEarned: '0' // Would need yield calculation
    };
  } catch (error) {
    console.error('Failed to get project vault stats:', error);
    return {
      vaultBalance: '0',
      walletBalance: '0',
      totalDeposited: '0',
      yieldEarned: '0'
    };
  }
}