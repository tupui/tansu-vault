import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getAccountBalances, getVaultBalance } from '@/lib/stellar';
import { getXlmFiatRate } from '@/lib/fiat-currencies';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';

export interface VaultData {
  walletXlm: number | null;
  vaultXlm: number | null;
  xlmFiatRate: number | null;
  totalFiatValue: number | null;
  loading: boolean;
  error: string | null;
}

export const useVaultData = (): VaultData => {
  const { address, isConnected } = useWallet();
  const { quoteCurrency } = useFiatCurrency();
  const [walletXlm, setWalletXlm] = useState<number | null>(null);
  const [vaultXlm, setVaultXlm] = useState<number | null>(null);
  const [xlmFiatRate, setXlmFiatRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalFiatValue = useMemo(() => {
    if (walletXlm == null || vaultXlm == null || xlmFiatRate == null) return null;
    return (walletXlm + vaultXlm) * xlmFiatRate;
  }, [walletXlm, vaultXlm, xlmFiatRate]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isConnected || !address) {
        setWalletXlm(null);
        setVaultXlm(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Wallet native balance
        const balances = await getAccountBalances(address);
        const native = balances.find((b: any) => b.asset_type === 'native');
        if (mounted) setWalletXlm(native ? parseFloat(native.balance) : 0);

        // Vault user balance (Soroban contract) - may be zero if never deposited
        const vb = await getVaultBalance(address);
        if (mounted) setVaultXlm(parseFloat(vb || '0'));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load balances');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, [isConnected, address]);

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

  return { walletXlm, vaultXlm, xlmFiatRate, totalFiatValue, loading, error };
};
