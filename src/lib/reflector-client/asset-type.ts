export enum AssetType {
  Stellar = 'stellar',
  Other = 'other'
}

export interface AssetInfo {
  type: AssetType;
  code: string;
  issuer?: string;
  contractId?: string;
}

export const parseAsset = (asset: string): AssetInfo => {
  // Handle Stellar Asset Contract ID format (starts with 'C')
  if (asset.length === 56 && asset.startsWith('C')) {
    return {
      type: AssetType.Stellar,
      code: asset,
      contractId: asset
    };
  }

  // Handle issuer:code format
  if (asset.includes(':')) {
    const [issuer, code] = asset.split(':');
    return {
      type: AssetType.Stellar,
      code,
      issuer
    };
  }

  // Handle XLM native
  if (asset === 'XLM' || asset === 'native') {
    return {
      type: AssetType.Stellar,
      code: 'XLM'
    };
  }

  // Default to other assets (BTC, ETH, etc.)
  return {
    type: AssetType.Other,
    code: asset
  };
};