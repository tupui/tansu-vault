/**
 * Vault transactions using EXACT Tansu contract call pattern
 * Uses generated DeFindex contract bindings like Tansu uses its contract bindings
 */

import { Client as DeFindexClient } from '../contracts/src/index';
import { getNetworkConfig } from './appConfig';

/**
 * Get configured DeFindex contract client (EXACT copy of Tansu's getClient)
 */
async function getClient() {
  // Use the stellar.ts wallet kit like the rest of the tansu-vault app
  const { getWalletKit } = await import('./stellar');
  const kit = getWalletKit();
  
  // Get the user's public key from the wallet kit
  const { address } = await kit.getAddress();
  
  if (!address) {
    throw new Error("Please connect your wallet first");
  }

  const config = getNetworkConfig('testnet');
  const contractId = config.vaultContract || 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC';
  
  // Use the proven working Tansu pattern - create contract client with options
  const client = new DeFindexClient({
    contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.sorobanRpcUrl,
    publicKey: address,
  });

  return client;
}

/**
 * Universal transaction submitter (EXACT copy of Tansu's submitTransaction)
 */
async function submitTransaction(assembledTx: any): Promise<any> {
  // If this is a real assembled transaction (SDK binding), it will expose
  // simulate/prepare/toXDR. Some tests or mocks may pass a plain object
  // (already-executed result); in that case, just return it.
  const hasSimulate = typeof assembledTx?.simulate === "function";
  const hasToXdr = typeof assembledTx?.toXDR === "function";
  if (!hasSimulate && !hasToXdr) {
    return assembledTx?.result ?? assembledTx;
  }

  try {
    const { signAndSend } = await import('./tansu-tx-service');
    return await signAndSend(assembledTx);
  } catch (error: any) {
    throw new Error(`Transaction submission failed: ${error.message}`);
  }
}

/**
 * Check simulation errors (simplified version of Tansu's checkSimulationError)
 */
function checkSimulationError(assembledTx: any): void {
  // Basic simulation error checking
  if (assembledTx?.error) {
    throw new Error(`Simulation error: ${JSON.stringify(assembledTx.error)}`);
  }
}

/**
 * Deposit to vault - EXACT Tansu pattern using generated contract bindings
 */
export async function depositToVault(userAddress: string, amount: string): Promise<string> {
  // Get client like Tansu does (EXACT pattern from ContractService.ts)
  const client = await getClient();

  // Convert amount to i128 format (7 decimals for XLM)
  const amountI128 = (parseFloat(amount) * 10_000_000).toString();
  
  // Get assembled transaction like Tansu does (client.commit, client.vote, etc.)
  const assembledTx = await client.deposit({
    amounts_desired: [amountI128],
    amounts_min: [amountI128], // Same as desired for no slippage
    from: userAddress,
    invest: true
  });

  // Check for simulation errors (EXACT Tansu pattern)
  checkSimulationError(assembledTx as any);

  // Submit transaction (EXACT Tansu pattern)
  return await submitTransaction(assembledTx);
}

/**
 * Withdraw from vault - EXACT Tansu pattern using generated contract bindings
 */
export async function withdrawFromVault(userAddress: string, xlmAmount: string, slippagePercent: number = 5): Promise<string> {
  // Get client like Tansu does (EXACT pattern from ContractService.ts)
  const client = await getClient();

  // First, get user's current shares to calculate how many to burn
  const userShares = await client.balance({ id: userAddress });
  const sharesBalance = Number(userShares.result) / 10_000_000; // Convert from i128 to readable
  
  if (sharesBalance === 0) {
    throw new Error("No vault shares to withdraw");
  }

  // For simplicity, if xlmAmount equals their total balance, withdraw all shares
  // Otherwise, calculate proportional shares to burn
  const userBalance = await getVaultBalance(userAddress);
  const shareRatio = parseFloat(xlmAmount) / parseFloat(userBalance);
  const sharesToBurn = Math.floor(shareRatio * sharesBalance * 10_000_000).toString(); // Convert back to i128

  // Calculate minimum amounts out with slippage protection
  const minAmountOut = Math.floor(parseFloat(xlmAmount) * (1 - slippagePercent / 100) * 10_000_000).toString();
  
  // Get assembled transaction like Tansu does (client.commit, client.vote, etc.)
  const assembledTx = await client.withdraw({
    withdraw_shares: sharesToBurn,
    min_amounts_out: [minAmountOut],
    from: userAddress
  });

  // Check for simulation errors (EXACT Tansu pattern)
  checkSimulationError(assembledTx as any);

  // Submit transaction (EXACT Tansu pattern)
  return await submitTransaction(assembledTx);
}

/**
 * Get vault total balance using contract binding
 */
export async function getVaultTotalBalance(): Promise<string> {
  const config = getNetworkConfig('testnet');
  const contractId = config.vaultContract;
  
  if (!contractId) {
    return "0";
  }

  try {
    const client = new DeFindexClient({
      contractId,
      networkPassphrase: config.networkPassphrase,
      rpcUrl: config.sorobanRpcUrl,
    });

    // Simulate the transaction to get the result
    const assembledTx = await client.fetch_total_managed_funds();
    const simulation = await assembledTx.simulate();
    
    // Check if simulation was successful and decode the result
    if ('result' in simulation && simulation.result) {
      // Use the assembled transaction's result property which handles XDR decoding
      const resultWrapper = assembledTx.result;
      
      // The result is wrapped in a Result type (Ok/Err), so we need to unwrap it
      if (resultWrapper && resultWrapper.isOk && resultWrapper.isOk()) {
        const totalManagedFunds = resultWrapper.unwrap();
        
        if (Array.isArray(totalManagedFunds) && totalManagedFunds.length > 0) {
          // Get XLM amount (first asset)
          const xlmAmount = totalManagedFunds[0].total_amount;
          return (Number(xlmAmount) / 10_000_000).toString();
        }
      }
    }
    
    return "0";
  } catch (error) {
    console.error('Failed to get vault total balance:', error);
    return "0";
  }
}

/**
 * Get user vault balance using contract binding
 */
export async function getVaultBalance(userAddress: string): Promise<string> {
  const config = getNetworkConfig('testnet');
  const contractId = config.vaultContract;
  
  if (!contractId) {
    return "0";
  }

  try {
    const client = new DeFindexClient({
      contractId,
      networkPassphrase: config.networkPassphrase,
      rpcUrl: config.sorobanRpcUrl,
    });

    // Simulate the transaction to get the result
    const assembledTx = await client.balance({ id: userAddress });
    const simulation = await assembledTx.simulate();
    
    // Check if simulation was successful and decode the result
    if ('result' in simulation && simulation.result) {
      // Use the assembled transaction's result property which handles XDR decoding
      const resultWrapper = assembledTx.result;
      
      // The result might be wrapped in a Result type, handle both cases
      let shares;
      if (resultWrapper && resultWrapper.isOk && resultWrapper.isOk()) {
        shares = resultWrapper.unwrap();
      } else {
        shares = resultWrapper;
      }
      
      // Convert from i128 to readable amount (shares)
      return (Number(shares) / 10_000_000).toString();
    }
    
    return "0";
  } catch (error) {
    console.error('Failed to get user vault balance:', error);
    return "0";
  }
}