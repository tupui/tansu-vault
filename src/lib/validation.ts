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
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  // Basic domain validation - should end with .xlm
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.xlm$/;
  return domainRegex.test(domain) && domain.length <= 64;
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
 * Sanitizes error messages for user display
 */
export const sanitizeError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    // Common Stellar error patterns
    if (error.message.includes('op_under_dest_min')) {
      return 'Amount is below the minimum required';
    }
    if (error.message.includes('op_insufficient_balance')) {
      return 'Insufficient balance for this transaction';
    }
    if (error.message.includes('tx_bad_seq')) {
      return 'Transaction sequence number is invalid. Please try again.';
    }
    if (error.message.includes('op_malformed')) {
      return 'Transaction is malformed. Please check your inputs.';
    }
    if (error.message.includes('op_no_trust')) {
      return 'You need to add a trustline for this asset first';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred';
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

/**
 * Validates if a string looks like a Stellar address or domain
 */
export const isValidAddressOrDomain = (input: string): boolean => {
  return isValidPublicKey(input) || isValidDomain(input);
};