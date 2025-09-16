/**
 * Transaction History Panel with filtering, search, and fiat conversion
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Search, 
  Calendar as CalendarIcon,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useAccountHistory } from '@/hooks/useAccountHistory';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useFiatConversion } from '@/hooks/useFiatConversion';
import { formatAddress } from '@/lib/validation';
import { cn } from '@/lib/utils';

interface TransactionHistoryPanelProps {
  accountAddress: string | null;
  className?: string;
}

const TransactionTypeIcon = ({ type, direction }: { type: string; direction: 'in' | 'out' }) => {
  if (direction === 'in') {
    return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
  } else {
    return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  }
};

const CategoryBadge = ({ category }: { category: string }) => {
  const variants = {
    transfer: 'default',
    swap: 'secondary',
    contract: 'outline',
    config: 'destructive',
    other: 'outline'
  } as const;

  return (
    <Badge variant={variants[category as keyof typeof variants] || 'outline'} className="text-xs">
      {category}
    </Badge>
  );
};

export const TransactionHistoryPanel: React.FC<TransactionHistoryPanelProps> = ({
  accountAddress,
  className
}) => {
  const { getCurrentCurrency } = useFiatCurrency();
  const { formatFiatAmount } = useFiatConversion();
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    transactions,
    filteredTransactions,
    fiatAmounts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    filters,
    setFilters,
    fiatLoading,
    stats
  } = useAccountHistory(accountAddress);

  const currentCurrency = getCurrentCurrency();

  // Pagination state
  const [displayCount, setDisplayCount] = useState(50);
  const displayedTransactions = useMemo(() => 
    filteredTransactions.slice(0, displayCount),
    [filteredTransactions, displayCount]
  );

  const handleLoadMore = () => {
    if (displayedTransactions.length < filteredTransactions.length) {
      setDisplayCount(prev => prev + 50);
    } else if (hasMore) {
      loadMore();
    }
  };

  const formatTransactionAmount = (tx: any) => {
    if (!tx.amount) return '—';
    
    const amount = tx.amount.toFixed(7).replace(/\.?0+$/, '');
    const asset = tx.assetType === 'native' ? 'XLM' : (tx.assetCode || 'Unknown');
    
    return `${amount} ${asset}`;
  };

  const formatFiatValue = (txId: string) => {
    const fiatAmount = fiatAmounts.get(txId);
    if (!fiatAmount || fiatAmount === 0) return null;
    
    return formatFiatAmount(fiatAmount);
  };

  if (!accountAddress) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-12 text-center">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Connect an account to view transaction history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Transaction History
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>


        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-4 pt-4">
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Direction</label>
                <Select value={filters.direction} onValueChange={(value: any) => setFilters({ direction: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-lg z-50">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in">Incoming</SelectItem>
                    <SelectItem value="out">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={filters.category} onValueChange={(value: any) => setFilters({ category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-lg z-50">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="swap">Swap</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="config">Config</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Min Amount</label>
                <Input
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ minAmount: e.target.value })}
                  type="number"
                  step="0.0000001"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Max Amount</label>
                <Input
                  placeholder="∞"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ maxAmount: e.target.value })}
                  type="number"
                  step="0.0000001"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Address Filter</label>
                <Input
                  placeholder="Address..."
                  value={filters.addressFilter}
                  onChange={(e) => setFilters({ addressFilter: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {filters.dateFrom ? format(filters.dateFrom, 'MMM dd') : 'From Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => setFilters({ dateFrom: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {filters.dateTo ? format(filters.dateTo, 'MMM dd') : 'To Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => setFilters({ dateTo: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  direction: 'all',
                  category: 'all',
                  minAmount: '',
                  maxAmount: '',
                  dateFrom: undefined,
                  dateTo: undefined,
                  addressFilter: '',
                  assetCode: ''
                })}
              >
                Clear Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="text-center py-8">
            <div className="text-destructive mb-2">Error loading transactions</div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <Button onClick={refresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {!error && displayedTransactions.length === 0 && !loading && (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-muted-foreground">No transactions found</div>
            {Object.values(filters).some(v => v !== 'all' && v !== '' && v !== undefined) && (
              <div className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters
              </div>
            )}
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-2">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <TransactionTypeIcon type={tx.type} direction={tx.direction} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium capitalize">{tx.type.replace('_', ' ')}</span>
                    <CategoryBadge category={tx.category} />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {tx.counterparty ? (
                      <span className="font-mono">
                        {tx.direction === 'in' ? 'From' : 'To'} {formatAddress(tx.counterparty)}
                      </span>
                    ) : (
                      <span>Internal operation</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {format(tx.createdAt, 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium">
                  {formatTransactionAmount(tx)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {fiatLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin inline" />
                  ) : (
                    formatFiatValue(tx.id) || '—'
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {(displayedTransactions.length < filteredTransactions.length || hasMore) && !loading && (
          <div className="text-center pt-6">
            <Button onClick={handleLoadMore} variant="outline" className="w-full">
              Load More Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};