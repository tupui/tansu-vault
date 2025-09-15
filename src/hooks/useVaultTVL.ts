import { useState, useEffect } from 'react';
import { getVaultTotalBalance } from '@/lib/stellar';
import { getXlmFiatRate } from '@/lib/fiat-currencies';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';

export interface VaultTVLData {
  totalXlm: number | null;
  totalFiatValue: number | null;
  xlmFiatRate: number | null;
  loading: boolean;
  error: string | null;
}

export const useVaultTVL = (): VaultTVLData => {
  const { quoteCurrency } = useFiatCurrency();
  const [totalXlm, setTotalXlm] = useState<number | null>(null);
  const [xlmFiatRate, setXlmFiatRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalFiatValue = totalXlm != null && xlmFiatRate != null ? totalXlm * xlmFiatRate : null;

  useEffect(() => {
    let mounted = true;
    const loadTVL = async () => {
      setLoading(true);
      setError(null);
      try {
        const vaultBalance = await getVaultTotalBalance();
        if (mounted) setTotalXlm(parseFloat(vaultBalance || '0'));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load TVL');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTVL();
    // Refresh TVL every 30 seconds
    const interval = setInterval(loadTVL, 30_000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPrice = async () => {
      try {
        const rate = await getXlmFiatRate(quoteCurrency);
        if (mounted) setXlmFiatRate(rate || 0);
      } catch {
        if (mounted) setXlmFiatRate(null);
      }
    };
    loadPrice();
    const id = setInterval(loadPrice, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, [quoteCurrency]);

  return { totalXlm, totalFiatValue, xlmFiatRate, loading, error };
};