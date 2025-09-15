import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Euro, PoundSterling } from 'lucide-react';

export type Currency = 'USD' | 'EUR' | 'GBP';

interface CurrencySelectorProps {
  currentCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  compact?: boolean;
}

export const CurrencySelector = ({ currentCurrency, onCurrencyChange, compact = false }: CurrencySelectorProps) => {
  const currencies = [
    {
      value: 'USD' as Currency,
      label: 'US Dollar',
      symbol: '$',
      icon: DollarSign,
    },
    {
      value: 'EUR' as Currency,
      label: 'Euro',
      symbol: '€',
      icon: Euro,
    },
    {
      value: 'GBP' as Currency,
      label: 'British Pound',
      symbol: '£',
      icon: PoundSterling,
    },
  ];

  const currentCurrencyData = currencies.find(c => c.value === currentCurrency);
  const CurrentIcon = currentCurrencyData?.icon || DollarSign;

  if (compact) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <CurrentIcon className="h-3 w-3" />
        {currentCurrency}
      </Badge>
    );
  }

  return (
    <Select value={currentCurrency} onValueChange={onCurrencyChange}>
      <SelectTrigger className="w-36">
        <SelectValue>
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            {currentCurrency}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => {
          const Icon = currency.icon;
          return (
            <SelectItem key={currency.value} value={currency.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div>
                  <div className="font-medium">{currency.value}</div>
                  <div className="text-xs text-muted-foreground">{currency.label}</div>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};