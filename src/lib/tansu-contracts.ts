import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { Contract, nativeToScVal, scValToNative, xdr, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { getNetworkConfig, getContractAddresses } from './appConfig';


export interface TansuProject {
  id: string;
  name: string;
  description: string;
  domain: string;
  wallet_address?: string;
  maintainers: string[];
  created_at: number;
  status: 'active' | 'inactive';
}



/**
 * Updated implementations using the new contract services
 */
export async function searchTansuProjects(query: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<TansuProject[]> {
  try {
    // Use the new service-based approach from soroban-contract-services.ts
    const { createProjectService } = await import('./soroban-contract-services');
    const projectService = createProjectService(network);
    
    const projects = await projectService.searchProjects(query);
    
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
    console.error('Failed to search Tansu projects:', error);
    throw (error instanceof Error) ? error : new Error('Search failed');
  }
}

export async function getTansuProject(identifier: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<TansuProject | null> {
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

export async function resolveSorobanDomain(domain: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<string | null> {
  try {
    const { createDomainService } = await import('./soroban-contract-services');
    const domainService = createDomainService(network);
    
    const address = await domainService.resolve(domain);
    return address;
  } catch (error) {
    console.error('Failed to resolve Soroban domain:', error);
    return null;
  }
}

export async function isProjectMaintainer(projectId: string, walletAddress: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
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
export async function getProjectVaultStats(projectId: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<{
  vaultBalance: string;
  walletBalance: string;
  totalDeposited: string;
  yieldEarned: string;
}> {
  try {
    const contracts = getContractAddresses(network);
    const config = getNetworkConfig(network);
    const rpcServer = new SorobanServer(config.sorobanRpcUrl);
    const contract = new Contract(contracts.TANSU_PROJECT);
    
    // Call the project contract to get vault balance for this project
    const op = contract.call(
      'get_project_vault_balance', 
      nativeToScVal(projectId, { type: 'string' })
    );
    
    // Build a proper transaction for simulation
    const sourceAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: config.networkPassphrase,
    })
    .addOperation(op)
    .setTimeout(30)
    .build();
    
    const sim: any = await rpcServer.simulateTransaction(transaction);
    
    if ('error' in sim) {
      console.warn(`Project vault balance query error: ${sim.error}`);
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
      walletBalance: '0', // Would need separate call
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