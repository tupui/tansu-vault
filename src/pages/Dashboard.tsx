import React from 'react';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultStats } from '@/components/VaultStats';
import { useVaultTVL } from '@/hooks/useVaultTVL';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
const Dashboard: React.FC = () => {
  const {
    quoteCurrency
  } = useFiatCurrency();
  const {
    totalXlm,
    loading: tvlLoading
  } = useVaultTVL();
  const fmtFiat = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: quoteCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return <Layout>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Treasury Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Overview of the Tansu treasury vault system
          </p>
        </div>

        {/* Overall Vault Statistics */}
        <VaultStats />

        {/* Total Value Locked */}
        <Card>
          <CardHeader>
            <CardTitle>Total Value Locked (TVL)</CardTitle>
          </CardHeader>
          <CardContent>
            {tvlLoading ? <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading TVL data...</p>
              </div> : <div className="text-center py-6">
                <p className="text-3xl font-bold text-foreground mb-2">
                  {new Intl.NumberFormat().format(totalXlm || 0)} XLM
                </p>
                <p className="text-muted-foreground text-lg">
                  {fmtFiat((totalXlm || 0) * 0.12)} {/* Placeholder XLM price */}
                </p>
              </div>}
          </CardContent>
        </Card>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-2xl font-bold text-foreground">-</p>
                <p className="text-sm text-muted-foreground">Projects using vaults</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-2xl font-bold text-foreground">-</p>
                <p className="text-sm text-muted-foreground">All-time deposits</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yield Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-2xl font-bold text-foreground">-</p>
                <p className="text-sm text-muted-foreground">Total yield earned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        
      </div>
    </Layout>;
};
export default Dashboard;