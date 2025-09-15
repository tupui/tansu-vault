import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { VaultStats } from '@/components/VaultStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Clock, CheckCircle, Shield, Users } from 'lucide-react';
import { VaultOperations } from '@/components/VaultOperations';
import { ProjectSearch } from '@/components/ProjectSearch';
import { useProjectVault } from '@/hooks/useProjectVault';
import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';
import { TansuProject } from '@/lib/tansu-contracts';
import { formatFiatAmount } from '@/lib/fiat-currencies';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
export const Dashboard = () => {
  const {
    address: connectedWallet,
    isConnected
  } = useWallet();
  const {
    getCurrentCurrency
  } = useFiatCurrency();
  const [selectedProject, setSelectedProject] = useState<TansuProject | null>(null);
  const [projectWalletAddress, setProjectWalletAddress] = useState<string | null>(null);
  const {
    project,
    vaultBalance,
    walletBalance,
    totalBalance,
    totalFiatValue,
    isMaintainer,
    canManageVault,
    loading,
    error
  } = useProjectVault(selectedProject, projectWalletAddress, connectedWallet);
  const currentCurrency = getCurrentCurrency();
  const fmt = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
  const fmtFiat = (n: number | null) => n == null ? '—' : formatFiatAmount(n, currentCurrency);
  const handleProjectSelect = (project: TansuProject, walletAddress: string) => {
    setSelectedProject(project);
    setProjectWalletAddress(walletAddress);
  };
  const recentTransactions: any[] = [];
  return <Layout>
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Vault Dashboard</h1>
            <p className="text-muted-foreground">
              Search for Tansu projects and manage their treasury vaults
            </p>
          </div>

          {/* Stats Grid - Always visible (shows TVL for all users) */}
          <VaultStats />

          {/* Project Search */}
          <div className="mt-8">
            <ProjectSearch onProjectSelect={handleProjectSelect} selectedProject={selectedProject} />
          </div>

          {/* Project Vault Management - Only when project selected */}
          {selectedProject && projectWalletAddress && <div className="mt-8 space-y-6">
              {/* Maintainer Status & Connection */}
              <Card className="glass border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Maintainer Status</h3>
                        <p className="text-sm text-muted-foreground">
                          {isConnected && connectedWallet ? isMaintainer ? `You are a maintainer of ${selectedProject.name}` : `You are not a maintainer of ${selectedProject.name}` : 'Connect your wallet to check maintainer status'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isConnected && isMaintainer && <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Authorized
                        </Badge>}
                      {isConnected && !isMaintainer && <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          Unauthorized
                        </Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Vault Balance */}
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 glass border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedProject.name} Treasury
                      <Badge variant="outline" className="bg-gradient-vault text-primary-foreground border-0">
                        Project Vault
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Treasury balance and vault overview for {selectedProject.domain}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Treasury Value</p>
                          <p className="text-3xl font-bold">
                            {fmtFiat(totalFiatValue)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {loading ? 'Loading balances…' : 'Live XLM price via Reflector'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                        <div>
                          <p className="text-sm text-muted-foreground">In Vault (XLM)</p>
                          <p className="text-lg font-semibold text-vault-yield">{fmt(vaultBalance)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Wallet (XLM)</p>
                          <p className="text-lg font-semibold">{fmt(walletBalance)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total (XLM)</p>
                          <p className="text-lg font-semibold">{fmt(totalBalance)}</p>
                        </div>
                      </div>

                      {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                          {error}
                        </div>}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest vault transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentTransactions.length === 0 ? <div className="text-sm text-muted-foreground p-4 rounded-lg bg-surface-elevated/50 border border-border/30">
                        No activity yet. Deposit funds to see transactions here.
                      </div> : <div className="space-y-4">
                        {recentTransactions.map(tx => <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated/50 border border-border/30">
                            <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-deposit-blue/20' : tx.type === 'withdraw' ? 'bg-withdraw-orange/20' : 'bg-vault-yield/20'}`}>
                              {tx.type === 'deposit' ? <ArrowUpRight className="h-4 w-4 text-deposit-blue" /> : <CheckCircle className="h-4 w-4 text-vault-yield" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium capitalize">{tx.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{tx.amount}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tx.timestamp}
                              </p>
                            </div>
                          </div>)}
                      </div>}
                  </CardContent>
                </Card>
              </div>

              {/* Vault Operations - Only show if user is a maintainer */}
              {canManageVault && <VaultOperations userBalance={(walletBalance ?? 0).toString()} vaultBalance={(vaultBalance ?? 0).toString()} onOperationComplete={() => {
            // Refresh project vault data
            window.location.reload(); // Simple refresh for now
          }} />}

              {/* Not authorized message */}
              {selectedProject && isConnected && !canManageVault && <Card className="glass border-border/50">
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Maintainer Access Required</h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      Only authorized maintainers can manage vault operations for this project. 
                      Your connected wallet ({connectedWallet ? `${connectedWallet.slice(0, 8)}...` : ''}) 
                      is not listed as a maintainer for {selectedProject.name}.
                    </p>
                  </CardContent>
                </Card>}
            </div>}

          {/* Empty state - no project selected */}
          {!selectedProject && <div className="mt-8">
              <Card className="glass border-border/50">
                
              </Card>
            </div>}
        </div>
      </div>
    </Layout>;
};