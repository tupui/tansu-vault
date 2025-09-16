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
  const contractId = config.vaultContract || 'CB4CEQW6W2HNVN3RA5T327T66N4DGIC24FONEZFKGUZVZDINK4WC5MXI';
  
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

    const result = await client.fetch_total_managed_funds();
    const totalManagedFunds = result.result;
    
    if (Array.isArray(totalManagedFunds) && totalManagedFunds.length > 0) {
      // Get XLM amount (first asset)
      const xlmAmount = totalManagedFunds[0].total_amount;
      return (Number(xlmAmount) / 10_000_000).toString();
    }
    
    return "0";
  } catch (error) {
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

    const result = await client.balance({ id: userAddress });
    const shares = result.result;
    
    // Convert from i128 to readable amount (shares)
    return (Number(shares) / 10_000_000).toString();
  } catch (error) {
    return "0";
  }
}