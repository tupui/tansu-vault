import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { VaultStats } from '@/components/VaultStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react';
import { VaultOperations } from '@/components/VaultOperations';

export const Dashboard = () => {
  const recentTransactions = [
    {
      id: '1',
      type: 'deposit',
      amount: '1,250 USDC',
      project: 'SALib',
      timestamp: '2 minutes ago',
      status: 'completed'
    },
    {
      id: '2',
      type: 'withdraw',
      amount: '500 XLM',
      project: 'Tansu Core',
      timestamp: '1 hour ago',
      status: 'completed'
    },
    {
      id: '3',
      type: 'yield',
      amount: '12.5 USDC',
      project: 'Auto-generated',
      timestamp: '3 hours ago',
      status: 'completed'
    }
  ];

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
                    SALib DAO
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Your project's treasury balance and yield overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-3xl font-bold">$15,247.83</p>
                      <p className="text-sm text-success flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3" />
                        +$127.45 (+0.84%) this week
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground">In Vault</p>
                      <p className="text-lg font-semibold text-vault-yield">$14,123.45</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-lg font-semibold">$1,124.38</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Yield Earned</p>
                      <p className="text-lg font-semibold text-success">$347.83</p>
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
                <div className="space-y-4">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated/50 border border-border/30">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'deposit' ? 'bg-deposit-blue/20' :
                        tx.type === 'withdraw' ? 'bg-withdraw-orange/20' :
                        'bg-vault-yield/20'
                      }`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownLeft className="h-4 w-4 text-deposit-blue" />
                        ) : tx.type === 'withdraw' ? (
                          <ArrowUpRight className="h-4 w-4 text-withdraw-orange" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-vault-yield" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.project}</p>
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
              </CardContent>
            </Card>
          </div>

          {/* Vault Operations */}
          <div className="mt-8">
            <VaultOperations 
              userBalance="1124.38"
              vaultBalance="14123.45"
              onOperationComplete={() => {
                // Refresh data after operations
                console.log('Operation completed, refreshing data...');
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};