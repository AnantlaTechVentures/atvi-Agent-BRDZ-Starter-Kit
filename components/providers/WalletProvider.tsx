// Path: components/providers/WalletProvider.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  signer: ethers.Signer | null;
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          
          setProvider(provider);
          setSigner(signer);
          setWalletAddress(address);
          setChainId(Number(network.chainId));
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setWalletAddress(address);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setSigner(null);
    setWalletAddress(null);
    setIsConnected(false);
    setChainId(null);
    setProvider(null);

    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      // Reconnect with new account
      checkConnection();
    }
  };

  const handleChainChanged = (chainId: string) => {
    // Reload to handle chain change
    window.location.reload();
  };

  const contextValue: WalletContextType = {
    signer,
    walletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    chainId,
    provider
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}