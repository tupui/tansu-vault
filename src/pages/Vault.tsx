import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSearch } from '@/components/ProjectSearch';
import { VaultOperations } from '@/components/VaultOperations';
import { TransactionHistoryPanel } from '@/components/history/TransactionHistoryPanel';
import { useWallet } from '@/hooks/useWallet';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useFiatConversion } from '@/hooks/useFiatConversion';
import { useProjectVault } from '@/hooks/useProjectVault';
import { TansuProject } from '@/lib/tansu-contracts';
import { fetchTansuMetadata, extractLogoUrl } from '@/lib/ipfs-utils';
import { Loader2 } from 'lucide-react';

const Vault: React.FC = () => {
  const { isConnected, address, isDomainConnected, connectedDomain } = useWallet();
  const { quoteCurrency } = useFiatCurrency();
  const { formatFiatAmount } = useFiatConversion();
  const [selectedProject, setSelectedProject] = useState<TansuProject | null>(null);
  const [projectWalletAddress, setProjectWalletAddress] = useState<string | null>(null);
  const [projectLogo, setProjectLogo] = useState<string | null>(null);
  
  const projectVaultData = useProjectVault(selectedProject, projectWalletAddress, address);

  // Check maintainer status using existing project data (no RPC call needed)
  const isMaintainer = selectedProject && address && Array.isArray(selectedProject.maintainers) 
    ? selectedProject.maintainers.includes(address) 
    : false;

  const handleProjectSelect = (project: TansuProject, walletAddress: string) => {
    setSelectedProject(project);
    setProjectWalletAddress(walletAddress);
  };

  // Fetch project logo from IPFS when project is selected
  useEffect(() => {
    const fetchLogo = async () => {
      if (!selectedProject?.ipfs_hash) {
        setProjectLogo(null);
        return;
      }

      try {
        const metadata = await fetchTansuMetadata(selectedProject.ipfs_hash);
        const logoUrl = extractLogoUrl(metadata);
        setProjectLogo(logoUrl);
      } catch (error) {
        console.warn('Failed to fetch project logo:', error);
        setProjectLogo(null);
      }
    };

    fetchLogo();
  }, [selectedProject?.ipfs_hash]);

  const fmt = (num: number | null) => num == null ? '0' : new Intl.NumberFormat().format(num);
  const fmtFiat = (amount: number | null) => {
    if (amount == null || amount === 0) return '—';
    return formatFiatAmount(amount);
  };

  const canManageVault = selectedProject && isConnected && (
    (address && projectWalletAddress && address === projectWalletAddress) ||
    (isMaintainer && isDomainConnected && connectedDomain === selectedProject.domain)
  );

  return (
    <Layout>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Treasury Management</h1>
          <p className="text-muted-foreground text-lg">
            {selectedProject ? 
              `Manage the treasury vault for ${selectedProject.name}` :
              'Search for Tansu projects and manage their treasury vaults'
            }
          </p>
        </div>

        {!selectedProject ? (
          <ProjectSearch 
            onProjectSelect={handleProjectSelect}
            selectedProject={selectedProject}
          />
        ) : (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="flex items-center gap-4 p-6 bg-accent/20 rounded-lg border border-accent/50">
              {projectLogo && (
                <img 
                  src={projectLogo} 
                  alt={`${selectedProject.name} logo`}
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{selectedProject.name}</h2>
                <p className="text-muted-foreground">{selectedProject.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="font-mono">{selectedProject.domain}</span>
                  {projectWalletAddress && (
                    <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                      {projectWalletAddress.slice(0, 8)}...{projectWalletAddress.slice(-8)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vault Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Treasury Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectVaultData.loading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground mt-2">Loading vault data...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold text-foreground">
                        {fmt(projectVaultData.totalBalance)} XLM
                      </p>
                      <p className="text-muted-foreground">
                        {fmtFiat(projectVaultData.totalFiatValue)}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Vault Balance</p>
                        <p className="text-lg font-semibold text-foreground">
                          {fmt(projectVaultData.vaultBalance)} XLM
                        </p>
                        <p className="text-sm text-muted-foreground">
                        {projectVaultData.vaultBalance != null && projectVaultData.xlmFiatRate != null ? 
                          fmtFiat(projectVaultData.vaultBalance * projectVaultData.xlmFiatRate) : '—'
                        }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Wallet Balance</p>
                        <p className="text-lg font-semibold text-foreground">
                          {fmt(projectVaultData.walletBalance)} XLM
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {projectVaultData.walletBalance != null && projectVaultData.xlmFiatRate != null ? 
                            fmtFiat(projectVaultData.walletBalance * projectVaultData.xlmFiatRate) : '—'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vault Operations - Only for maintainers */}
            {canManageVault && (
              <VaultOperations 
                userBalance={(projectVaultData.walletBalance || 0).toString()}
                vaultBalance={(projectVaultData.vaultBalance || 0).toString()}
                canManageVault={canManageVault}
                projectWalletAddress={projectWalletAddress}
              />
            )}

            {/* Access Required Message */}
            {selectedProject && isConnected && !canManageVault && !projectVaultData.loading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    {!isMaintainer ? 'Access Required' : 'Domain Connection Required'}
                  </h3>
                  <p className="text-muted-foreground">
                    {!isMaintainer 
                      ? 'You need to be a maintainer of this project to manage its vault.'
                      : address !== projectWalletAddress
                        ? `Connect your wallet via the project's Soroban domain (${selectedProject.domain}) or use the project wallet address directly.`
                        : 'Domain connection is required to manage the vault.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Connect Wallet Message */}
            {selectedProject && !isConnected && (
              <Card>
                <CardContent className="py-8 text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-muted-foreground">
                    Connect your wallet to check if you have access to manage this project's vault.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity - Transaction History */}
            <TransactionHistoryPanel 
              accountAddress={projectWalletAddress}
              className="mt-6"
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Vault;