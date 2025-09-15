import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getAccountBalances, getVaultBalance, fetchAssetPrice } from '@/lib/stellar';

export interface VaultData {
  walletXlm: number | null;
  vaultXlm: number | null;
  xlmUsd: number | null;
  loading: boolean;
  error: string | null;
}

export const useVaultData = (): VaultData => {
  const { address, isConnected } = useWallet();
  const [walletXlm, setWalletXlm] = useState<number | null>(null);
  const [vaultXlm, setVaultXlm] = useState<number | null>(null);
  const [xlmUsd, setXlmUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const price = await fetchAssetPrice('XLM', 'USD');
        if (mounted) setXlmUsd(price || 0);
      } catch {
        if (mounted) setXlmUsd(null);
      }
    };
    loadPrice();
    const id = setInterval(loadPrice, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return { walletXlm, vaultXlm, xlmUsd, loading, error };
};
