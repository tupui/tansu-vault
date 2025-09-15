import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Leaf, Users, DollarSign } from 'lucide-react';

export const VaultStats = () => {
  const stats = [
    {
      title: 'Total Value Locked',
      value: '—',
      change: '',
      changeType: 'neutral',
      icon: DollarSign,
      gradient: 'bg-gradient-vault'
    },
    {
      title: 'Annual Yield',
      value: '—',
      change: '',
      changeType: 'neutral',
      icon: TrendingUp,
      gradient: 'bg-gradient-stellar'
    },
    {
      title: 'Active Projects',
      value: '—',
      change: '',
      changeType: 'neutral',
      icon: Users,
      gradient: 'bg-gradient-surface'
    },
    {
      title: 'Carbon Offset',
      value: '—',
      change: '',
      changeType: 'neutral',
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
              Data will appear once funds are deposited and metrics are available
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};