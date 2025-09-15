import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';

interface CurrencySelectorProps {
  disabled?: boolean;
  compact?: boolean;
}

export const CurrencySelector = ({ disabled = false, compact = false }: CurrencySelectorProps) => {
  const { quoteCurrency, setQuoteCurrency, availableCurrencies, getCurrentCurrency } = useFiatCurrency();

  const currentCurrency = getCurrentCurrency();

  if (compact) {
    return (
      <Badge variant="outline" className="text-xs font-mono">
        {currentCurrency.symbol} {currentCurrency.code}
      </Badge>
    );
  }

  return (
    <Select
      value={quoteCurrency}
      onValueChange={setQuoteCurrency}
      disabled={disabled}
    >
      <SelectTrigger className="w-[120px] bg-background/50 border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{currentCurrency.symbol}</span>
          <span className="font-medium">{currentCurrency.code}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <div className="flex items-center gap-2">
              <span className="font-mono w-6">{currency.symbol}</span>
              <div>
                <div className="font-medium">{currency.code}</div>
                <div className="text-xs text-muted-foreground">{currency.name}</div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};