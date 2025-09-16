/**
 * IPFS utilities for fetching project metadata
 */

interface TansuMetadata {
  logo?: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Fetch tansu.toml from IPFS hash
 */
export async function fetchTansuMetadata(ipfsHash: string): Promise<TansuMetadata | null> {
  if (!ipfsHash) return null;
  
  try {
    // Try multiple IPFS gateways for reliability
    const gateways = [
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
    ];

    for (const url of gateways) {
      try {
        const response = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'text/plain' },
          // Add timeout
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) continue;
        
        const text = await response.text();
        
        // Parse simple TOML-like format
        const metadata: TansuMetadata = {};
        const lines = text.split('\n');
        
        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned || cleaned.startsWith('#')) continue;
          
          const [key, ...valueParts] = cleaned.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/['"]/g, '');
            metadata[key.trim()] = value;
          }
        }
        
        return metadata;
      } catch (error) {
        // Try next gateway
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to fetch IPFS metadata:', error);
    return null;
  }
}

/**
 * Extract logo URL from metadata
 */
export function extractLogoUrl(metadata: TansuMetadata | null): string | null {
  if (!metadata) return null;
  
  // Look for common logo field names
  const logoFields = ['logo', 'logo_url', 'image', 'icon'];
  
  for (const field of logoFields) {
    const value = metadata[field];
    if (value && typeof value === 'string') {
      // Convert IPFS hash to full URL if needed
      if (value.startsWith('Qm') || value.match(/^[A-Za-z0-9]{46,59}$/)) {
        return `https://ipfs.io/ipfs/${value}`;
      }
      
      // Return as-is if already a URL
      if (value.startsWith('http')) {
        return value;
      }
    }
  }
  
  return null;
}