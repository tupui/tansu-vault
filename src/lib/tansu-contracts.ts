// Tansu contract integration for project search and domain resolution
import { useNetwork } from '@/contexts/NetworkContext';

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

// Tansu contract addresses (these would need to be the actual deployed addresses)
const TANSU_CONTRACTS = {
  TESTNET: {
    PROJECTS: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Add real Tansu projects contract
    DOMAINS: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Add real Soroban domains contract
  },
  MAINNET: {
    PROJECTS: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Add real Tansu projects contract  
    DOMAINS: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // TODO: Add real Soroban domains contract
  }
} as const;

// RPC server configuration
const RPC_URLS = {
  TESTNET: 'https://soroban-testnet.stellar.org',
  MAINNET: 'https://soroban-mainnet.stellar.org',
} as const;

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
    return projects.map((project: any) => ({
      id: project.id || '',
      name: project.name || '',
      description: project.description || '',
      domain: project.domain || '',
      wallet_address: project.wallet_address,
      maintainers: project.maintainers || [],
      created_at: project.created_at || Date.now(),
      status: (project.status || 'active') as 'active' | 'inactive',
    }));
  } catch (error) {
    console.error('Failed to search Tansu projects:', error);
    
    // Fallback to mock data
    const mockProjects: TansuProject[] = [
      {
        id: '1',
        name: 'stellar-sdk',
        description: 'Official Stellar SDK for JavaScript',
        domain: 'stellar-sdk.tansu.dev',
        maintainers: ['GCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
        created_at: Date.now() - 86400000,
        status: 'active' as const
      },
      {
        id: '2', 
        name: 'soroban-tools',
        description: 'Tools for Soroban smart contract development',
        domain: 'soroban-tools.tansu.dev',
        maintainers: ['GDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
        created_at: Date.now() - 172800000,
        status: 'active' as const
      },
      {
        id: '3',
        name: 'stellar-vault',
        description: 'Decentralized vault protocol for Stellar',
        domain: 'stellar-vault.tansu.dev',
        maintainers: ['GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
        created_at: Date.now() - 259200000,
        status: 'active' as const
      }
    ].filter(project => 
      project.name.toLowerCase().includes(query.toLowerCase()) ||
      project.domain.toLowerCase().includes(query.toLowerCase()) ||
      project.description.toLowerCase().includes(query.toLowerCase())
    );

    return mockProjects;
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
    // Fallback to search
    const projects = await searchTansuProjects('', network);
    return projects.find(p => p.id === identifier || p.domain === identifier) || null;
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
    
    // Fallback to mock implementation
    const mockDomainToAddress: Record<string, string> = {
      'stellar-sdk.tansu.dev': 'GCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'soroban-tools.tansu.dev': 'GDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 
      'stellar-vault.tansu.dev': 'GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    return mockDomainToAddress[domain] || null;
  }
}

export async function isProjectMaintainer(projectId: string, walletAddress: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
  try {
    const { createProjectService } = await import('./soroban-contract-services');
    const projectService = createProjectService(network);
    
    return await projectService.isMaintainer(projectId, walletAddress);
  } catch (error) {
    console.error('Failed to check maintainer status:', error);
    // Fallback to project data check
    const project = await getTansuProject(projectId, network);
    return project?.maintainers.includes(walletAddress) || false;
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
    // TODO: Get actual vault balance for this specific project's wallet
    // This should call our vault contract methods with the project's wallet address
    
    return {
      vaultBalance: '0',
      walletBalance: '0', 
      totalDeposited: '0',
      yieldEarned: '0'
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