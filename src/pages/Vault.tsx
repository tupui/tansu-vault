import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VaultOperations } from '@/components/VaultOperations';
import { useVaultData } from '@/hooks/useVaultData';
import { useVaultTVL } from '@/hooks/useVaultTVL';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { formatFiatAmount } from '@/lib/fiat-currencies';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { createProjectService } from '@/lib/soroban-contract-services';
import type { TansuProject } from '@/lib/tansu-contracts';

export const Vault = () => {
  const { getCurrentCurrency } = useFiatCurrency();
  const currentCurrency = getCurrentCurrency();
  const { address: connectedWallet, isConnected } = useWallet();
  const { network } = useNetwork();

  // Read any previously selected project (set in Dashboard's ProjectSearch)
  const [selectedProject, setSelectedProject] = useState<TansuProject | null>(null);
  const [projectWalletAddress, setProjectWalletAddress] = useState<string | null>(null);
  const [isMaintainer, setIsMaintainer] = useState<boolean | null>(null);
  const [checkingMaintainer, setCheckingMaintainer] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem('selectedProject');
      const w = localStorage.getItem('selectedProjectWalletAddress');
      setSelectedProject(p ? JSON.parse(p) : null);
      setProjectWalletAddress(w || null);
    } catch {
      setSelectedProject(null);
      setProjectWalletAddress(null);
    }
  }, []);

  // Load maintainer status when project + wallet connected
  useEffect(() => {
    const check = async () => {
      if (!selectedProject || !isConnected || !connectedWallet) {
        setIsMaintainer(null);
        return;
      }
      setCheckingMaintainer(true);
      try {
        const service = createProjectService(network);
        const ok = await service.isMaintainer(selectedProject.id, connectedWallet);
        setIsMaintainer(!!ok);
      } catch {
        setIsMaintainer(false);
      } finally {
        setCheckingMaintainer(false);
      }
    };
    check();
  }, [selectedProject, isConnected, connectedWallet, network]);

  // Common TVL (read-only, independent of project selection)
  const tvl = useVaultTVL();

  // User and vault balances (only relevant when a project is selected)
  const { walletXlm, vaultXlm, totalFiatValue } = useVaultData();
  const totalXlm = useMemo(() => (walletXlm ?? 0) + (vaultXlm ?? 0), [walletXlm, vaultXlm]);

  const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));
  const fmtFiat = (n: number | null | undefined) => (n == null ? '—' : formatFiatAmount(n, currentCurrency));

  const canManageVault = !!(selectedProject && isConnected && isMaintainer);

  return (
    <Layout>
      <Navigation />
      <div className="pt-20 px-6">
        <div className="container mx-auto max-w-5xl space-y-6">
          <h1 className="text-3xl font-bold">Vault</h1>

          {/* Always show common vault TVL */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Common Vault TVL</CardTitle>
              <CardDescription>Total value locked across the common vault</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total XLM</p>
                  <p className="text-lg font-semibold">{fmt(tvl.totalXlm)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">XLM Price ({currentCurrency.code})</p>
                  <p className="text-lg font-semibold">{tvl.xlmFiatRate == null ? '—' : tvl.xlmFiatRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total ({currentCurrency.code})</p>
                  <p className="text-lg font-semibold">{fmtFiat(tvl.totalFiatValue)}</p>
                </div>
              </div>
              {tvl.error && (
                <div className="mt-3 text-sm text-destructive">{tvl.error}</div>
              )}
            </CardContent>
          </Card>

          {/* If no project selected, stop here (read-only) */}
          {!selectedProject && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle>Project Not Selected</CardTitle>
                <CardDescription>
                  Select a Tansu project from the Dashboard to manage its treasury. Deposits and withdrawals are disabled until a project is selected.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* When a project is selected, show balances and operations based on maintainer status */}
          {selectedProject && (
            <>
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedProject.name}
                    <Badge variant="outline" className="border-border/60">{selectedProject.domain}</Badge>
                  </CardTitle>
                  <CardDescription>Manage deposits and withdrawals for this project treasury</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet (XLM)</p>
                      <p className="text-lg font-semibold">{fmt(walletXlm)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">In Vault (XLM)</p>
                      <p className="text-lg font-semibold">{fmt(vaultXlm)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total ({currentCurrency.code})</p>
                      <p className="text-lg font-semibold">{fmtFiat(totalFiatValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maintainer gate */}
              {!isConnected && (
                <Card className="glass border-border/50">
                  <CardContent className="p-6 text-sm text-muted-foreground">Connect your wallet to check maintainer permissions.</CardContent>
                </Card>
              )}

              {isConnected && checkingMaintainer && (
                <Card className="glass border-border/50">
                  <CardContent className="p-6 text-sm text-muted-foreground">Checking maintainer status…</CardContent>
                </Card>
              )}

              {isConnected && !checkingMaintainer && !canManageVault && (
                <Card className="glass border-border/50">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground">
                      Your connected wallet is not a maintainer of {selectedProject.name}. Vault operations are disabled.
                    </p>
                  </CardContent>
                </Card>
              )}

              {canManageVault && (
                <VaultOperations
                  userBalance={(walletXlm ?? 0).toString()}
                  vaultBalance={(vaultXlm ?? 0).toString()}
                  onOperationComplete={() => { /* no-op for now */ }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};