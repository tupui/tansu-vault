import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, AlertCircle, User, Globe } from 'lucide-react';
import { isValidPublicKey, isValidDomain, isValidAddressOrDomain } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';
import { useNetwork } from '@/contexts/NetworkContext';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, resolvedAddress?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showValidation?: boolean;
  addressBookEnabled?: boolean;
  onResolvedAddressChange?: (address: string | null) => void;
}

interface AddressBookEntry {
  name: string;
  address: string;
  domain?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter Stellar address or .xlm domain",
  className,
  disabled = false,
  showValidation = true,
  addressBookEnabled = true,
  onResolvedAddressChange
}) => {
  const { network } = useNetwork();
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressBook] = useState<AddressBookEntry[]>([
    // Mock address book entries
    { name: 'Alice', address: 'GCKFBEIYTKP5RDBKZ5T4XWUVQNKDGKB7WKZL2XHFGMQ5VCZFWQJGCPPM' },
    { name: 'Bob', address: 'GDQJUTQYK2MQX2VGDR2FYWLIYAQIEGXTQVTFEMGH2BEWFG4BRUY4CKI7' },
  ]);

  // Validation state
  const validationState = useMemo(() => {
    if (!value.trim()) {
      return { isValid: null, type: null, message: '' };
    }

    if (isValidPublicKey(value)) {
      return { isValid: true, type: 'address', message: 'Valid Stellar address' };
    }

    if (isValidDomain(value)) {
      return { isValid: true, type: 'domain', message: 'Valid domain - resolving...' };
    }

    return { isValid: false, type: null, message: 'Invalid address or domain format' };
  }, [value]);

  // Domain resolution effect
  useEffect(() => {
    if (!value || !isValidDomain(value)) {
      setResolvedAddress(null);
      setResolutionError(null);
      onResolvedAddressChange?.(null);
      return;
    }

    const resolveDomain = async () => {
      setIsResolving(true);
      setResolutionError(null);

      try {
        const address = await resolveSorobanDomain(value, network);
        
        if (address) {
          setResolvedAddress(address);
          onResolvedAddressChange?.(address);
        } else {
          setResolutionError('Domain not found or not registered');
          setResolvedAddress(null);
          onResolvedAddressChange?.(null);
        }
      } catch (error) {
        setResolutionError('Failed to resolve domain');
        setResolvedAddress(null);
        onResolvedAddressChange?.(null);
        console.error('Domain resolution error:', error);
      } finally {
        setIsResolving(false);
      }
    };

    const timeoutId = setTimeout(resolveDomain, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [value, network, onResolvedAddressChange]);

  // Address book filtering
  const filteredAddressBook = useMemo(() => {
    if (!addressBookEnabled || !value.trim() || value.length < 2) {
      return [];
    }

    return addressBook.filter(entry =>
      entry.name.toLowerCase().includes(value.toLowerCase()) ||
      entry.address.toLowerCase().includes(value.toLowerCase()) ||
      entry.domain?.toLowerCase().includes(value.toLowerCase())
    );
  }, [value, addressBook, addressBookEnabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, resolvedAddress || undefined);
    setShowSuggestions(true);
  }, [onChange, resolvedAddress]);

  const handleSuggestionClick = useCallback((entry: AddressBookEntry) => {
    onChange(entry.address, entry.address);
    setShowSuggestions(false);
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const finalAddress = resolvedAddress || (isValidPublicKey(value) ? value : null);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            validationState.isValid === false && "border-destructive",
            validationState.isValid === true && "border-primary",
            className
          )}
          disabled={disabled}
        />

        {/* Loading/Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isResolving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!isResolving && validationState.isValid === true && (
            <Check className="h-4 w-4 text-primary" />
          )}
          {!isResolving && validationState.isValid === false && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Address Book Suggestions */}
      {showSuggestions && filteredAddressBook.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 border shadow-lg">
          <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
            {filteredAddressBook.map((entry, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-2"
                onClick={() => handleSuggestionClick(entry)}
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{entry.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {entry.address.slice(0, 8)}...{entry.address.slice(-8)}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Validation Messages */}
      {showValidation && (
        <div className="space-y-2">
          {/* Domain Resolution Status */}
          {isValidDomain(value) && (
            <div className="flex items-center space-x-2">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isResolving ? 'Resolving domain...' : resolvedAddress ? 'Domain resolved' : 'Domain not found'}
              </span>
              {validationState.type === 'domain' && (
                <Badge variant="outline" className="text-xs">
                  Domain
                </Badge>
              )}
            </div>
          )}

          {/* Resolved Address Display */}
          {resolvedAddress && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Resolves to: <code className="text-sm font-mono">{resolvedAddress}</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Messages */}
          {resolutionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{resolutionError}</AlertDescription>
            </Alert>
          )}

          {/* Validation Error */}
          {validationState.isValid === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationState.message}</AlertDescription>
            </Alert>
          )}

          {/* Address Type Badge */}
          {validationState.type === 'address' && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Stellar Address
              </Badge>
              <span className="text-sm text-muted-foreground">Ready to use</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};