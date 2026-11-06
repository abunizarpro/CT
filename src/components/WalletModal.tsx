import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Flame, 
  ArrowRightLeft, 
  Layers, 
  Key, 
  Fingerprint, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Coins, 
  Sliders, 
  Activity, 
  Sparkles,
  X,
  FileText,
  Percent
} from 'lucide-react';
import { 
  WalletBalances, 
  SecuritySettings, 
  TransactionRecord, 
  StakedPosition, 
  WhitelistedAddress, 
  CurrencyType 
} from '../types/game';
import { sounds } from '../services/audio';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: WalletBalances;
  security: SecuritySettings;
  staked: StakedPosition[];
  whitelist: WhitelistedAddress[];
  transactions: TransactionRecord[];
  onTransferHotCold: (amount: number, toCold: boolean) => boolean;
  onUpdateSecurity: (newSettings: Partial<SecuritySettings>) => void;
  onAddWhitelistAddress: (label: string, address: string, currency: CurrencyType) => void;
  onRemoveWhitelistAddress: (id: string) => void;
  onStakeCurrency: (currency: 'ctc' | 'btc', amount: number, termDays: number) => boolean;
  onClaimStake: (id: string) => void;
  onDexSwap: (fromCurrency: CurrencyType, toCurrency: CurrencyType, amount: number) => boolean;
  onTriggerSecurityDrill: () => void;
}

