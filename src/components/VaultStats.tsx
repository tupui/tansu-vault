import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Leaf, Users, DollarSign } from 'lucide-react';
import { useVaultTVL } from '@/hooks/useVaultTVL';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useFiatConversion } from '@/hooks/useFiatConversion';
import { formatFiatAmount } from '@/lib/fiat-currencies';

export const VaultStats = () => {
  const { totalFiatValue, loading, error } = useVaultTVL();
  const { getCurrentCurrency } = useFiatCurrency();
  const { formatFiatAmount: formatWithHook } = useFiatConversion();
  
  const currentCurrency = getCurrentCurrency();
  
  const formatValue = (value: number | null) => {
    if (value == null) return '—';
    try {
      return formatWithHook(value);
    } catch {
      return formatFiatAmount(value, currentCurrency);
    }
  };

  const stats = [
    {
      title: 'Total Value Locked',
      value: loading ? 'Loading...' : formatValue(totalFiatValue),
      change: '',
      changeType: 'neutral' as const,
      icon: DollarSign,
      gradient: 'bg-gradient-vault'
    },
    {
      title: 'Annual Yield',
      value: '—',
      change: '',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      gradient: 'bg-gradient-stellar'
    },
    {
      title: 'Active Projects',
      value: '—',
      change: '',
      changeType: 'neutral' as const,
      icon: Users,
      gradient: 'bg-gradient-surface'
    },
    {
      title: 'Carbon Offset',
      value: '—',
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
            <p className="text-xs text-muted-foreground mt-1">
              {stat.title === 'Total Value Locked' ? 
                (error ? 'Failed to load vault data' : 'Live vault balance across all users') :
                'Data will appear once funds are deposited and metrics are available'
              }
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};