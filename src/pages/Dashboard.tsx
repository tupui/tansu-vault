import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { VaultStats } from '@/components/VaultStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { VaultOperations } from '@/components/VaultOperations';
import { useVaultData } from '@/hooks/useVaultData';

export const Dashboard = () => {
  const { walletXlm, vaultXlm, xlmUsd, loading } = useVaultData();

  const totalXlm = (walletXlm ?? 0) + (vaultXlm ?? 0);
  const totalUsd = xlmUsd != null ? totalXlm * xlmUsd : null;

  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

  const recentTransactions: any[] = [];

  return (
    <Layout>
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Vault Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your project treasury and track yield generation across the Tansu ecosystem
            </p>
          </div>

          {/* Stats Grid */}
          <VaultStats />

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Project Balance */}
            <Card className="lg:col-span-2 glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Project Balance
                  <Badge variant="outline" className="bg-gradient-vault text-primary-foreground border-0">
                    Tansu Project
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Your project's treasury balance and vault overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-3xl font-bold">
                        {totalUsd == null ? '—' : fmtUSD(totalUsd)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {loading ? 'Loading balances…' : 'Live XLM price via Reflector'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground">In Vault (XLM)</p>
                      <p className="text-lg font-semibold text-vault-yield">{fmt(vaultXlm)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet (XLM)</p>
                      <p className="text-lg font-semibold">{fmt(walletXlm)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total (XLM)</p>
                      <p className="text-lg font-semibold">{fmt(totalXlm)}</p>
                    </div>
                  </div>
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
                {recentTransactions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 rounded-lg bg-surface-elevated/50 border border-border/30">
                    No activity yet. Deposit funds to the vault to see transactions here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated/50 border border-border/30">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'deposit' ? 'bg-deposit-blue/20' :
                          tx.type === 'withdraw' ? 'bg-withdraw-orange/20' :
                          'bg-vault-yield/20'
                        }`}>
                          {tx.type === 'deposit' ? (
                            <ArrowUpRight className="h-4 w-4 text-deposit-blue" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-vault-yield" />
                          )}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Vault Operations */}
          <div className="mt-8">
            <VaultOperations 
              userBalance={(walletXlm ?? 0).toString()}
              vaultBalance={(vaultXlm ?? 0).toString()}
              onOperationComplete={() => {
                // In a fuller implementation we would refetch via the hook
                // The hook auto-refreshes on wallet actions when page reloads
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};