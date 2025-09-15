import { StrKey } from '@stellar/stellar-sdk';
import Decimal from 'decimal.js';

/**
 * Validates if a string is a valid Stellar public key
 */
export const isValidPublicKey = (publicKey: string): boolean => {
  try {
    return StrKey.isValidEd25519PublicKey(publicKey);
  } catch {
    return false;
  }
};

/**
 * Validates if a string is a valid Stellar secret key
 */
export const isValidSecretKey = (secretKey: string): boolean => {
  try {
    return StrKey.isValidEd25519SecretSeed(secretKey);
  } catch {
    return false;
  }
};

/**
 * Validates if an amount is valid for transactions
 */
export const isValidAmount = (amount: string | number): boolean => {
  try {
    const decimal = new Decimal(amount);
    return decimal.isPositive() && decimal.decimalPlaces() <= 7;
  } catch {
    return false;
  }
};

/**
 * Validates if a domain name is valid for Soroban domains
 */
export const isValidDomain = (domain: string): boolean => {
  if (typeof domain !== 'string' || domain.length === 0) return false;
  
  // Check for .xlm domains specifically
  if (domain.endsWith('.xlm')) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.xlm$/;
    return domainRegex.test(domain);
  }
  
  // General domain validation
  const generalDomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return domain.length <= 253 && 
         generalDomainRegex.test(domain) &&
         !domain.startsWith('-') &&
         !domain.endsWith('-') &&
         !domain.includes('..');
};

/**
 * Validates if a string is a valid XDR
 */
export const isValidXDR = (xdr: string): boolean => {
  try {
    // Basic XDR validation - should be base64 encoded
    return /^[A-Za-z0-9+/]*={0,2}$/.test(xdr) && xdr.length > 0;
  } catch {
    return false;
  }
};

/**
 * Validates if a string looks like a Stellar address or domain
 */
export const isValidAddressOrDomain = (input: string): boolean => {
  return isValidPublicKey(input) || isValidDomain(input);
};

/**
 * Format a Stellar address for display
 */
export const formatAddress = (address: string, chars: number = 4): string => {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Enhanced error sanitization with structured return
 */
export const sanitizeError = (error: unknown): { userMessage: string; originalError?: string } => {
  if (typeof error === 'string') {
    return { userMessage: error };
  }
  
  if (error instanceof Error) {
    let userMessage = error.message;
    
    // Common Stellar error patterns
    if (error.message.includes('op_under_dest_min')) {
      userMessage = 'Amount is below the minimum required';
    } else if (error.message.includes('op_insufficient_balance')) {
      userMessage = 'Insufficient balance for this transaction';
    } else if (error.message.includes('tx_bad_seq')) {
      userMessage = 'Transaction sequence number is invalid. Please try again.';
    } else if (error.message.includes('op_malformed')) {
      userMessage = 'Transaction is malformed. Please check your inputs.';
    } else if (error.message.includes('op_no_trust')) {
      userMessage = 'You need to add a trustline for this asset first';
    } else if (error.message.includes('User rejected')) {
      userMessage = 'Transaction was rejected by user';
    } else if (error.message.includes('Failed to connect')) {
      userMessage = 'Failed to connect to wallet. Please try again.';
    }
    
    return { userMessage, originalError: error.message };
  }
  
  return { userMessage: 'An unexpected error occurred' };
};

/**
 * Validates if a network name is supported
 */
export const isValidNetwork = (network: string): boolean => {
  return ['mainnet', 'testnet'].includes(network);
};

/**
 * Formats and validates Stellar amounts
 */
export const formatStellarAmount = (amount: string | number): string => {
  try {
    const decimal = new Decimal(amount);
    return decimal.toFixed(7).replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
};