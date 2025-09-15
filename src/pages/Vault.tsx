import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultOperations } from '@/components/VaultOperations';
import { useVaultData } from '@/hooks/useVaultData';

export const Vault = () => {
  const { walletXlm, vaultXlm, xlmUsd } = useVaultData();
  const totalXlm = (walletXlm ?? 0) + (vaultXlm ?? 0);
  const totalUsd = xlmUsd != null ? totalXlm * xlmUsd : null;
  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

  return (
    <Layout>
      <Navigation />
      <div className="pt-20 px-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          <h1 className="text-3xl font-bold">Vault Management</h1>
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Manage deposits and withdrawals for your project treasury</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Wallet (XLM)</p>
                  <p className="text-lg font-semibold">{fmt(walletXlm)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Vault (XLM)</p>
                  <p className="text-lg font-semibold">{fmt(vaultXlm)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total (USD)</p>
                  <p className="text-lg font-semibold">{totalUsd == null ? '—' : fmtUSD(totalUsd)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <VaultOperations 
            userBalance={(walletXlm ?? 0).toString()} 
            vaultBalance={(vaultXlm ?? 0).toString()} 
            onOperationComplete={() => {}}
          />
        </div>
      </div>
    </Layout>
  );
};