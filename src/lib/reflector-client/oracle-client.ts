import { Contract, xdr, nativeToScVal, scValToNative, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { REFLECTOR_ORACLE_CONTRACTS, getNetworkConfig } from '../appConfig';

interface CachedRate {
  rate: number;
  timestamp: number;
}

export class ReflectorOracleClient {
  private server: SorobanServer;
  private contracts: { external_cex: string; pubnet: string; forex: string };
  private cache = new Map<string, CachedRate>();
  private readonly CACHE_DURATION = 60_000; // 1 minute
  private readonly RATE_LIMIT_DURATION = 2_000; // 2 seconds
  private lastRequestTime = 0;
  private networkPassphrase: string;

  constructor(network: 'mainnet' | 'testnet') {
    const rpcUrl = network === 'mainnet'
      ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
      : 'https://soroban-testnet.stellar.org:443';

    this.server = new SorobanServer(rpcUrl);
    this.contracts = REFLECTOR_ORACLE_CONTRACTS[network];
    this.networkPassphrase = getNetworkConfig(network).networkPassphrase;
  }

  private getCacheKey(base: string, quote: string) {
    return `${base}_${quote}`;
  }

  private getFromCache(base: string, quote: string): number | null {
    const key = this.getCacheKey(base, quote);
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    return cached.rate;
  }

  private setCache(base: string, quote: string, rate: number) {
    const key = this.getCacheKey(base, quote);
    this.cache.set(key, { rate, timestamp: Date.now() });
  }

  private getContractAddress(source: 'external_cex' | 'pubnet' | 'forex') {
    return this.contracts[source];
  }

  private async rateLimit() {
    const now = Date.now();
    const delta = now - this.lastRequestTime;
    if (delta < this.RATE_LIMIT_DURATION) {
      await new Promise((r) => setTimeout(r, this.RATE_LIMIT_DURATION - delta));
    }
    this.lastRequestTime = Date.now();
  }

  private parseOracleResult(result: xdr.ScVal): number {
    const native = scValToNative(result);
    const asNumber = typeof native === 'number' ? native : typeof native === 'string' ? parseFloat(native) : NaN;
    if (!isFinite(asNumber)) {
      throw new Error('Invalid oracle result');
    }
    return asNumber;
  }

  private async lastPrice(base: string, quote: string, source: 'external_cex' | 'pubnet' | 'forex'): Promise<number> {
    await this.rateLimit();

    const contract = new Contract(this.getContractAddress(source));
    const op = contract.call(
      'lastprice',
      nativeToScVal(base, { type: 'string' }),
      nativeToScVal(quote, { type: 'string' })
    );

    const sourceAcct = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const tx = new TransactionBuilder(sourceAcct, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const sim: any = await this.server.simulateTransaction(tx);
    if ('error' in sim) {
      throw new Error(`Oracle simulation error: ${sim.error}`);
    }

    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (!retval) throw new Error('Empty oracle response');

    return this.parseOracleResult(retval);
  }

  // FX via FOREX oracle: USD -> currency
  async getFxRate(currency: string): Promise<number> {
    const cached = this.getFromCache('USD', currency);
    if (cached !== null) return cached;
    const rate = await this.lastPrice('USD', currency, 'forex');
    this.setCache('USD', currency, rate);
    return rate;
  }

  async getAssetPrice(assetCode: string, currency: string = 'USD'): Promise<number> {
    const cached = this.getFromCache(assetCode, currency);
    if (cached !== null) return cached;

    if (currency === 'USD') {
      // Try EXTERNAL/CEX first, then fall back to PUBNET
      try {
        const price = await this.lastPrice(assetCode, 'USD', 'external_cex');
        this.setCache(assetCode, 'USD', price);
        return price;
      } catch (_e) {
        const price = await this.lastPrice(assetCode, 'USD', 'pubnet');
        this.setCache(assetCode, 'USD', price);
        return price;
      }
    }

    // Non-USD currency: get USD price, then apply FX
    const usdPrice = await this.getAssetPrice(assetCode, 'USD');
    const fx = await this.getFxRate(currency);
    const result = usdPrice * fx;
    this.setCache(assetCode, currency, result);
    return result;
  }

  // Discovery of available fiat currencies from FOREX oracle (with fallback)
  async listSupportedCurrencies(): Promise<string[]> {
    try {
      const contract = new Contract(this.getContractAddress('forex'));
      const op = contract.call('supported_currencies');

      const sourceAcct = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const tx = new TransactionBuilder(sourceAcct, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const sim: any = await this.server.simulateTransaction(tx);
      if ('error' in sim) {
        console.warn(`Oracle listSupportedCurrencies error: ${sim.error}`);
        return this.getFallbackCurrencies();
      }
      
      const retval = sim.result?.retval as xdr.ScVal | undefined;
      if (!retval) return this.getFallbackCurrencies();
      
      const native = scValToNative(retval);
      const currencies = Array.isArray(native) ? native.map((c) => String(c)) : [];
      
      // Return fallback if oracle returns empty list
      return currencies.length > 0 ? currencies : this.getFallbackCurrencies();
    } catch (error) {
      console.warn('Failed to fetch supported currencies from oracle:', error);
      return this.getFallbackCurrencies();
    }
  }

  private getFallbackCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  }
}

// Export singleton instances
const mainnetClient = new ReflectorOracleClient('mainnet');
const testnetClient = new ReflectorOracleClient('testnet');

export const getOracleClient = (network: 'mainnet' | 'testnet'): ReflectorOracleClient =>
  network === 'mainnet' ? mainnetClient : testnetClient;