type TabType = 'vault' | 'security' | 'staking' | 'swap' | 'ledger';

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  balances,
  security,
  staked,
  whitelist,
  transactions,
  onTransferHotCold,
  onUpdateSecurity,
  onAddWhitelistAddress,
  onRemoveWhitelistAddress,
  onStakeCurrency,
  onClaimStake,
  onDexSwap,
  onTriggerSecurityDrill,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('vault');
  const [transferAmount, setTransferAmount] = useState<string>('50');
  const [transferToCold, setTransferToCold] = useState<boolean>(true);
  const [authPromptOpen, setAuthPromptOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Swap State
  const [swapFrom, setSwapFrom] = useState<CurrencyType>('ctc');
  const [swapTo, setSwapTo] = useState<CurrencyType>('btc');
  const [swapAmount, setSwapAmount] = useState<string>('20');
  const [slippage, setSlippage] = useState<number>(0.5);

  // Staking State
  const [stakeAmount, setStakeAmount] = useState<string>('50');
  const [stakeTerm, setStakeTerm] = useState<number>(0); // 0 = flexible, 30 = locked 30d

  // Whitelist Address Form
  const [newLabel, setNewLabel] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<CurrencyType>('ctc');

  // Seed phrase verification quiz
  const [showSeedQuiz, setShowSeedQuiz] = useState<boolean>(false);
  const [quizWordGuess, setQuizWordGuess] = useState<string>('');
  const [quizWordIndex, setQuizWordIndex] = useState<number>(3);
  const [quizSuccess, setQuizSuccess] = useState<boolean | null>(null);

  // Copy notification
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Selected Transaction for audit detail
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  if (!isOpen) return null;

  // Conversion rates (simulated market values)
  const ctcPriceUsd = 1.85;
  const btcPriceUsd = 88500;
  const ethPriceUsd = 3400;
  const hashValueUsd = 0.05;

  const totalHotUsd = 
    balances.hot.ctc * ctcPriceUsd +
    balances.hot.btc * btcPriceUsd +
    balances.hot.eth * ethPriceUsd +
    balances.hot.hash * hashValueUsd;

  const totalColdUsd = 
    balances.cold.ctc * ctcPriceUsd +
    balances.cold.btc * btcPriceUsd +
    balances.cold.eth * ethPriceUsd;

  const totalPortfolioUsd = totalHotUsd + totalColdUsd;

  // Security score calculation
  let securityScore = 40;
  if (balances.cold.ctc > 0 || balances.cold.btc > 0) securityScore += 15;
  if (security.twoFactorEnabled) securityScore += 15;
  if (security.autoSweepEnabled) securityScore += 10;
  if (security.velocityLimitEnabled) securityScore += 10;
  if (security.seedPhraseBackedUp) securityScore += 10;

  // Handle Transfer Submit with 2FA check
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Check if security 2FA is required for cold withdrawal
    if (!transferToCold && security.twoFactorEnabled) {
      setPendingAction(() => () => {
        onTransferHotCold(amt, false);
      });
      setAuthPromptOpen(true);
      return;
    }

    onTransferHotCold(amt, transferToCold);
  };

  const handleSimulateAuthConfirm = () => {
    sounds.playVaultAuth();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setAuthPromptOpen(false);
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard?.writeText(security.stratumRecoveryKey);
    setCopiedKey(true);
    sounds.playVaultAuth();
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleAddWhitelist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newAddress) return;
    onAddWhitelistAddress(newLabel, newAddress, newCurrency);
    setNewLabel('');
    setNewAddress('');
  };

  const handleVerifySeed = () => {
    const targetWord = security.seedWords[quizWordIndex];
    if (quizWordGuess.trim().toLowerCase() === targetWord.toLowerCase()) {
      setQuizSuccess(true);
      onUpdateSecurity({ seedPhraseBackedUp: true });
      sounds.playCombo();
    } else {
      setQuizSuccess(false);
      sounds.playHurt();
    }
  };

  // Calculate swap output
  const calculateSwapEstimate = () => {
    const amt = parseFloat(swapAmount) || 0;
    if (amt <= 0) return 0;
    const rates: Record<CurrencyType, number> = {
      ctc: ctcPriceUsd,
      btc: btcPriceUsd,
      eth: ethPriceUsd,
      hash: hashValueUsd,
    };
    const fromValUsd = amt * rates[swapFrom];
    const rawToAmt = fromValUsd / rates[swapTo];
    const afterSlippage = rawToAmt * (1 - slippage / 100);
    return afterSlippage;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">CT Pool Quantum Vault</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  SECURE PROTOCOL v4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Cold Storage · Multi-Sig Vaults · Timelocks · In-Game AMM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right font-mono">
              <span className="text-[11px] text-slate-400">TOTAL ESTIMATED ASSETS</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                ${totalPortfolioUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => { setActiveTab('vault'); sounds.playCoin(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'vault'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Vault & Storage
          </button>

          <button
            onClick={() => { setActiveTab('security'); sounds.playCoin(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Security & 2FA
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              securityScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {securityScore}%
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('staking'); sounds.playCoin(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'staking'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Staking Yields
          </button>

          <button
            onClick={() => { setActiveTab('swap'); sounds.playCoin(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'swap'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            DEX Swap
          </button>

          <button
            onClick={() => { setActiveTab('ledger'); sounds.playCoin(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Ledger ({transactions.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: VAULT & STORAGE (HOT VS COLD) */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              {/* Architecture Explanation Banner */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                      Why Cold Storage Matters in Games
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    Hot wallets hold liquid coins used immediately for gameplay upgrades and repairs. Cold storage air-gaps your wealth into a cryptographic multi-sig vault that is mathematically protected against in-game malware attacks, memory exploits, and drainers.
                  </p>
                </div>
                <button
                  onClick={onTriggerSecurityDrill}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Test Malware Drill
                </button>
              </div>

              {/* Hot vs Cold Balance Split Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Hot Wallet Box */}
                <div className="p-5 rounded-xl bg-gradient-to-b from-amber-500/5 to-slate-950 border border-amber-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Flame className="w-4 h-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">HOT WALLET (LIQUID)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Fast Spending · Low Friction
                    </span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">CT Coin (CTC)</span>
                      <span className="text-white font-bold tabular-nums">{balances.hot.ctc.toFixed(2)} CTC</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Bitcoin (BTC)</span>
                      <span className="text-white font-bold tabular-nums">{balances.hot.btc.toFixed(6)} BTC</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Ethereum (ETH)</span>
                      <span className="text-white font-bold tabular-nums">{balances.hot.eth.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Mining Hash Shares</span>
                      <span className="text-white font-bold tabular-nums">{balances.hot.hash.toFixed(0)} HASH</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500">Subtotal Value:</span>
                    <span className="text-amber-400 font-bold tabular-nums">
                      ${totalHotUsd.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Cold Storage Box */}
                <div className="p-5 rounded-xl bg-gradient-to-b from-cyan-500/5 to-slate-950 border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">AIR-GAPPED COLD VAULT</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      100% Exploit Immune
                    </span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">CT Coin (CTC)</span>
                      <span className="text-white font-bold tabular-nums">{balances.cold.ctc.toFixed(2)} CTC</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Bitcoin (BTC)</span>
                      <span className="text-white font-bold tabular-nums">{balances.cold.btc.toFixed(6)} BTC</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Ethereum (ETH)</span>
                      <span className="text-white font-bold tabular-nums">{balances.cold.eth.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Multi-Sig Protocol</span>
                      <span className="text-cyan-400">2-of-3 Hardware Quorum</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500">Secured Reserve Value:</span>
                    <span className="text-cyan-400 font-bold tabular-nums">
                      ${totalColdUsd.toFixed(2)} USD
                    </span>
                  </div>
                </div>

              </div>

              {/* Instant Transfer Between Hot & Cold */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    Internal Liquidity Transfer
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTransferToCold(true)}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                        transferToCold ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Deposit to Cold Vault
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferToCold(false)}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                        !transferToCold ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Withdraw to Hot Wallet
                    </button>
                  </div>
                </div>

                <form onSubmit={handleInitiateTransfer} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[11px] font-mono text-slate-400">
                      AMOUNT TO TRANSFER (CTC)
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="1"
                        max={transferToCold ? balances.hot.ctc : balances.cold.ctc}
                        step="1"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg py-2.5 px-3 text-sm font-mono text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setTransferAmount(
                          (transferToCold ? balances.hot.ctc : balances.cold.ctc).toFixed(0)
                        )}
                        className="absolute right-2.5 top-2 text-[10px] font-mono text-cyan-400 hover:underline uppercase"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                      {transferToCold ? 'LOCK IN COLD VAULT' : 'SIGN COLD WITHDRAWAL'}
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
                  <span>Estimated Network Gas: ~0.00012 CTC</span>
                  <span>·</span>
                  <span>Execution: Instant Simulated Block</span>
                  {!transferToCold && security.twoFactorEnabled && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Fingerprint className="w-3 h-3" /> Biometric / 2FA Confirmation Required
                      </span>
                    </>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SECURITY & PROTECTION POLICIES */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Security Health Score Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Overall Wallet Security Health
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defensive safeguards active to protect mining assets from drainers, keyloggers, and rogue contracts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-xl font-extrabold text-white">{securityScore}%</span>
                    <span className="text-[10px] block text-slate-400 uppercase">
                      {securityScore >= 80 ? 'Fortified' : securityScore >= 60 ? 'Moderate' : 'Vulnerable'}
                    </span>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-slate-900 border-4 border-cyan-400/30 flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
                    {securityScore >= 80 ? 'A+' : 'B'}
                  </div>
                </div>
              </div>

              {/* Policies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Two-Factor Authentication / Passkey */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-cyan-400" />
                        BIOMETRIC / 2FA AUTHENTICATION
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Requires passkey / biometric touch confirmation for cold withdrawals & whitelisting.
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={security.twoFactorEnabled}
                      onChange={(e) => {
                        onUpdateSecurity({ twoFactorEnabled: e.target.checked });
                        sounds.playVaultAuth();
                      }}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-slate-500">Method:</span>
                    <span className="text-cyan-400 font-semibold">WebAuthn / YubiKey Hardware Simulation</span>
                  </div>
                </div>

                {/* 2. Automated Cold Sweep */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-cyan-400" />
                        AUTO-SWEEP THRESHOLD
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Automatically sweeps excess Hot CTC balance into Cold Vault to minimize attack exposure.
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={security.autoSweepEnabled}
                      onChange={(e) => {
                        onUpdateSecurity({ autoSweepEnabled: e.target.checked });
                        sounds.playVaultAuth();
                      }}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-slate-500">Threshold:</span>
                    <input 
                      type="number"
                      value={security.autoSweepThreshold}
                      onChange={(e) => onUpdateSecurity({ autoSweepThreshold: parseInt(e.target.value) || 100 })}
                      className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white"
                    />
                    <span className="text-slate-400">CTC</span>
                  </div>
                </div>

                {/* 3. Outbound Velocity Limiter */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        VELOCITY LIMITER (ANTI-DRAIN)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Limits maximum outbound transfers per rolling hour to throttle unauthorized automated drainage.
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={security.velocityLimitEnabled}
                      onChange={(e) => {
                        onUpdateSecurity({ velocityLimitEnabled: e.target.checked });
                        sounds.playVaultAuth();
                      }}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-slate-500">Hourly Cap:</span>
                    <span className="text-cyan-400 font-bold">{security.velocityLimitPerHour} CTC/hr</span>
                  </div>
                </div>

                {/* 4. Stratum Recovery Key */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-cyan-400" />
                        STRATUM RECOVERY KEY
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cryptographic node key used to recover mining rig workers if disconnected.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-[11px] font-mono">
                    <span className="text-cyan-300 font-semibold">{security.stratumRecoveryKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyRecoveryKey}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedKey ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Seed Phrase Backup Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      12-WORD BIP-39 RECOVERY SEED PHRASE
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your master key. Never share with anyone. Verify backup to achieve maximum security rating.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSeedQuiz(!showSeedQuiz);
                      setQuizWordGuess('');
                      setQuizSuccess(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-400 transition-colors"
                  >
                    {showSeedQuiz ? 'Hide Seed Details' : 'Verify Seed Backup'}
                  </button>
                </div>

                {showSeedQuiz && (
                  <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 font-mono text-xs">
                      {security.seedWords.map((word, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-500 block">#{idx + 1}</span>
                          <span className="text-cyan-300 font-semibold">{word}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <p className="text-xs font-mono text-slate-300">
                        Verification Quiz: Enter word <strong className="text-cyan-400">#{quizWordIndex + 1}</strong> from your phrase:
                      </p>
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="text"
                          placeholder="Type word here..."
                          value={quizWordGuess}
                          onChange={(e) => setQuizWordGuess(e.target.value)}
                          className="bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none flex-1"
                        />
                        <button
                          onClick={handleVerifySeed}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
                        >
                          Verify
                        </button>
                      </div>

                      {quizSuccess === true && (
                        <p className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Seed phrase verified! Security rating boosted.
                        </p>
                      )}
                      {quizSuccess === false && (
                        <p className="text-xs font-mono text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Incorrect word. Please check your phrase and retry.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Whitelisted Addresses Section */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      WHITELISTED PAYOUT ADDRESSES (24H TIMELOCK)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Withdrawals are restricted exclusively to approved addresses. New addresses require a 24h timelock delay to prevent instant theft.
                    </p>
                  </div>
                </div>

                {/* Form to add address */}
                <form onSubmit={handleAddWhitelist} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs font-mono">
                  <div className="sm:col-span-3">
                    <input 
                      type="text"
                      placeholder="Label (e.g. Ledger Cold)"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input 
                      type="text"
                      placeholder="Address (0x... or bc1...)"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full h-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold transition-colors"
                    >
                      + Add Address
                    </button>
                  </div>
                </form>

                {/* List of addresses */}
                <div className="space-y-2">
                  {whitelist.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{item.label}</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded ${
                            item.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.status === 'active' ? 'Active Whitelist' : '24h Timelock Active'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block max-w-sm">
                          {item.address}
                        </span>
                      </div>

                      <button
                        onClick={() => onRemoveWhitelistAddress(item.id)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: STAKING YIELDS */}
          {activeTab === 'staking' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">CT Pool Proof-of-Stake Yield Contracts</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Lock up your mined coins in secure pool staking nodes. Earn passive interest while playing or idle. Locked terms provide boosted APY with timelock safety guarantees.
                  </p>
                </div>
              </div>

              {/* Staking Action Box */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Stake In-Game CTC for Yield
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setStakeTerm(0)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      stakeTerm === 0 
                        ? 'bg-cyan-500/10 border-cyan-400 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-bold">FLEXIBLE POOL</span>
                      <span className="text-sm font-extrabold text-cyan-400">8.5% APY</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Withdraw or compound anytime without lockup penalty.</p>
                  </div>

                  <div 
                    onClick={() => setStakeTerm(30)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      stakeTerm === 30 
                        ? 'bg-purple-500/10 border-purple-400 text-white' 
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-bold">30-DAY TIMELOCKED</span>
                      <span className="text-sm font-extrabold text-purple-400">22.4% APY</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Maximum yield. Principal locked behind cryptographic contract.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input 
                      type="number"
                      min="1"
                      max={balances.hot.ctc}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="Amount to stake (CTC)"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amt = parseFloat(stakeAmount);
                      if (amt > 0) {
                        onStakeCurrency('ctc', amt, stakeTerm);
                      }
                    }}
                    className="py-2.5 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold text-xs font-mono transition-colors shadow-md"
                  >
                    STAKE CTC
                  </button>
                </div>
              </div>

              {/* Active Staked Positions */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Active Staking Nodes ({staked.length})
                </h4>

                {staked.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs font-mono text-slate-500">
                    No active staked positions. Stake your mined coins to earn passive interest!
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {staked.map((pos) => (
                      <div 
                        key={pos.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{pos.amount} CTC</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              {pos.termDays === 0 ? 'Flexible' : '30-Day Lock'}
                            </span>
                            <span className="text-emerald-400 font-semibold">{pos.apy}% APY</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Accumulated Yield: <strong className="text-emerald-400">+{pos.accumulatedReward.toFixed(3)} CTC</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => onClaimStake(pos.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors"
                        >
                          Claim & Unlock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: DEX SWAP (IN-GAME AMM) */}
          {activeTab === 'swap' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    Automated Liquidity Swap
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <span>Slippage:</span>
                    {[0.1, 0.5, 1.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`px-1.5 py-0.5 rounded ${
                          slippage === s ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* From Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>YOU PAY</span>
                    <span>Balance: {balances.hot[swapFrom].toFixed(3)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      className="bg-transparent text-xl font-bold font-mono text-white outline-none flex-1"
                    />
                    <select
                      value={swapFrom}
                      onChange={(e) => setSwapFrom(e.target.value as CurrencyType)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 outline-none"
                    >
                      <option value="ctc">CTC</option>
                      <option value="btc">BTC</option>
                      <option value="eth">ETH</option>
                      <option value="hash">HASH</option>
                    </select>
                  </div>
                </div>

                {/* Flip button */}
                <div className="flex justify-center -my-2 relative z-10">
                  <button
                    onClick={() => {
                      const temp = swapFrom;
                      setSwapFrom(swapTo);
                      setSwapTo(temp);
                    }}
                    className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-colors shadow-lg"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>

                {/* To Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>YOU RECEIVE (EST.)</span>
                    <span>Balance: {balances.hot[swapTo].toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold font-mono text-emerald-400 flex-1 tabular-nums">
                      {calculateSwapEstimate().toFixed(5)}
                    </span>
                    <select
                      value={swapTo}
                      onChange={(e) => setSwapTo(e.target.value as CurrencyType)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 outline-none"
                    >
                      <option value="ctc">CTC</option>
                      <option value="btc">BTC</option>
                      <option value="eth">ETH</option>
                      <option value="hash">HASH</option>
                    </select>
                  </div>
                </div>

                {/* Swap Details */}
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1 text-[11px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Liquidity Provider Fee</span>
                    <span>0.15% (Protocol Burn)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span className="text-emerald-400">&lt; 0.04%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Received</span>
                    <span className="text-white tabular-nums">
                      {(calculateSwapEstimate() * 0.995).toFixed(5)} {swapTo.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const amt = parseFloat(swapAmount);
                    if (amt > 0) {
                      onDexSwap(swapFrom, swapTo, amt);
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs font-mono tracking-wider transition-colors shadow-lg shadow-cyan-500/20"
                >
                  SIGN & EXECUTE SWAP
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ON-CHAIN AUDIT LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Cryptographic Ledger & Stratum Explorer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immutable history of all mined blocks, cold vault sweeps, staking, and swaps.
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  Block Height: #{184209 + transactions.length}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Tx Hash</th>
                      <th className="py-2.5 px-4 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold">Amount</th>
                      <th className="py-2.5 px-4 font-semibold">Confirmations</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.slice(0, 20).map((tx) => (
                      <tr 
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 text-cyan-400 font-semibold truncate max-w-[140px]">
                          {tx.txHash}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">
                          {tx.type.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white tabular-nums">
                          {tx.amount > 0 ? `+${tx.amount.toFixed(4)}` : tx.amount.toFixed(4)} {tx.currency.toUpperCase()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 tabular-nums">
                          {tx.confirmations} Blocks
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.status === 'confirmed' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : tx.status === 'intercepted' 
                              ? 'bg-rose-500/10 text-rose-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Stratum Node: stratum.ctpool.net:3333</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Vault
          </button>
        </div>

        {/* 2FA BIOMETRIC SIMULATION MODAL OVERLAY */}
        {authPromptOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto">
                <Fingerprint className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Authorize High-Value Action</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Touch sensor or enter hardware key to authorize cold withdrawal.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                <span>Passkey Identity: </span>
                <strong className="text-cyan-400">Miner_Node_01 (YubiKey 5 NFC)</strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthPromptOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSimulateAuthConfirm}
                  className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
                >
                  Verify & Sign
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
