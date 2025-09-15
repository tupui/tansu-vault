import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { Contract, nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';
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
export async function getProjectVaultStats(projectWalletAddress: string): Promise<{
  vaultBalance: string;
  walletBalance: string;
  totalDeposited: string;
  yieldEarned: string;
}> {
  try {
    const contracts = getContractAddresses();
    const contract = new Contract(contracts.TANSU_PROJECT);
    
    // Call the project contract to get vault balance for this project
    const op = contract.call(
      'get_project_vault_balance', 
      nativeToScVal(projectId, { type: 'string' })
    );
    const rpcServer = new SorobanServer(getNetworkConfig('testnet').sorobanRpcUrl);
    const sim: any = await rpcServer.simulateTransaction(op as any);
    
    if ('error' in sim) {
      throw new Error(`Project vault balance query error: ${sim.error}`);
    }

    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (!retval) return 0;

    const result = scValToNative(retval);
    return parseFloat(result.toString()) / 10_000_000; // Convert from stroops
  } catch (error) {
    console.error('Failed to get project vault balance:', error);
    return 0;
  }
}