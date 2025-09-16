import { 
  Contract, 
  TransactionBuilder, 
  Account, 
  nativeToScVal, 
  scValToNative,
  xdr
} from '@stellar/stellar-sdk';
import { Server as SorobanServer, Api as SorobanRpc } from '@stellar/stellar-sdk/rpc';
import { getNetworkConfig } from './appConfig';

/**
 * DeFindex Vault Service - Direct Smart Contract Integration
 * 
 * This service provides direct interaction with DeFindex vault contracts
 * without relying on their API, implementing a fully client-side solution.
 * 
 * Based on DeFindex documentation: https://docs.defindex.io
 * Contract interface: https://stellar.expert/explorer/testnet/contract/CCGKL6U2DHSNFJ3NU4UPRUKYE2EUGYR4ZFZDYA7KDJLP3TKSPHD5C4UP
 */

export interface VaultInfo {
  name: string;
  symbol: string;
  totalShares: string;
  totalManagedFunds: string;
  feeReceiver: string;
  manager: string;
  emergencyManager: string;
  assets: string[];
  strategies: string[];
  apy?: number;
}

export interface VaultBalance {
  shares: string;
  underlyingBalance: string;
  valueInXLM: string;
}

export interface VaultStats {
  totalValueLocked: string;
  totalShares: string;
  sharePrice: string;
  apy: number;
  totalUsers: number;
  totalDeposits: string;
  totalWithdrawals: string;
  netFlow: string;
  feeCollected: string;
}

export interface DepositResult {
  amountsDeposited: string[];
  sharesReceived: string;
  transactionHash: string;
}

export interface WithdrawResult {
  amountsWithdrawn: string[];
  sharesBurned: string;
  transactionHash: string;
}

