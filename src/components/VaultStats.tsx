import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Leaf, Users, DollarSign } from 'lucide-react';
import { useVaultTVL } from '@/hooks/useVaultTVL';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useFiatConversion } from '@/hooks/useFiatConversion';
import { formatFiatAmount } from '@/lib/fiat-currencies';

export const VaultStats = () => {
  const { totalXlm, totalFiatValue, xlmFiatRate, loading, error } = useVaultTVL();
  const { getCurrentCurrency } = useFiatCurrency();
  const { formatFiatAmount: formatWithHook } = useFiatConversion();
  const [annualYield, setAnnualYield] = useState<number | null>(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  
  const currentCurrency = getCurrentCurrency();
  
  // Format fiat value like the treasury does
  const formatFiatValue = (value: number | null) => {
    if (value == null) return '—';
    try {
      return formatWithHook(value);
    } catch {
      return formatFiatAmount(value, currentCurrency);
    }
  };
  
  // Load annual yield from DeFindex contract
  useEffect(() => {
    const loadYield = async () => {
      setYieldLoading(true);
      try {
        // Use DeFindex contract bindings to get performance reports
        const { Client: DeFindexClient } = await import('@/contracts/src/index');
        const { getNetworkConfig } = await import('@/lib/appConfig');
        
        const config = getNetworkConfig('testnet');
        const contractId = config.vaultContract || 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC';
        
        const client = new DeFindexClient({
          contractId,
          networkPassphrase: config.networkPassphrase,
          rpcUrl: config.sorobanRpcUrl,
        });

        // Get performance reports
        const assembledTx = await client.report();
        const simulation = await assembledTx.simulate();
        
        if ('result' in simulation && simulation.result) {
          const resultWrapper = assembledTx.result;
          
          if (resultWrapper && resultWrapper.isOk && resultWrapper.isOk()) {
            const reports = resultWrapper.unwrap();
            
            if (Array.isArray(reports) && reports.length > 0) {
              // Calculate simple yield based on gains/losses
              const totalGains = reports.reduce((sum, report) => sum + Number(report.gains_or_losses), 0);
              const totalPrevBalance = reports.reduce((sum, report) => sum + Number(report.prev_balance), 0);
              
              if (totalPrevBalance > 0) {
                const yieldPercent = (totalGains / totalPrevBalance) * 100;
                setAnnualYield(yieldPercent);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load yield data:', error);
        setAnnualYield(null);
      } finally {
        setYieldLoading(false);
      }
    };

    loadYield();
  }, []);

  const stats = [
    {
      title: 'Total Value Locked',
      value: loading ? 'Loading...' : formatFiatValue(totalFiatValue),
      subtitle: totalXlm ? `${totalXlm.toFixed(2)} XLM` : '0 XLM',
      change: '',
      changeType: 'neutral' as const,
      icon: DollarSign,
      gradient: 'bg-gradient-vault'
    },
    {
      title: 'Annual Yield',
      value: yieldLoading ? 'Loading...' : annualYield !== null ? `${annualYield.toFixed(2)}%` : '—',
      subtitle: undefined,
      change: '',
      changeType: annualYield && annualYield > 0 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      gradient: 'bg-gradient-stellar'
    },
    {
      title: 'Active Projects',
      value: '—',
      subtitle: undefined,
      change: '',
      changeType: 'neutral' as const,
      icon: Users,
      gradient: 'bg-gradient-surface'
    },
    {
      title: 'Carbon Offset',
      value: '—',
      subtitle: undefined,
      change: '',
      changeType: 'neutral' as const,
      icon: Leaf,
      gradient: 'bg-gradient-carbon'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="glass border-border/50 hover:shadow-elevation transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.gradient}`}>
              <stat.icon className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            {stat.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stat.title === 'Total Value Locked' ? 
                (error ? 'Failed to load vault data' : 'Total managed by DeFindex vault') :
              stat.title === 'Annual Yield' ?
                (annualYield !== null ? 'Based on vault performance reports' : 'No performance data yet') :
                'Data will appear once funds are deposited and metrics are available'
              }
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};