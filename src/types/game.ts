export type CurrencyType = 'ctc' | 'btc' | 'eth' | 'hash';

export type GameState = 
  | 'TITLE' 
  | 'PLAYING' 
  | 'PAUSED' 
  | 'ROUND_SUMMARY' 
  | 'GAME_OVER' 
  | 'WALLET_MODAL' 
  | 'SECURITY_DRILL';

export interface WalletBalances {
  hot: {
    ctc: number;
    btc: number;
    eth: number;
    hash: number;
  };
  cold: {
    ctc: number;
    btc: number;
    eth: number;
  };
}

export interface StakedPosition {
  id: string;
  currency: 'ctc' | 'btc';
  amount: number;
  apy: number;
  termDays: number;
  startDate: number;
  unlockDate: number;
  accumulatedReward: number;
}

export interface WhitelistedAddress {
  id: string;
  label: string;
  address: string;
  currency: CurrencyType;
  addedAt: number;
  status: 'active' | 'timelock_pending';
  unlocksAt: number; // 24h timelock
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'biometric' | 'totp' | 'hardware_key';
  autoSweepEnabled: boolean;
  autoSweepThreshold: number; // e.g. sweep when hot CTC > 150
  velocityLimitEnabled: boolean;
  velocityLimitPerHour: number; // e.g. 200 CTC max transfer/hour
  recentHourlyOutbound: number;
  multisigEnabled: boolean;
  seedPhraseBackedUp: boolean;
  seedWords: string[];
  stratumRecoveryKey: string;
}

export interface TransactionRecord {
  id: string;
  txHash: string;
  type: 
    | 'MINED_REWARD' 
    | 'SWEEP_COLD' 
    | 'TRANSFER_HOT' 
    | 'STAKE_LOCK' 
    | 'CLAIM_STAKE' 
    | 'DEX_SWAP' 
    | 'UPGRADE_PURCHASE'
    | 'SECURITY_INTERCEPT';
  amount: number;
  currency: CurrencyType | 'usd';
  from: string;
  to: string;
  timestamp: number;
  blockHeight: number;
  confirmations: number;
  status: 'confirmed' | 'pending' | 'intercepted';
  gasFee: number;
  note?: string;
}

export interface MinedRunStats {
  ctc: number;
  btc: number;
  eth: number;
  hash: number;
  score: number;
  blocksCracked: number;
  threatsNeutralized: number;
  peakHashrate: number;
  durationSeconds: number;
}

export interface RigUpgrades {
  laserPower: number; // 1 to 5
  magnetReach: number; // 1 to 5
  shieldCapacity: number; // 1 to 5
  engineSpeed: number; // 1 to 5
  overclockRate: number; // 1 to 5
}
