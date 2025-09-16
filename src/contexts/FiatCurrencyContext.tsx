import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAvailableFiatCurrencies, type FiatCurrency } from '@/lib/fiat-currencies';
import { useNetwork } from '@/contexts/NetworkContext';

interface FiatCurrencyContextType {
  quoteCurrency: string;
  setQuoteCurrency: (currency: string) => void;
  availableCurrencies: FiatCurrency[];
  getCurrentCurrency: () => FiatCurrency;
}

const FiatCurrencyContext = createContext<FiatCurrencyContextType | undefined>(undefined);

export const useFiatCurrency = () => {
  const context = useContext(FiatCurrencyContext);
  if (!context) {
    throw new Error('useFiatCurrency must be used within a FiatCurrencyProvider');
  }
  return context;
};

interface FiatCurrencyProviderProps {
  children: ReactNode;
}

export const FiatCurrencyProvider = ({ children }: FiatCurrencyProviderProps) => {
  const [quoteCurrency, setQuoteCurrencyState] = useState(() => {
    // Load from localStorage or default to USD
    return localStorage.getItem('fiat-currency') || 'USD';
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<FiatCurrency[]>([]);
  const { network } = useNetwork();

  const setQuoteCurrency = (currency: string) => {
    setQuoteCurrencyState(currency);
    localStorage.setItem('fiat-currency', currency);
  };

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const currencies = await getAvailableFiatCurrencies(network === 'mainnet' ? 'mainnet' : 'testnet');
        setAvailableCurrencies(currencies);
        
        // Ensure the current currency is still available
        if (quoteCurrency && !currencies.some(c => c.code === quoteCurrency)) {
          setQuoteCurrency('USD'); // Default to USD if current currency not available
        }
      } catch (error) {
        console.error('Failed to load fiat currencies:', error);
        // Set minimal fallback
        setAvailableCurrencies([{ code: 'USD', symbol: '$', name: 'US Dollar' }]);
        setQuoteCurrency('USD');
      }
    };

    loadCurrencies();
  }, [network, quoteCurrency]);

  const getCurrentCurrency = (): FiatCurrency => {
    return availableCurrencies.find(c => c.code === quoteCurrency) || 
           availableCurrencies[0] || 
           { code: 'USD', symbol: '$', name: 'US Dollar' };
  };

  return (
    <FiatCurrencyContext.Provider
      value={{
        quoteCurrency,
        setQuoteCurrency,
        availableCurrencies,
        getCurrentCurrency
      }}
    >
      {children}
    </FiatCurrencyContext.Provider>
  );
};