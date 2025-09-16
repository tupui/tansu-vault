import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetBalancePanel } from '@/components/AssetBalancePanel';
import { useAssetPrice, useAssetPrices } from '@/hooks/useAssetPrices';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { RefreshCw, TrendingUp, Activity, Zap } from 'lucide-react';
import { formatFiatAmount } from '@/lib/fiat-currencies';

const SAMPLE_ASSETS = [
  'XLM', 'USDC', 'BTC', 'ETH', 'EUR', 'GBP', 'JPY'
];

const SAMPLE_BALANCES = [
  { asset_type: 'native', balance: '1000.5' },
  { asset_type: 'credit_alphanum4', asset_code: 'USDC', balance: '250.75', asset_issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
  { asset_type: 'credit_alphanum4', asset_code: 'BTC', balance: '0.025' },
  { asset_type: 'credit_alphanum4', asset_code: 'ETH', balance: '1.5' },
  { asset_type: 'credit_alphanum4', asset_code: 'EUR', balance: '500.0' },
];

export const AssetPricing: React.FC = () => {
  const [testAsset, setTestAsset] = useState('XLM');
  const { getCurrentCurrency } = useFiatCurrency();
  const { network } = useNetwork();
  const currency = getCurrentCurrency();

  // Test single asset price
  const { price: testPrice, loading: testLoading, error: testError, refresh: refreshTest } = useAssetPrice(testAsset);

  // Test multiple asset prices
  const { prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices } = useAssetPrices(SAMPLE_ASSETS);

  const formatPrice = (price: number): string => {
    if (price === 0) return 'N/A';
    if (price < 0.01) return price.toExponential(3);
    return formatFiatAmount(price, currency);
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Pricing System</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive pricing via Stellar-Stratum multi-oracle architecture
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            <Activity className="w-3 h-3 mr-1" />
            {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </Badge>
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            Live Pricing
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="single">Single Asset</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oracle System</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3 Oracles</div>
                <p className="text-xs text-muted-foreground">
                  CEX/DEX, Stellar, FX
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>External/CEX</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Stellar Network</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Forex</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">50/10s</div>
                <p className="text-xs text-muted-foreground">
                  Burst limit with backoff
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Window</span>
                    <span>10 seconds</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Price Cache</span>
                    <span>5 minutes</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Asset Cache</span>
                    <span>24 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assets Supported</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Multi-format</div>
                <p className="text-xs text-muted-foreground">
                  Stellar & external assets
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Native (XLM)</span>
                    <Badge variant="outline" className="text-xs">✓</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Stellar Assets</span>
                    <Badge variant="outline" className="text-xs">✓</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>External (BTC/ETH)</span>
                    <Badge variant="outline" className="text-xs">✓</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sample Asset Prices</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPrices}
                  disabled={pricesLoading}
                  className="h-8"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${pricesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Badge variant="secondary">
                  Quote: {currency.code}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {pricesError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                  <p className="text-sm text-destructive">Error: {pricesError}</p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
                {SAMPLE_ASSETS.map((asset) => (
                  <div key={asset} className="p-3 border rounded-lg text-center">
                    <div className="font-semibold text-sm">{asset}</div>
                    <div className="text-lg font-mono mt-1">
                      {pricesLoading ? '...' : formatPrice(prices[asset] || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Single Asset Price Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test individual asset price fetching with caching and error handling
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter asset code (e.g., XLM, BTC, ETH)"
                  value={testAsset}
                  onChange={(e) => setTestAsset(e.target.value.toUpperCase())}
                  className="max-w-xs"
                />
                <Button onClick={refreshTest} disabled={testLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testLoading ? 'animate-spin' : ''}`} />
                  Get Price
                </Button>
              </div>

              {testError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">Error: {testError}</p>
                </div>
              )}

              <div className="p-6 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    {testAsset} Price in {currency.code}
                  </div>
                  <div className="text-3xl font-bold font-mono">
                    {testLoading ? 'Loading...' : formatPrice(testPrice)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <AssetBalancePanel
            balances={SAMPLE_BALANCES}
            title="Portfolio Balance Panel"
            showRefresh={true}
          />
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Oracle Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium">External/CEX Oracle</div>
                    <div className="text-xs text-muted-foreground break-all">
                      {network === 'mainnet' ? 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN' : 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Stellar Network Oracle</div>
                    <div className="text-xs text-muted-foreground break-all">
                      {network === 'mainnet' ? 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M' : 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Forex Oracle</div>
                    <div className="text-xs text-muted-foreground break-all">
                      {network === 'mainnet' ? 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC' : 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Request Deduplication</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Parallel Price Fetching</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Multi-level Caching</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Exponential Backoff</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Graceful Fallbacks</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Resolution Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Stellar Assets</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>1. Try STELLAR oracle first</div>
                    <div>2. Fallback to CEX/DEX oracle</div>
                    <div>3. For non-USD quotes: USD price → FX conversion</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">External Assets (BTC, ETH)</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>1. Try CEX/DEX oracle</div>
                    <div>2. For non-USD quotes: USD price → FX conversion</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Fiat Currencies</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>1. Use FOREX oracle for USD → target currency</div>
                    <div>2. Cache FX rates for 5 minutes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};