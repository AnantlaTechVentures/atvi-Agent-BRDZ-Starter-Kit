//Path: types/brdz-sdk.d.ts

declare module '@anantla/brdz-sdk' {
  // Data Interfaces
  interface DashboardStats {
    total_orders: number;
    completed_orders: number;
    processing_orders: number;
    total_spent_usdc: number;
    completion_rate: number;
    formatted_total_spent: string;
  }

  interface RegisterData {
    email: string;
    username: string;
    client_alias?: string;
    client_type?: string;
    country_code?: string;
    phone?: string;
  }

  interface WalletData {
    wallet_name: string;
    user_id: number;
  }

  interface AIIntentData {
    user_input: string;
    user_id: number;
    context?: any;
  }

  // Main SDK Declaration
  const brdzSDK: {
    // Configuration Module (6 methods)
    config: {
      setBaseUrl: (url: string) => void;
      getBaseUrl: () => string;
      setToken: (token: string) => void;
      getToken: () => string;
      setApiKey: (key: string) => void;
      getApiKey: () => string;
    };

    // Admin Module (6 methods) - FIXED TYPO
    admin: {
      createUserByAdmin: (userData: any) => Promise<any>;
      getAllUsers: (params?: any) => Promise<any>;
      getUserById: (userId: string) => Promise<any>;
      updateUser: (userId: string, userData: any) => Promise<any>;
      deleteUser: (userId: string) => Promise<any>; // FIXED: was deleteWallet
      getSystemStats: () => Promise<any>;
    };

    // Authentication Module (7 methods)
    auth: {
      loginUser: (usernameoremail: string, password: string) => Promise<any>;
      initiateMobileLogin: (emailOrUsername: string) => Promise<any>;
      checkMobileLoginStatus: (sessionId: string) => Promise<any>;
      approveMobileLogin: (sessionId: string, deviceId: string) => Promise<any>;
      forgotPassword: (email: string) => Promise<any>;
      registerUser: (data: RegisterData) => Promise<any>;
      getUserProfile: (user_id: string) => Promise<any>;
    };

    // API Key Management (3 methods)
    apikey: {
      create: (provider_name?: string) => Promise<any>;
      list: () => Promise<any>;
      remove: (api_key: string) => Promise<any>;
    };

    // Bridge Module (5 methods)
    bridge: {
      getAvailableChains: () => Promise<any>;
      getUserBridgeWallets: (userId: string) => Promise<any>;
      addBridgeWallet: (data: any) => Promise<any>;
      simulateBridge: (data: any) => Promise<any>;
      executeBridge: (data: any) => Promise<any>;
    };

    // Cardano Module (9 methods)
    cardano: {
      getBalance: (address: string) => Promise<any>;
      getHistory: (address: string) => Promise<any>;
      getVolume: (address: string) => Promise<any>;
      getUsdcBalance: (address: string) => Promise<any>;
      getAddressByUser: (userId: string) => Promise<any>;
      onramp: (data: any) => Promise<any>;
      offramp: (data: any) => Promise<any>;
      onrampBankOfframpWallet: (data: any) => Promise<any>;
      getUsdcHistoryByUser: (userId: string) => Promise<any>;
    };

    // Client Management (6 methods)
    client: {
      registerClientWithAdmin: (clientData: any) => Promise<any>;
      getClientById: (clientId: string) => Promise<any>;
      getAllClients: (params?: any) => Promise<any>;
      updateClient: (clientId: string, clientData: any) => Promise<any>;
      deleteClient: (clientId: string) => Promise<any>;
      getClientStats: (clientId: string) => Promise<any>;
    };

    // Cross-Chain Module (9 methods)
    crosschain: {
      initiateTransfer: (data: any) => Promise<any>;
      confirmTransfer: (data: any) => Promise<any>;
      mintToken: (nonce: string) => Promise<any>;
      getUSDCBalance: (chain: string, address: string) => Promise<any>;
      testMint: (data: any) => Promise<any>;
      burnToken: (data: any) => Promise<any>;
      burnTokenFrontend: (data: any) => Promise<any>;
      getCTransactionHistory: (user_id: number, params?: any) => Promise<any>;
      getCTransactionDetails: (log_id: string) => Promise<any>;
    };

    // Crypto Wallet ABSK Module (comprehensive structure)
    cryptoWallet: {
      // Manual Operations
      createWallet: (data: WalletData) => Promise<any>;
      getUserWallets: (user_id: number) => Promise<any>;
      addChainAddress: (bw_id: number, data: { chain_id: string }) => Promise<any>;
      getWalletAddresses: (bw_id: number) => Promise<any>;
      deleteWallet: (bw_id: number, data: any) => Promise<any>;

      // AI Agent Operations
      processAIIntent: (data: AIIntentData) => Promise<any>;
      ai: {
        createWallet: (user_input: string, user_id: number) => Promise<any>;
        listWallets: (user_input: string, user_id: number) => Promise<any>;
        addChain: (user_input: string, user_id: number, wallet_id?: number) => Promise<any>;
      };

      // Transaction Operations
      getTransactionHistory: (user_id: number, params?: any) => Promise<any>;
      cancelTransaction: (tx_id: string, data: any) => Promise<any>;
      getTransactionDetails: (tx_id: string, params: any) => Promise<any>;

      // Private Key Management
      keys: {
        store: (data: any) => Promise<any>;
        getForSigning: (wallet_id: number, chain_id: string, purpose?: string) => Promise<any>;
        createBackup: (data: any) => Promise<any>;
        getOverview: (wallet_id: number, params: any) => Promise<any>;
        delete: (wallet_id: number, chain_id: string, data: any) => Promise<any>;
      };

      // Token & Balance Management
      tokens: {
        import: (data: any) => Promise<any>;
        getImported: (user_id: number) => Promise<any>;
        remove: (wallet_id: number, asset_id: number, data: any) => Promise<any>;
      };

      balance: {
        getTotal: (wallet_id: number) => Promise<any>;
        getChain: (wallet_id: number, chain_id: string) => Promise<any>;
        getUSDC: (wallet_id: number, chain_id: string) => Promise<any>;
      };

      // Utility Functions
      utils: {
        getSupportedChains: () => string[];
        isValidChain: (chain_id: string) => boolean;
        isValidAddress: (address: string) => boolean;
        formatBalance: (balance: string, decimals?: number, precision?: number) => string;
        getChainName: (chain_id: string) => string;
        getNativeSymbol: (chain_id: string) => string;
      };
    };

    // eKYC Module (4 methods)
    ekyc: {
      getEkycStatus: (user_id: string) => Promise<any>;
      generateSumsubToken: () => Promise<any>;
      generateWebSdkLink: (user_id: string) => Promise<any>;
      syncSumsubStatus: (payload: any) => Promise<any>;
    };

    // FX Module (3 methods)
    fx: {
      getRate: (from: string, to: string) => Promise<any>;
      convertAll: (from: string, to: string, amount: number) => Promise<any>;
      simulateFx: (data: any) => Promise<any>;
    };

    // MCP AI Commerce Module (10+ methods)
    mcp: {
      step1_detectIntent: (data: { prompt: string }) => Promise<any>;
      step2_parseProduct: (data: { url: string }) => Promise<any>;
      step3a_productConfirmation: (data: { product: any }) => Promise<any>;
      createOrder: (data: any) => Promise<any>;
      executeOrder: (data: any) => Promise<any>;
      getOrder: (order_id: string) => Promise<any>;
      getRecentOrders: (params?: any) => Promise<any>;
      getDashboardStats: () => Promise<DashboardStats>;
      getAllOrders: (params?: any) => Promise<any>;
      getDashboardData: (recentLimit?: number) => Promise<any>;
    };

    // Neon Module (2 methods)
    neon: {
      signInWithNeon: (payload: any) => Promise<any>;
      getBalance: (wallet_address: string) => Promise<any>;
    };

    // NTCP Module (6 methods)
    ntcp: {
      getRecipients: () => Promise<any>;
      addRecipient: (data: any) => Promise<any>;
      deleteRecipient: (data: any) => Promise<any>;
      initBatchTransfer: (data: any) => Promise<any>;
      getBatchStatus: (batchId: string) => Promise<any>;
      getBatchDetail: (batchId: string) => Promise<any>;
    };

    // Plaid Module (5 methods)
    plaid: {
      createLinkToken: (data: any) => Promise<any>;
      exchangePublicToken: (data: any) => Promise<any>;
      getBankAccounts: (data: any) => Promise<any>;
      plaidTopup: (data: any) => Promise<any>;
      getPlaidHistory: (userId: string) => Promise<any>;
    };

    // StableX Module (4 methods)
    stableX: {
      getPricePreview: (payload: any) => Promise<any>;
      convertAsset: (payload: any) => Promise<any>;
      stablexOnramp: (payload: any) => Promise<any>;
      stablexPurchase: (payload: any) => Promise<any>;
    };

    // Testnet Module (4 methods)
    testnet: {
      getChainList: () => Promise<any>;
      requestTestnetTopup: (payload: any) => Promise<any>;
      getFaucetWallets: () => Promise<any>;
      requestFaucetTransfer: (payload: any) => Promise<any>;
    };

    // Transactions Module (11 methods)
    transactions: {
      getAll: () => Promise<any>;
      getById: (id: string) => Promise<any>;
      createTransaction: (data: any) => Promise<any>;
      topupWallet: (data: any) => Promise<any>;
      withdrawWallet: (data: any) => Promise<any>;
      transferLocal: (data: any) => Promise<any>;
      transferCrossborder: (data: any) => Promise<any>;
      transferCrosschain: (data: any) => Promise<any>;
      getTransactionStatus: (txId: string) => Promise<any>;
      simulateFee: (data: any) => Promise<any>;
      cancelTransaction: (txId: string) => Promise<any>;
    };

    // Utils Module (6 methods)
    utils: {
      get: (path: string, params?: any) => Promise<any>;
      post: (path: string, body?: any) => Promise<any>;
      put: (path: string, body?: any) => Promise<any>;
      del: (path: string) => Promise<any>;
      debugHeaders: () => any;
      validateSDKSetup: () => boolean;
    };

    // Visa Module (6 methods)
    visa: {
      getCards: () => Promise<any>;
      createCard: (data: any) => Promise<any>;
      freezeCard: (data: any) => Promise<any>;
      unfreezeCard: (data: any) => Promise<any>;
      getCardBalance: (cardId: string) => Promise<any>;
      getCardStatement: (cardId: string) => Promise<any>;
    };

    // Wallet Module (8 methods)
    wallet: {
      getBalance: () => Promise<any>;
      getHistory: () => Promise<any>;
      addWallet: (data: any) => Promise<any>;
      setDefaultWallet: (data: any) => Promise<any>;
      freezeWallet: (data: any) => Promise<any>;
      unfreezeWallet: (data: any) => Promise<any>;
      setLimit: (data: any) => Promise<any>;
      getWalletInfo: () => Promise<any>;
    };

    // XRPL Module (7 methods)
    xrpl: {
      getIssuerByCurrency: (currency: string) => Promise<any>;
      getAllIssuers: () => Promise<any>;
      createIssuer: (data: any) => Promise<any>;
      getTrustlines: (userId: string) => Promise<any>;
      createTrustline: (data: any) => Promise<any>;
      initOnramp: (data: any) => Promise<any>;
      getOnrampStatus: (txid: string) => Promise<any>;
    };

    // Onchain Transaction Module (20 methods total)
    onchain: {
      // Core Operations (6 methods)
      getFeeSettings: () => Promise<any>;
      executeTransaction: (data: any) => Promise<any>;
      logTransaction: (data: any) => Promise<any>;
      getTransactionHistory: (user_id: number, params?: any) => Promise<any>;
      getMyTransactionHistory: (params?: any) => Promise<any>;
      getTransactionDetails: (tx_hash: string) => Promise<any>;

      // Admin Operations (5 methods)
      admin: {
        getFeeSettings: () => Promise<any>;
        updateFeeSettings: (settings: any) => Promise<any>;
        triggerScan: () => Promise<any>;
        getScanStats: () => Promise<any>;
        scanChain: (chain_id: string) => Promise<any>;
      };

      // Utility Functions (10 methods)
      utils: {
        getSupportedChains: () => string[];
        getSupportedTokens: () => string[];
        isValidChain: (chain_id: string) => boolean;
        isValidTxHash: (tx_hash: string) => boolean;
        isValidAddress: (address: string) => boolean;
        getExplorerUrl: (chain_id: string, tx_hash: string) => string;
        getChainName: (chain_id: string) => string;
        getNativeSymbol: (chain_id: string) => string;
        calculatePlatformFee: (amount: string, fee_percentage: number, minimum_fee: number) => number;
        formatAmount: (amount: string, decimals?: number) => string;
        parseTransactionType: (tx_flow: string) => string;
      };
    };
  };
  export default brdzSDK;
}