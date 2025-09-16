/**
 * Exact copy of Tansu's transaction service functions
 * Copied from soroban-versioning/dapp/src/service/TxService.ts
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { getWalletKit } from './stellar';

/**
 * Send a signed transaction (Soroban) and decode typical return values.
 * - Accepts base64 XDR directly (soroban-rpc supports it)
 * - Falls back to classic Transaction envelope when necessary
 * - Waits for PENDING → SUCCESS/FAILED and attempts returnValue decoding
 */
export async function sendSignedTransaction(signedTxXdr: string): Promise<any> {
  const { Transaction, rpc } = await import("@stellar/stellar-sdk");
  const config = await import('./appConfig');
  const networkConfig = config.getNetworkConfig('testnet');
  const server = new rpc.Server(networkConfig.sorobanRpcUrl);

  let sendResponse: any;
  try {
    sendResponse = await (server as any).sendTransaction(signedTxXdr);
  } catch (_error) {
    const transaction = new Transaction(
      signedTxXdr,
      networkConfig.networkPassphrase,
    );
    sendResponse = await server.sendTransaction(transaction);
  }

  if (sendResponse.status === "ERROR") {
    const errorResultStr = JSON.stringify(sendResponse.errorResult);
    throw new Error(`Transaction failed: ${errorResultStr}`);
  }

  if (sendResponse.status === "SUCCESS") {
    if (sendResponse.returnValue !== undefined) {
      if (
        typeof sendResponse.returnValue === "number" ||
        typeof sendResponse.returnValue === "boolean"
      ) {
        return sendResponse.returnValue;
      }
      try {
        const { xdr, scValToNative } = await import("@stellar/stellar-sdk");
        const result = scValToNative(sendResponse.returnValue);
        return result;
      } catch (error) {
        console.warn("Failed to decode return value:", error);
        return sendResponse.returnValue;
      }
    }
    return sendResponse;
  }

  // Poll for transaction completion
  const hash = sendResponse.hash;
  let getResponse: any;
  
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResponse = await server.getTransaction(hash);
    
    if (getResponse.status === "SUCCESS") {
      if (getResponse.returnValue !== undefined) {
        if (
          typeof getResponse.returnValue === "number" ||
          typeof getResponse.returnValue === "boolean"
        ) {
          return getResponse.returnValue;
        }
        try {
          const { xdr, scValToNative } = await import("@stellar/stellar-sdk");
          const result = scValToNative(getResponse.returnValue);
          return result;
        } catch (error) {
          console.warn("Failed to decode return value:", error);
          return getResponse.returnValue;
        }
      }
      return getResponse;
    }
    
    if (getResponse.status === "FAILED") {
      throw new Error(`Transaction failed: ${getResponse.status}`);
    }
  }

  return sendResponse;
}

/**
 * Sign an already-assembled Soroban transaction by simulating, preparing (if supported),
 * converting to XDR and invoking the wallet kit signer.
 */
export async function signAssembledTransaction(
  assembledTx: any,
): Promise<string> {
  const sim = await assembledTx.simulate();

  if ((assembledTx as any).prepare) {
    await (assembledTx as any).prepare(sim);
  }

  const preparedXdr = assembledTx.toXDR();

  const kit = getWalletKit();
  const config = await import('./appConfig');
  const networkConfig = config.getNetworkConfig('testnet');
  const { signedTxXdr } = await kit.signTransaction(preparedXdr, {
    networkPassphrase: networkConfig.networkPassphrase,
  });

  return signedTxXdr;
}

/**
 * Convenience helper that signs an assembled transaction and sends it to the network.
 */
export async function signAndSend(assembledTx: any): Promise<any> {
  const signed = await signAssembledTransaction(assembledTx);
  return await sendSignedTransaction(signed);
}
