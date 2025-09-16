/**
 * Horizon API utilities for transaction processing and normalization
 * Provides consistent transaction data structure for the application
 */

import { Horizon } from '@stellar/stellar-sdk';

export interface NormalizedTransaction {
  id: string;
  hash: string;
  ledger: number;
  createdAt: Date;
  
  // Transaction details
  type: string;
  direction: 'in' | 'out';
  amount?: number;
  fee?: number;
  
  // Asset information
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  assetCode?: string;
  assetIssuer?: string;
  
  // Counterparty information
  from?: string;
  to?: string;
  counterparty?: string;
  
  // Transaction category
  category: 'transfer' | 'swap' | 'contract' | 'config' | 'other';
  
  // Additional metadata
  memo?: string;
  memoType?: string;
  successful: boolean;
  
  // Raw operation data for reference
  rawOperation?: any;
}

// Rate limiting configuration
const MAX_CONCURRENT_REQUESTS = 3;
const RATE_LIMIT_DELAY = 100; // ms between requests
const MAX_TRANSACTIONS_PER_SESSION = 5000;

let activeRequests = 0;
let requestQueue: (() => void)[] = [];

const processQueue = () => {
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const next = requestQueue.shift();
    if (next) {
      activeRequests++;
      next();
    }
  }
};

const rateLimitedRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const executeRequest = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    requestQueue.push(executeRequest);
    processQueue();
  });
};

/**
 * Normalize a Horizon operation record into our standard format
 */
export const normalizeOperation = (
  operation: any,
  accountAddress: string,
  transaction: any
): NormalizedTransaction | null => {
  try {
    const base: Partial<NormalizedTransaction> = {
      id: operation.id,
      hash: transaction.hash,
      ledger: parseInt(transaction.ledger),
      createdAt: new Date(operation.created_at),
      type: operation.type,
      fee: parseFloat(transaction.fee_charged) / 10000000, // Convert from stroops
      successful: transaction.successful,
      memo: transaction.memo,
      memoType: transaction.memo_type,
      rawOperation: operation
    };

    // Process different operation types
    switch (operation.type) {
      case 'payment':
        return normalizePaymentOperation(operation, accountAddress, base);
      
      case 'path_payment_strict_receive':
      case 'path_payment_strict_send':
        return normalizePathPaymentOperation(operation, accountAddress, base);
      
      case 'create_account':
        return normalizeCreateAccountOperation(operation, accountAddress, base);
      
      case 'account_merge':
        return normalizeAccountMergeOperation(operation, accountAddress, base);
      
      case 'invoke_host_function':
        return normalizeContractOperation(operation, accountAddress, base);
      
      default:
        return normalizeGenericOperation(operation, accountAddress, base);
    }
  } catch (error) {
    console.warn('Failed to normalize operation:', error);
    return null;
  }
};

const normalizePaymentOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  const isReceiver = operation.to === accountAddress;
  const amount = parseFloat(operation.amount);

  return {
    ...base,
    direction: isReceiver ? 'in' : 'out',
    amount,
    assetType: operation.asset_type,
    assetCode: operation.asset_code,
    assetIssuer: operation.asset_issuer,
    from: operation.from,
    to: operation.to,
    counterparty: isReceiver ? operation.from : operation.to,
    category: 'transfer'
  } as NormalizedTransaction;
};

const normalizePathPaymentOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  const isReceiver = operation.to === accountAddress;
  
  // For path payments, we need to determine which asset and amount to show
  let amount: number;
  let assetType: string;
  let assetCode: string | undefined;
  let assetIssuer: string | undefined;

  if (isReceiver) {
    // Show destination asset and amount
    amount = parseFloat(operation.amount);
    assetType = operation.asset_type;
    assetCode = operation.asset_code;
    assetIssuer = operation.asset_issuer;
  } else {
    // Show source asset and amount
    amount = parseFloat(operation.source_amount);
    assetType = operation.source_asset_type;
    assetCode = operation.source_asset_code;
    assetIssuer = operation.source_asset_issuer;
  }

  return {
    ...base,
    direction: isReceiver ? 'in' : 'out',
    amount,
    assetType,
    assetCode,
    assetIssuer,
    from: operation.from,
    to: operation.to,
    counterparty: isReceiver ? operation.from : operation.to,
    category: 'swap'
  } as NormalizedTransaction;
};

const normalizeCreateAccountOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  const isReceiver = operation.account === accountAddress;
  const amount = parseFloat(operation.starting_balance);

  return {
    ...base,
    direction: isReceiver ? 'in' : 'out',
    amount,
    assetType: 'native',
    from: operation.source_account || operation.funder,
    to: operation.account,
    counterparty: isReceiver ? (operation.source_account || operation.funder) : operation.account,
    category: 'config'
  } as NormalizedTransaction;
};

const normalizeAccountMergeOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  const isReceiver = operation.into === accountAddress;

  return {
    ...base,
    direction: isReceiver ? 'in' : 'out',
    assetType: 'native',
    from: operation.account,
    to: operation.into,
    counterparty: isReceiver ? operation.account : operation.into,
    category: 'config'
  } as NormalizedTransaction;
};

const normalizeContractOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  return {
    ...base,
    direction: 'out', // Contract invocations are typically outgoing
    assetType: 'native', // Fee asset
    category: 'contract'
  } as NormalizedTransaction;
};

const normalizeGenericOperation = (
  operation: any,
  accountAddress: string,
  base: Partial<NormalizedTransaction>
): NormalizedTransaction => {
  return {
    ...base,
    direction: 'out', // Default to outgoing for unknown types
    assetType: 'native',
    category: 'other'
  } as NormalizedTransaction;
};

/**
 * Load transactions for an account with rate limiting
 */
export const loadAccountTransactions = async (
  server: Horizon.Server,
  accountAddress: string,
  limit: number = 200,
  cursor?: string
): Promise<{ transactions: NormalizedTransaction[]; nextCursor?: string }> => {
  try {
    const operationsCall = server
      .operations()
      .forAccount(accountAddress)
      .order('desc')
      .limit(limit)
      .includeFailed(false);

    if (cursor) {
      operationsCall.cursor(cursor);
    }

    const response = await rateLimitedRequest(() => operationsCall.call());
    const operations = response.records;

    if (operations.length === 0) {
      return { transactions: [] };
    }

    // Get unique transaction hashes
    const transactionHashes = [...new Set(operations.map(op => op.transaction_hash))];
    
    // Load transaction details in batches
    const transactionDetails: Record<string, any> = {};
    
    for (const hash of transactionHashes) {
      try {
        const tx = await rateLimitedRequest(() => server.transactions().transaction(hash).call());
        transactionDetails[hash] = tx;
      } catch (error) {
        console.warn(`Failed to load transaction ${hash}:`, error);
        // Continue processing other transactions
      }
    }

    // Normalize operations
    const transactions: NormalizedTransaction[] = [];
    
    for (const operation of operations) {
      const transaction = transactionDetails[operation.transaction_hash];
      if (!transaction) continue;

      const normalized = normalizeOperation(operation, accountAddress, transaction);
      if (normalized) {
        transactions.push(normalized);
      }
    }

    // Remove duplicates and sort by date
    const uniqueTransactions = transactions
      .filter((tx, index, arr) => arr.findIndex(t => t.id === tx.id) === index)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      transactions: uniqueTransactions,
      nextCursor: operations.length > 0 ? operations[operations.length - 1].paging_token : undefined
    };
  } catch (error) {
    console.error('Failed to load account transactions:', error);
    throw error;
  }
};

/**
 * Get transaction statistics for an account
 */
export const getAccountTransactionStats = (transactions: NormalizedTransaction[]) => {
  const stats = {
    total: transactions.length,
    incoming: 0,
    outgoing: 0,
    totalAmountIn: 0,
    totalAmountOut: 0,
    categories: {
      transfer: 0,
      swap: 0,
      contract: 0,
      config: 0,
      other: 0
    },
    assetTypes: {
      native: 0,
      credit_alphanum4: 0,
      credit_alphanum12: 0
    },
    dateRange: {
      earliest: null as Date | null,
      latest: null as Date | null
    }
  };

  for (const tx of transactions) {
    if (tx.direction === 'in') {
      stats.incoming++;
      if (tx.amount) stats.totalAmountIn += tx.amount;
    } else {
      stats.outgoing++;
      if (tx.amount) stats.totalAmountOut += tx.amount;
    }

    stats.categories[tx.category]++;
    stats.assetTypes[tx.assetType]++;

    if (!stats.dateRange.earliest || tx.createdAt < stats.dateRange.earliest) {
      stats.dateRange.earliest = tx.createdAt;
    }
    if (!stats.dateRange.latest || tx.createdAt > stats.dateRange.latest) {
      stats.dateRange.latest = tx.createdAt;
    }
  }

  return stats;
};