import { useState, useEffect } from 'react';
import { getProjectVaultStats, isProjectMaintainer, type TansuProject } from '@/lib/tansu-contracts';
import { getAccountBalances } from '@/lib/stellar';
import { getXlmFiatRate } from '@/lib/fiat-currencies';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useNetwork } from '@/contexts/NetworkContext';

export interface ProjectVaultData {
  // Project info
  project: TansuProject | null;
  projectWalletAddress: string | null;
  
  // Vault balances
  vaultBalance: number | null;
  walletBalance: number | null;
  totalBalance: number | null;
  
  // Fiat values
  xlmFiatRate: number | null;
  totalFiatValue: number | null;
  
  // Maintainer status
  isMaintainer: boolean;
  canManageVault: boolean;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

export const useProjectVault = (
  selectedProject: TansuProject | null,
  projectWalletAddress: string | null,
  connectedWalletAddress: string | null
): ProjectVaultData => {
  const { quoteCurrency } = useFiatCurrency();
  const { network } = useNetwork();
  
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [xlmFiatRate, setXlmFiatRate] = useState<number | null>(null);
  const [isMaintainer, setIsMaintainer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBalance = vaultBalance != null && walletBalance != null ? vaultBalance + walletBalance : null;
  const totalFiatValue = totalBalance != null && xlmFiatRate != null ? totalBalance * xlmFiatRate : null;
  const canManageVault = isMaintainer && connectedWalletAddress != null;

  // Load project vault data when project changes
  useEffect(() => {
    let mounted = true;
    
    const loadProjectData = async () => {
      if (!selectedProject || !projectWalletAddress) {
        setVaultBalance(null);
        setWalletBalance(null);
        setIsMaintainer(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Load vault stats for this project
        const vaultStats = await getProjectVaultStats(projectWalletAddress);
        
        // Load project wallet balance from Horizon
        const balances = await getAccountBalances(projectWalletAddress);
        const nativeBalance = balances.find((b: any) => b.asset_type === 'native');
        
        if (mounted) {
          setVaultBalance(parseFloat(vaultStats.vaultBalance || '0'));
          setWalletBalance(nativeBalance ? parseFloat(nativeBalance.balance) : 0);
        }

        // Check if connected wallet is a maintainer
        if (connectedWalletAddress) {
          const maintainerStatus = await isProjectMaintainer(
            selectedProject.id, 
            connectedWalletAddress, 
            network
          );
          if (mounted) {
            setIsMaintainer(maintainerStatus);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load project vault data');
          console.error('Failed to load project vault data:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProjectData();
    
    return () => {
      mounted = false;
    };
  }, [selectedProject, projectWalletAddress, connectedWalletAddress, network]);

  // Load XLM fiat rate
  useEffect(() => {
    let mounted = true;
    
    const loadFiatRate = async () => {
      try {
        const rate = await getXlmFiatRate(quoteCurrency);
        if (mounted) {
          setXlmFiatRate(rate || 0);
        }
      } catch (err) {
        if (mounted) {
          setXlmFiatRate(null);
        }
      }
    };

    loadFiatRate();
    
    // Refresh rate every minute
    const interval = setInterval(loadFiatRate, 60_000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [quoteCurrency]);

  return {
    project: selectedProject,
    projectWalletAddress,
    vaultBalance,
    walletBalance, 
    totalBalance,
    xlmFiatRate,
    totalFiatValue,
    isMaintainer,
    canManageVault,
    loading,
    error,
  };
};