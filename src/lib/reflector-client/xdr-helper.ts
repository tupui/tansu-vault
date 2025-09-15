import { nativeToScVal, scValToNative, xdr } from '@stellar/stellar-sdk';
import { AssetInfo, AssetType } from './asset-type';

export const buildAssetScVal = (asset: AssetInfo): xdr.ScVal => {
  if (asset.type === AssetType.Stellar) {
    if (asset.code === 'XLM') {
      return nativeToScVal('stellar:native', { type: 'string' });
    }
    
    if (asset.contractId) {
      return nativeToScVal(asset.contractId, { type: 'string' });
    }
    
    if (asset.issuer) {
      return nativeToScVal(`stellar:${asset.issuer}:${asset.code}`, { type: 'string' });
    }
    
    return nativeToScVal(`stellar:${asset.code}`, { type: 'string' });
  }
  
  // For other assets, use the code directly
  return nativeToScVal(asset.code, { type: 'string' });
};

export const parseSorobanResult = (result: xdr.ScVal): any => {
  try {
    const native = scValToNative(result);
    
    // Handle different result formats
    if (typeof native === 'object' && native !== null) {
      // If it's an object with a price field
      if ('price' in native) {
        return parseFloat(native.price.toString());
      }
      
      // If it's an object with a value field  
      if ('value' in native) {
        return parseFloat(native.value.toString());
      }
      
      // If it's a number-like object
      if (typeof native.toString === 'function') {
        const str = native.toString();
        const num = parseFloat(str);
        if (!isNaN(num)) return num;
      }
    }
    
    // Handle direct number/string
    if (typeof native === 'number') {
      return native;
    }
    
    if (typeof native === 'string') {
      const num = parseFloat(native);
      if (!isNaN(num)) return num;
    }
    
    // Handle BigInt
    if (typeof native === 'bigint') {
      return Number(native);
    }
    
    throw new Error(`Unsupported result format: ${typeof native}`);
  } catch (error) {
    throw new Error(`Failed to parse Soroban result: ${error}`);
  }
};

export const scalePrice = (price: number, decimals: number): number => {
  return price / Math.pow(10, decimals);
};