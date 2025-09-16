// Utility functions for hashing and project key computation
// Uses keccak256 as in Tansu contract

import { keccak256 } from 'js-sha3';

// Return 32-byte keccak256 of input bytes
export function keccak256Bytes(input: Uint8Array | string): Uint8Array {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
  }
  const buf = keccak256.arrayBuffer(bytes) as ArrayBuffer;
  return new Uint8Array(buf);
}

// Compute Tansu project key from project name (first label if domain-like)
// Mirrors contract side: keccak256 over up to first 15 bytes of the name
export function computeTansuProjectKey(identifier: string): Uint8Array {
  const label = identifier.includes('.') ? identifier.split('.')[0] : identifier;
  const trimmed = label.trim();
  // Limit to 15 characters as per contract register constraint
  const limited = trimmed.slice(0, 15);
  const bytes = new TextEncoder().encode(limited);
  return keccak256Bytes(bytes);
}
