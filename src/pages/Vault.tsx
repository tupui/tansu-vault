import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectSearch } from '@/components/ProjectSearch';
import { VaultOperations } from '@/components/VaultOperations';
import { useWallet } from '@/hooks/useWallet';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useProjectVault } from '@/hooks/useProjectVault';
import { TansuProject } from '@/lib/tansu-contracts';

const Vault: React.FC = () => {
  const { isConnected, address } = useWallet();
  const { quoteCurrency } = useFiatCurrency();
  const [selectedProject, setSelectedProject] = useState<TansuProject | null>(null);
  const [projectWalletAddress, setProjectWalletAddress] = useState<string | null>(null);
  
  const projectVaultData = useProjectVault(selectedProject, projectWalletAddress, address);

  const handleProjectSelect = (project: TansuProject, walletAddress: string) => {
    setSelectedProject(project);
    setProjectWalletAddress(walletAddress);
  };

  const fmt = (num: number | null) => num == null ? '0' : new Intl.NumberFormat().format(num);
  const fmtFiat = (amount: number | null) => amount == null ? '-' : new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: quoteCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const canManageVault = selectedProject && isConnected && projectVaultData.isMaintainer;

  return (
    <Layout>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Project Vault Management</h1>
          <p className="text-muted-foreground text-lg">
            Search for Tansu projects and manage their treasury vaults
          </p>
        </div>

        <ProjectSearch 
          onProjectSelect={handleProjectSelect}
          selectedProject={selectedProject}
        />

        {selectedProject ? (
          <div className="space-y-6">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedProject.name}</span>
                  {projectVaultData.loading ? (
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  ) : projectVaultData.isMaintainer ? (
                    <span className="text-sm text-green-600 font-medium">✓ Maintainer Access</span>
                  ) : isConnected ? (
                    <span className="text-sm text-red-600 font-medium">✗ No Access</span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-foreground">{selectedProject.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Domain</p>
                    <p className="text-foreground font-mono">{selectedProject.domain}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vault Balance */}
            <Card>
              <CardHeader>
                <CardTitle>Vault Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {projectVaultData.loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
                          {fmtFiat(projectVaultData.vaultBalance && projectVaultData.xlmFiatRate ? projectVaultData.vaultBalance * projectVaultData.xlmFiatRate : null)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Wallet Balance</p>
                        <p className="text-lg font-semibold text-foreground">
                          {fmt(projectVaultData.walletBalance)} XLM
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fmtFiat(projectVaultData.walletBalance && projectVaultData.xlmFiatRate ? projectVaultData.walletBalance * projectVaultData.xlmFiatRate : null)}
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
              />
            )}

            {/* Access Required Message */}
            {selectedProject && isConnected && !projectVaultData.isMaintainer && !projectVaultData.loading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Access Required
                  </h3>
                  <p className="text-muted-foreground">
                    You need to be a maintainer of this project to manage its vault.
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

            {/* Recent Activity Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Activity tracking coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No Project Selected
              </h3>
              <p className="text-muted-foreground">
                Search for and select a Tansu project to view and manage its vault.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Vault;