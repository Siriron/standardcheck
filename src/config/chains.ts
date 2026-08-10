export type NetworkKey = 'studionet' | 'bradbury';

export interface ChainConfig {
  key: NetworkKey;
  label: string;
  chainIdHex: string;
  chainIdDecimal: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contractAddress: string;
}

export const CHAIN_CONFIGS: Record<NetworkKey, ChainConfig> = {
  studionet: {
    key: 'studionet',
    label: 'StudioNet',
    chainIdHex: '0xF22F',
    chainIdDecimal: 61999,
    chainName: 'GenLayer StudioNet',
    rpcUrl: 'https://studio.genlayer.com/api',
    explorerUrl: 'https://explorer-studio.genlayer.com',
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    // Deployed StandardCheck contract (two-source, RFC 9116). Live-
    // verified via Studio's Run and Debug panel, Aug 10 2026 — see
    // docs/deployment.md for the full transaction record.
    contractAddress:
      import.meta.env.VITE_CONTRACT_ADDRESS_STUDIONET ||
      '0x4F734e3F5eDF052C3bad761b8DfD0925748d09eD',
  },
  bradbury: {
    key: 'bradbury',
    label: 'Bradbury',
    chainIdHex: '0x107D',
    chainIdDecimal: 4221,
    chainName: 'GenLayer Bradbury',
    rpcUrl: 'https://rpc-bradbury.genlayer.com',
    explorerUrl: 'https://explorer-bradbury.genlayer.com',
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    // Same contract code as StudioNet. Deployed live; not separately
    // transaction-tested on this network — see docs/deployment.md.
    contractAddress:
      import.meta.env.VITE_CONTRACT_ADDRESS_BRADBURY ||
      '0x1Ab52B29b47d7488c0Bd8Ba77aA29fa2cA82997D',
  },
};

// Receipt-wait config — section 7's confirmed reasonable values. GenVM
// consensus (propose -> commit -> reveal -> accept, potentially across
// multiple leader-rotation rounds) genuinely takes real minutes for any
// write that triggers an LLM judgment, which every write on this
// contract does.
export const RECEIPT_CONFIG: Record<NetworkKey, { retries: number; interval: number }> = {
  studionet: { retries: 120, interval: 4000 },
  bradbury: { retries: 240, interval: 6000 },
};

export const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation';