export class DeFindexVaultService {
  private contract: Contract;
  private rpcServer: SorobanServer;
  private networkPassphrase: string;
  private vaultContractId: string;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    const config = getNetworkConfig(network);
    this.vaultContractId = config.vaultContract || 'CB4CEQW6W2HNVN3RA5T327T66N4DGIC24FONEZFKGUZVZDINK4WC5MXI';
    this.contract = new Contract(this.vaultContractId);
    this.rpcServer = new SorobanServer(config.sorobanRpcUrl);
    this.networkPassphrase = config.networkPassphrase;
  }

  /**
   * Convert amount to i128 format for Soroban contracts
   */
  private amountToI128(amount: string, decimals: number = 7): string {
    const num = parseFloat(amount);
    const scaled = BigInt(Math.round(num * Math.pow(10, decimals)));
    return scaled.toString();
  }

  /**
   * Convert i128 from contract to readable amount
   */
  private i128ToAmount(i128Value: string, decimals: number = 7): string {
    const bigIntValue = BigInt(i128Value);
    const divisor = BigInt(Math.pow(10, decimals));
    const result = Number(bigIntValue) / Number(divisor);
    return result.toString();
  }

  /**
   * Create a simulation transaction for contract calls
   */
  private async createSimulationTransaction(
    functionName: string,
    args: xdr.ScVal[] = []
  ): Promise<any> {
    const sourceAccount = new Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );

    const operation = this.contract.call(functionName, ...args);
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulation = await this.rpcServer.simulateTransaction(transaction);
    
    if (SorobanRpc.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    return simulation;
  }

  /**
   * Get vault information and metadata
   */
  async getVaultInfo(): Promise<VaultInfo> {
    try {
      // Get basic vault info
      const [nameResult, symbolResult, totalSharesResult, totalManagedResult] = await Promise.allSettled([
        this.createSimulationTransaction('name'),
        this.createSimulationTransaction('symbol'),
        this.createSimulationTransaction('total_supply'),
        this.createSimulationTransaction('total_managed_funds')
      ]);

      // Get manager and fee receiver info
      const [managerResult, feeReceiverResult, emergencyManagerResult] = await Promise.allSettled([
        this.createSimulationTransaction('get_manager'),
        this.createSimulationTransaction('get_fee_receiver'),
        this.createSimulationTransaction('get_emergency_manager')
      ]);

      // Get assets and strategies
      const [assetsResult, strategiesResult] = await Promise.allSettled([
        this.createSimulationTransaction('get_assets'),
        this.createSimulationTransaction('get_strategies')
      ]);

      const extractValue = (result: any) => {
        if (result.status === 'fulfilled' && result.value?.result?.retval) {
          return scValToNative(result.value.result.retval);
        }
        return null;
      };

      return {
        name: extractValue(nameResult) || 'DeFindex Vault',
        symbol: extractValue(symbolResult) || 'DEFX',
        totalShares: this.i128ToAmount(extractValue(totalSharesResult) || '0'),
        totalManagedFunds: this.i128ToAmount(extractValue(totalManagedResult) || '0'),
        feeReceiver: extractValue(feeReceiverResult) || '',
        manager: extractValue(managerResult) || '',
        emergencyManager: extractValue(emergencyManagerResult) || '',
        assets: extractValue(assetsResult) || [],
        strategies: extractValue(strategiesResult) || []
      };
    } catch (error) {
      throw new Error(`Failed to get vault info: ${error}`);
    }
  }

  /**
   * Get user's vault balance and shares
   */
  async getUserBalance(userAddress: string): Promise<VaultBalance> {
    try {
      const userAddressScVal = nativeToScVal(userAddress, { type: 'address' });
      
      const [sharesResult, balanceResult] = await Promise.allSettled([
        this.createSimulationTransaction('balance', [userAddressScVal]),
        this.createSimulationTransaction('underlying_balance', [userAddressScVal])
      ]);

      const extractValue = (result: any) => {
        if (result.status === 'fulfilled' && result.value?.result?.retval) {
          return scValToNative(result.value.result.retval);
        }
        return '0';
      };

      const shares = extractValue(sharesResult);
      const underlyingBalance = extractValue(balanceResult);

      // If underlying_balance returns an array, take the first element (XLM)
      const xlmBalance = Array.isArray(underlyingBalance) ? underlyingBalance[0] : underlyingBalance;

      return {
        shares: this.i128ToAmount(shares || '0'),
        underlyingBalance: this.i128ToAmount(xlmBalance || '0'),
        valueInXLM: this.i128ToAmount(xlmBalance || '0')
      };
    } catch (error) {
      throw new Error(`Failed to get user balance: ${error}`);
    }
  }

  /**
   * Get total supply of vault shares
   */
  async getTotalSupply(): Promise<string> {
    try {
      const result = await this.createSimulationTransaction('total_supply', []);
      
      const extractValue = (result: any) => {
        if (result?.result?.retval) {
          return scValToNative(result.result.retval);
        }
        return '0';
      };

      const totalSupply = extractValue(result);
      return this.i128ToAmount(totalSupply || '0');
    } catch (error) {
      throw new Error(`Failed to get total supply: ${error}`);
    }
  }

  /**
   * Calculate how many shares to burn for a given XLM amount
   */
  async calculateSharesToBurn(xlmAmount: string): Promise<string> {
    try {
      const totalSupply = await this.getTotalSupply();
      const totalManagedFunds = await this.getVaultTotalBalance();
      
      if (parseFloat(totalSupply) === 0 || parseFloat(totalManagedFunds) === 0) {
        throw new Error('Vault has no shares or funds');
      }
      
      const sharePrice = parseFloat(totalManagedFunds) / parseFloat(totalSupply);
      const sharesToBurn = parseFloat(xlmAmount) / sharePrice;
      
      return sharesToBurn.toString();
    } catch (error) {
      throw new Error(`Failed to calculate shares to burn: ${error}`);
    }
  }

  /**
   * Get comprehensive vault statistics
   */
  async getVaultStats(): Promise<VaultStats> {
    try {
      const vaultInfo = await this.getVaultInfo();
      
      // Get additional stats
      const [sharePriceResult] = await Promise.allSettled([
        this.createSimulationTransaction('get_share_price')
      ]);

      const extractValue = (result: any) => {
        if (result.status === 'fulfilled' && result.value?.result?.retval) {
          return scValToNative(result.value.result.retval);
        }
        return '0';
      };

      const sharePrice = extractValue(sharePriceResult);

      // Calculate derived stats
      const totalValueLocked = vaultInfo.totalManagedFunds;
      const totalShares = vaultInfo.totalShares;
      const sharePriceFormatted = this.i128ToAmount(sharePrice || '0');

      return {
        totalValueLocked,
        totalShares,
        sharePrice: sharePriceFormatted,
        apy: 0, // TODO: Calculate APY based on historical data
        totalUsers: 0, // TODO: Implement user count tracking
        totalDeposits: totalValueLocked, // Approximation
        totalWithdrawals: '0', // TODO: Implement withdrawal tracking
        netFlow: totalValueLocked,
        feeCollected: '0' // TODO: Implement fee tracking
      };
    } catch (error) {
      throw new Error(`Failed to get vault stats: ${error}`);
    }
  }

  /**
   * Get the current share price of the vault
   */
  async getSharePrice(): Promise<string> {
    try {
      const simulation = await this.createSimulationTransaction('get_share_price');
      const result = scValToNative(simulation.result.retval);
      return this.i128ToAmount(result || '0');
    } catch (error) {
      return '1.0'; // Default share price
    }
  }

  /**
   * Get vault assets (supported tokens)
   */
  async getVaultAssets(): Promise<string[]> {
    try {
      const simulation = await this.createSimulationTransaction('get_assets');
      const result = scValToNative(simulation.result.retval);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return ['XLM']; // Default to XLM
    }
  }

  /**
   * Get vault strategies
   */
  async getVaultStrategies(): Promise<string[]> {
    try {
      const simulation = await this.createSimulationTransaction('get_strategies');
      const result = scValToNative(simulation.result.retval);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get fee receiver address (for CO2 offset tracking)
   */
  async getFeeReceiver(): Promise<string> {
    try {
      const simulation = await this.createSimulationTransaction('get_fee_receiver');
      const result = scValToNative(simulation.result.retval);
      return result || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get vault manager address
   */
  async getManager(): Promise<string> {
    try {
      const simulation = await this.createSimulationTransaction('get_manager');
      const result = scValToNative(simulation.result.retval);
      return result || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get emergency manager address
   */
  async getEmergencyManager(): Promise<string> {
    try {
      const simulation = await this.createSimulationTransaction('get_emergency_manager');
      const result = scValToNative(simulation.result.retval);
      return result || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Check if an address is a manager
   */
  async isManager(address: string): Promise<boolean> {
    try {
      const addressScVal = nativeToScVal(address, { type: 'address' });
      const simulation = await this.createSimulationTransaction('is_manager', [addressScVal]);
      const result = scValToNative(simulation.result.retval);
      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get vault performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    currentValue: string;
    totalReturn: string;
    annualizedReturn: string;
    volatility: string;
  }> {
    try {
      // For now, return basic metrics based on available data
      const vaultInfo = await this.getVaultInfo();
      const sharePrice = await this.getSharePrice();

      return {
        currentValue: vaultInfo.totalManagedFunds,
        totalReturn: '0', // TODO: Calculate based on historical data
        annualizedReturn: '0', // TODO: Calculate APY
        volatility: '0' // TODO: Calculate volatility
      };
    } catch (error) {
      return {
        currentValue: '0',
        totalReturn: '0',
        annualizedReturn: '0',
        volatility: '0'
      };
    }
  }

  /**
   * Get fee collection data for CO2 offset tracking
   */
  async getFeeCollectionData(): Promise<{
    feeReceiver: string;
    totalFeesCollected: string;
    feesAvailableForCO2: string;
    lastFeeCollection: Date | null;
  }> {
    try {
      const feeReceiver = await this.getFeeReceiver();
      
      // TODO: Implement fee tracking by querying the fee receiver's balance
      // This will be used for CO2 offset purchases
      
      return {
        feeReceiver,
        totalFeesCollected: '0', // TODO: Query fee receiver balance history
        feesAvailableForCO2: '0', // TODO: Calculate available fees
        lastFeeCollection: null // TODO: Track last collection timestamp
      };
    } catch (error) {
      return {
        feeReceiver: '',
        totalFeesCollected: '0',
        feesAvailableForCO2: '0',
        lastFeeCollection: null
      };
    }
  }

  /**
   * Get vault health status
   */
  async getVaultHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    totalValueLocked: string;
    utilizationRate: string;
    riskLevel: 'low' | 'medium' | 'high';
    lastRebalance: Date | null;
  }> {
    try {
      const vaultInfo = await this.getVaultInfo();
      const stats = await this.getVaultStats();

      // Simple health calculation based on TVL and share price
      const tvl = parseFloat(vaultInfo.totalManagedFunds);
      const sharePrice = parseFloat(stats.sharePrice);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (tvl < 1000) {
        status = 'warning';
        riskLevel = 'medium';
      }
      if (sharePrice < 0.95) {
        status = 'critical';
        riskLevel = 'high';
      }

      return {
        status,
        totalValueLocked: vaultInfo.totalManagedFunds,
        utilizationRate: '0', // TODO: Calculate utilization rate
        riskLevel,
        lastRebalance: null // TODO: Track rebalance events
      };
    } catch (error) {
      return {
        status: 'warning',
        totalValueLocked: '0',
        utilizationRate: '0',
        riskLevel: 'medium',
        lastRebalance: null
      };
    }
  }

  /**
   * Get detailed analytics for dashboard
   */
  async getVaultAnalytics(): Promise<{
    overview: VaultInfo;
    stats: VaultStats;
    health: Awaited<ReturnType<typeof this.getVaultHealth>>;
    performance: Awaited<ReturnType<typeof this.getPerformanceMetrics>>;
    feeData: Awaited<ReturnType<typeof this.getFeeCollectionData>>;
  }> {
    try {
      const [overview, stats, health, performance, feeData] = await Promise.allSettled([
        this.getVaultInfo(),
        this.getVaultStats(),
        this.getVaultHealth(),
        this.getPerformanceMetrics(),
        this.getFeeCollectionData()
      ]);

      const extractResult = (result: any, fallback: any) => {
        return result.status === 'fulfilled' ? result.value : fallback;
      };

      return {
        overview: extractResult(overview, {
          name: 'DeFindex Vault',
          symbol: 'DEFX',
          totalShares: '0',
          totalManagedFunds: '0',
          feeReceiver: '',
          manager: '',
          emergencyManager: '',
          assets: ['XLM'],
          strategies: []
        }),
        stats: extractResult(stats, {
          totalValueLocked: '0',
          totalShares: '0',
          sharePrice: '1.0',
          apy: 0,
          totalUsers: 0,
          totalDeposits: '0',
          totalWithdrawals: '0',
          netFlow: '0',
          feeCollected: '0'
        }),
        health: extractResult(health, {
          status: 'warning' as const,
          totalValueLocked: '0',
          utilizationRate: '0',
          riskLevel: 'medium' as const,
          lastRebalance: null
        }),
        performance: extractResult(performance, {
          currentValue: '0',
          totalReturn: '0',
          annualizedReturn: '0',
          volatility: '0'
        }),
        feeData: extractResult(feeData, {
          feeReceiver: '',
          totalFeesCollected: '0',
          feesAvailableForCO2: '0',
          lastFeeCollection: null
        })
      };
    } catch (error) {
      throw new Error(`Failed to get vault analytics: ${error}`);
    }
  }

  /**
   * Simple deposit function for testing
   */
  async deposit(userAddress: string, amount: string): Promise<string> {
    try {
      const amountI128 = this.amountToI128(amount);
      
      // Convert amount to ScVal format
      const amountScVal = nativeToScVal(amountI128, { type: 'i128' });
      
      // Create a simple deposit call
      // DeFindex deposit function signature:
      // fn deposit(amounts_desired: vec<i128>, amounts_min: vec<i128>, from: address, invest: bool)
      // The vec<i128> should contain one element for each asset in the vault
      const operation = this.contract.call('deposit', 
        nativeToScVal([amountScVal], { type: 'vec' }), // amounts_desired - one amount for the XLM asset
        nativeToScVal([amountScVal], { type: 'vec' }), // amounts_min (same as desired for no slippage)
        nativeToScVal(userAddress, { type: 'address' }), // from
        nativeToScVal(true, { type: 'bool' }) // invest
      );

      // Build transaction exactly like Tansu does for XLM payments
      // Fetch the account details from Horizon (exact Tansu pattern)
      const horizonUrl = 'https://horizon-testnet.stellar.org';
      const accountResp = await fetch(
        `${horizonUrl}/accounts/${userAddress}`,
        { headers: { Accept: "application/json" } },
      );
      if (!accountResp.ok) {
        throw new Error(`Failed to load account: ${accountResp.status}`);
      }
      const accountJson = await accountResp.json();
      const account = new Account(userAddress, accountJson.sequence);

      const transaction = new TransactionBuilder(account, {
        fee: '100000', // Higher fee for Soroban
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Sign the transaction using wallet kit (exact Tansu pattern)
      const { getWalletKit } = await import('./stellar');
      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());

      // Submit using exact Tansu pattern
      const { sendSignedTransaction } = await import('./tansu-tx-service');
      const result = await sendSignedTransaction(signedTxXdr);
      return result.hash || result;
    } catch (error) {
      console.error('Deposit error details:', error);
      throw new Error(`Deposit failed: ${error}`);
    }
  }

  /**
   * Prepare deposit transaction (returns unsigned XDR)
   */
  async prepareDeposit(
    userAddress: string,
    amount: string,
    autoInvest: boolean = true
  ): Promise<string> {
    try {
      const amountI128 = this.amountToI128(amount);
      
      // DeFindex deposit function signature:
      // fn deposit(e: Env, amounts_desired: Vec<i128>, amounts_min: Vec<i128>, from: Address, invest: bool)
      const amountsDesired = [nativeToScVal(amountI128, { type: 'i128' })];
      const amountsMin = [nativeToScVal(amountI128, { type: 'i128' })]; // Same as desired for slippage protection
      const fromAddress = nativeToScVal(userAddress, { type: 'address' });
      const invest = nativeToScVal(autoInvest, { type: 'bool' });

      const sourceAccount = new Account(userAddress, '0'); // Will be updated during prepare
      const operation = this.contract.call('deposit', 
        nativeToScVal(amountsDesired, { type: 'vec' }),
        nativeToScVal(amountsMin, { type: 'vec' }),
        fromAddress,
        invest
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate to ensure it works
      const simulation = await this.rpcServer.simulateTransaction(transaction);
      if (SorobanRpc.isSimulationError(simulation)) {
        throw new Error(`Deposit simulation failed: ${simulation.error}`);
      }

      // Return the raw transaction XDR for signing (Stratum pattern)
      return transaction.toXDR();
    } catch (error) {
      throw new Error(`Failed to prepare deposit: ${error}`);
    }
  }

  /**
   * Simple withdraw function for testing
   * Note: DeFindex withdraw function takes withdraw_shares (number of vault shares to burn) as first parameter
   * This is different from withdrawing a specific amount of assets
   */
  async withdraw(userAddress: string, sharesToBurn: string, slippagePercent: number = 5): Promise<string> {
    try {
      const sharesI128 = this.amountToI128(sharesToBurn);
      
      // Convert shares to ScVal format
      const sharesScVal = nativeToScVal(sharesI128, { type: 'i128' });
      
      // For min_amounts_out, we need to calculate the minimum amounts we expect to receive
      // This is a simplified approach - in practice, you'd want to calculate this based on current vault ratios
      const minAmountScVal = nativeToScVal('0', { type: 'i128' }); // Set to 0 for now, but should be calculated properly
      
      // Use dummy account for simulation (prepareTransaction will update with correct sequence)
      const sourceAccount = new Account(userAddress, '0');
      
      // Create a simple withdraw call
      // DeFindex withdraw function signature:
      // fn withdraw(withdraw_shares: i128, min_amounts_out: vec<i128>, from: address)
      const operation = this.contract.call('withdraw',
        sharesScVal, // withdraw_shares
        nativeToScVal([minAmountScVal], { type: 'vec' }), // min_amounts_out
        nativeToScVal(userAddress, { type: 'address' }) // from
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate first
      const simulation = await this.rpcServer.simulateTransaction(transaction);
      if (SorobanRpc.isSimulationError(simulation)) {
        throw new Error(`Withdraw simulation failed: ${JSON.stringify(simulation.error)}`);
      }

      // Prepare the transaction with simulation results (required for Soroban)
      const preparedTransaction = await this.rpcServer.prepareTransaction(transaction);
      
      // Sign the prepared transaction using the wallet (Tansu pattern)
      const { signTransaction } = await import('./stellar');
      const signedXdr = await signTransaction(preparedTransaction);
      
      // Submit the signed transaction to the network
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      const result = await this.rpcServer.sendTransaction(signedTransaction);
      
      if (result.status === 'ERROR') {
        throw new Error(`Transaction failed: ${result.errorResult}`);
      }
      
      return result.hash;
    } catch (error) {
      throw new Error(`Withdraw failed: ${error}`);
    }
  }

  /**
   * Prepare withdrawal transaction (returns unsigned XDR)
   */
  async prepareWithdraw(
    userAddress: string,
    amount: string,
    slippagePercent: number = 5
  ): Promise<string> {
    try {
      const amountI128 = this.amountToI128(amount);
      
      // DeFindex withdraw function signature:
      // fn withdraw(e: Env, amounts: Vec<i128>, to: Address, max_slippage: i128)
      const amounts = [nativeToScVal(amountI128, { type: 'i128' })];
      const toAddress = nativeToScVal(userAddress, { type: 'address' });
      const maxSlippage = nativeToScVal((slippagePercent * 100).toString(), { type: 'i128' }); // Convert % to basis points

      const sourceAccount = new Account(userAddress, '0'); // Will be updated during prepare
      const operation = this.contract.call('withdraw',
        nativeToScVal(amounts, { type: 'vec' }),
        toAddress,
        maxSlippage
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate to ensure it works
      const simulation = await this.rpcServer.simulateTransaction(transaction);
      if (SorobanRpc.isSimulationError(simulation)) {
        throw new Error(`Withdraw simulation failed: ${simulation.error}`);
      }

      // Assemble the transaction with simulation results
      const assembledTransaction = SorobanRpc.assembleTransaction(transaction, simulation);
      return assembledTransaction.toXDR();
    } catch (error) {
      throw new Error(`Failed to prepare withdrawal: ${error}`);
    }
  }

  /**
   * Submit a signed transaction to the network
   */
  async submitTransaction(signedXdr: string): Promise<string> {
    // Use the exact Tansu pattern from TxService.ts
    let sendResponse: any;
    try {
      // Try sending as XDR string first
      sendResponse = await this.rpcServer.sendTransaction(signedXdr);
    } catch (_error) {
      // Fallback: convert to Transaction object
      const transaction = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
      sendResponse = await this.rpcServer.sendTransaction(transaction);
    }

    if (sendResponse.status === "ERROR") {
      const errorResultStr = JSON.stringify(sendResponse.errorResult);
      throw new Error(`Transaction failed: ${errorResultStr}`);
    }

    if (sendResponse.status === "SUCCESS") {
      return sendResponse.hash;
    }

    // If status is PENDING, wait for completion
    const hash = sendResponse.hash;
    for (let i = 0; i < 30; i++) {
      const txResult = await this.rpcServer.getTransaction(hash);
      if (txResult.status === 'SUCCESS') {
        return hash;
      }
      if (txResult.status === 'FAILED') {
        throw new Error('Transaction failed on chain');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    
    throw new Error('Transaction timed out');
  }

  /**
   * Get historical performance data (placeholder for future implementation)
   */
  async getHistoricalPerformance(days: number = 30): Promise<{
    date: string;
    sharePrice: string;
    totalValueLocked: string;
    apy: number;
  }[]> {
    // TODO: Implement historical data fetching
    // This would require tracking events or external data sources
    return [];
  }

  /**
   * Calculate estimated APY based on recent performance
   */
  async calculateEstimatedAPY(): Promise<number> {
    try {
      // TODO: Implement APY calculation based on:
      // 1. Historical share price changes
      // 2. Strategy performance
      // 3. Fee structure
      
      // For now, return a placeholder
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

// Create singleton instance
let defindexService: DeFindexVaultService | null = null;

export const getDeFindexService = (network: 'mainnet' | 'testnet' = 'testnet'): DeFindexVaultService => {
  if (!defindexService) {
    defindexService = new DeFindexVaultService(network);
  }
  return defindexService;
};

// Export individual functions for backward compatibility
export const getVaultInfo = (network?: 'mainnet' | 'testnet') => 
  getDeFindexService(network).getVaultInfo();

export const getUserVaultBalance = (userAddress: string, network?: 'mainnet' | 'testnet') => 
  getDeFindexService(network).getUserBalance(userAddress);

export const getVaultStats = (network?: 'mainnet' | 'testnet') => 
  getDeFindexService(network).getVaultStats();

export const getVaultAnalytics = (network?: 'mainnet' | 'testnet') => 
  getDeFindexService(network).getVaultAnalytics();

export const getFeeReceiverForCO2 = (network?: 'mainnet' | 'testnet') => 
  getDeFindexService(network).getFeeReceiver();
