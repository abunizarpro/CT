import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  WalletBalances, 
  SecuritySettings, 
  TransactionRecord, 
  StakedPosition, 
  WhitelistedAddress, 
  MinedRunStats, 
  RigUpgrades, 
  CurrencyType 
} from './types/game';
import { GameEngine } from './game/GameEngine';
import { sounds } from './services/audio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { WalletModal } from './components/WalletModal';
import { SecurityDrillModal } from './components/SecurityDrillModal';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { PauseModal } from './components/PauseModal';
import { RigUpgradesModal } from './components/RigUpgradesModal';

export default function App() {
  // Game State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [isDrillOpen, setIsDrillOpen] = useState<boolean>(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // High Score & Stats
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('ctpool_highscore') || '4200', 10);
  });

  // Player in-game vitals (for HUD display)
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(100);
  const [playerShield, setPlayerShield] = useState<number>(50);
  const [playerMaxShield, setPlayerMaxShield] = useState<number>(50);
  const [playerCombo, setPlayerCombo] = useState<number>(1);

  // Current run stats
  const [currentRunStats, setCurrentRunStats] = useState<MinedRunStats>({
    ctc: 0,
    btc: 0,
    eth: 0,
    hash: 0,
    score: 0,
    blocksCracked: 0,
    threatsNeutralized: 0,
    peakHashrate: 112.5,
    durationSeconds: 0,
  });

  // Rig Hardware Upgrades
  const [upgrades, setUpgrades] = useState<RigUpgrades>({
    laserPower: 1,
    magnetReach: 1,
    shieldCapacity: 1,
    engineSpeed: 1,
    overclockRate: 1,
  });

  // Wallet Balances (Hot vs Cold Storage)
  const [balances, setBalances] = useState<WalletBalances>({
    hot: {
      ctc: 75.0,
      btc: 0.00035,
      eth: 0.0065,
      hash: 58.0,
    },
    cold: {
      ctc: 320.0,
      btc: 0.0048,
      eth: 0.085,
    },
  });

  // Security Settings
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: true,
    twoFactorMethod: 'biometric',
    autoSweepEnabled: true,
    autoSweepThreshold: 150,
    velocityLimitEnabled: true,
    velocityLimitPerHour: 200,
    recentHourlyOutbound: 0,
    multisigEnabled: true,
    seedPhraseBackedUp: false,
    seedWords: [
      'quantum', 'stratum', 'cipher', 'matrix', 
      'hashrate', 'entropy', 'vault', 'genesis', 
      'blockchain', 'nonce', 'sharding', 'validator'
    ],
    stratumRecoveryKey: 'CT-98A4-X72Q-POOL-REC',
  });

  // Staked Positions
  const [staked, setStaked] = useState<StakedPosition[]>([
    {
      id: 'stake_01',
      currency: 'ctc',
      amount: 100,
      apy: 22.4,
      termDays: 30,
      startDate: Date.now() - 86400000 * 3,
      unlockDate: Date.now() + 86400000 * 27,
      accumulatedReward: 1.84,
    },
  ]);

  // Whitelisted Payout Addresses
  const [whitelist, setWhitelist] = useState<WhitelistedAddress[]>([
    {
      id: 'wl_01',
      label: 'Cold Ledger Hardware (BIP-84)',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      currency: 'btc',
      addedAt: Date.now() - 86400000 * 10,
      status: 'active',
      unlocksAt: Date.now() - 86400000 * 9,
    },
  ]);

  // Cryptographic Ledger History
  const [transactions, setTransactions] = useState<TransactionRecord[]>([
    {
      id: 'tx_init_1',
      txHash: '0x8f4c...9a21',
      type: 'SWEEP_COLD',
      amount: 200,
      currency: 'ctc',
      from: 'Hot Gaming Balance',
      to: 'Air-Gapped Vault 0x0',
      timestamp: Date.now() - 3600000 * 2,
      blockHeight: 184201,
      confirmations: 128,
      status: 'confirmed',
      gasFee: 0.0001,
    },
    {
      id: 'tx_init_2',
      txHash: '0x3a7e...e412',
      type: 'MINED_REWARD',
      amount: 45.5,
      currency: 'ctc',
      from: 'CT Pool Stratum Node',
      to: 'Hot Gaming Balance',
      timestamp: Date.now() - 3600000 * 5,
      blockHeight: 184196,
      confirmations: 340,
      status: 'confirmed',
      gasFee: 0.00005,
    },
  ]);

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Canvas Ref & GameEngine Instance
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Staking compound ticker (simulates real-time interest accumulation)
  useEffect(() => {
    const timer = setInterval(() => {
      setStaked((prev) =>
        prev.map((pos) => {
          const rewardPerSec = (pos.amount * (pos.apy / 100)) / (365 * 86400);
          return {
            ...pos,
            accumulatedReward: pos.accumulatedReward + rewardPerSec * 3,
          };
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Sweep Rule Execution (sweeps hot CTC over threshold into cold vault)
  useEffect(() => {
    if (security.autoSweepEnabled && balances.hot.ctc > security.autoSweepThreshold) {
      const excess = Math.floor(balances.hot.ctc - (security.autoSweepThreshold - 30));
      if (excess > 0) {
        setBalances((prev) => ({
          ...prev,
          hot: { ...prev.hot, ctc: prev.hot.ctc - excess },
          cold: { ...prev.cold, ctc: prev.cold.ctc + excess },
        }));

        const newTx: TransactionRecord = {
          id: `tx_sweep_${Date.now()}`,
          txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
          type: 'SWEEP_COLD',
          amount: excess,
          currency: 'ctc',
          from: 'Hot Gaming Wallet',
          to: 'Air-Gapped Cold Vault',
          timestamp: Date.now(),
          blockHeight: 184210 + transactions.length,
          confirmations: 1,
          status: 'confirmed',
          gasFee: 0.0001,
          note: 'Automated Security Rule Triggered',
        };

        setTransactions((prev) => [newTx, ...prev]);
        showToast(`🔒 Auto-Sweep Rule Triggered: ${excess} CTC secured in Cold Vault!`);
      }
    }
  }, [balances.hot.ctc, security.autoSweepEnabled, security.autoSweepThreshold, showToast, transactions.length]);

  // Game Engine Callbacks
  const handleStatsUpdate = useCallback((stats: MinedRunStats) => {
    setCurrentRunStats(stats);
  }, []);

  const handleHealthChange = useCallback((hp: number, maxHp: number, shield: number) => {
    setPlayerHp(hp);
    setPlayerMaxHp(maxHp);
    setPlayerShield(shield);
  }, []);

  const handleComboChange = useCallback((combo: number) => {
    setPlayerCombo(combo);
  }, []);

  const handleGameOver = useCallback((finalStats: MinedRunStats) => {
    setGameState('ROUND_SUMMARY');
    sounds.playExplosion(true);

    // Deposit mined coins into Hot Gaming Wallet
    setBalances((prev) => ({
      ...prev,
      hot: {
        ctc: prev.hot.ctc + finalStats.ctc,
        btc: prev.hot.btc + finalStats.btc,
        eth: prev.hot.eth + finalStats.eth,
        hash: prev.hot.hash + finalStats.hash,
      },
    }));

    // Update High Score
    if (finalStats.score > highScore) {
      setHighScore(finalStats.score);
      localStorage.setItem('ctpool_highscore', finalStats.score.toString());
    }

    // Record Mined Reward in Audit Ledger
    if (finalStats.ctc > 0 || finalStats.btc > 0) {
      const newTx: TransactionRecord = {
        id: `tx_mine_${Date.now()}`,
        txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
        type: 'MINED_REWARD',
        amount: finalStats.ctc,
        currency: 'ctc',
        from: 'Stratum Hash Block #184209',
        to: 'Hot Gaming Balance',
        timestamp: Date.now(),
        blockHeight: 184209,
        confirmations: 1,
        status: 'confirmed',
        gasFee: 0.00008,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  }, [highScore]);

  // Start a new game run
  const startGame = useCallback(() => {
    setGameState('PLAYING');
    setCurrentRunStats({
      ctc: 0,
      btc: 0,
      eth: 0,
      hash: 0,
      score: 0,
      blocksCracked: 0,
      threatsNeutralized: 0,
      peakHashrate: 110.0,
      durationSeconds: 0,
    });

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    if (canvasRef.current) {
      engineRef.current = new GameEngine(canvasRef.current, upgrades, {
        onStatsUpdate: handleStatsUpdate,
        onGameOver: handleGameOver,
        onHealthChange: handleHealthChange,
        onComboChange: handleComboChange,
      });
      engineRef.current.start();
    }
  }, [upgrades, handleStatsUpdate, handleGameOver, handleHealthChange, handleComboChange]);

  // Window resize handler for canvas
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resizeCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Pause with Escape
      if (e.code === 'Escape') {
        if (gameState === 'PLAYING') {
          if (engineRef.current) engineRef.current.pause();
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          if (engineRef.current) engineRef.current.resume();
          setGameState('PLAYING');
        }
      }

      // Open Vault with 'KeyV'
      if (e.code === 'KeyV' && !isWalletOpen && !isDrillOpen && !isUpgradesOpen) {
        if (gameState === 'PLAYING' && engineRef.current) {
          engineRef.current.pause();
          setGameState('PAUSED');
        }
        setIsWalletOpen(true);
        sounds.playVaultAuth();
      }

      // Space or Enter on Title Screen to start
      if (gameState === 'TITLE' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, isWalletOpen, isDrillOpen, isUpgradesOpen, startGame]);

  // Wallet Management Operations
  const handleTransferHotCold = (amount: number, toCold: boolean): boolean => {
    if (toCold) {
      if (balances.hot.ctc < amount) {
        showToast('Insufficient liquid CTC in Hot Wallet!');
        sounds.playHurt();
        return false;
      }

      setBalances((prev) => ({
        ...prev,
        hot: { ...prev.hot, ctc: prev.hot.ctc - amount },
        cold: { ...prev.cold, ctc: prev.cold.ctc + amount },
      }));

      sounds.playVaultAuth();
      showToast(`Deposited ${amount} CTC into Air-Gapped Cold Vault!`);
    } else {
      // Check velocity limit
      if (security.velocityLimitEnabled && amount > security.velocityLimitPerHour) {
        showToast(`Transfer exceeds hourly velocity cap (${security.velocityLimitPerHour} CTC)!`);
        sounds.playHurt();
        return false;
      }

      if (balances.cold.ctc < amount) {
        showToast('Insufficient balance in Cold Storage!');
        sounds.playHurt();
        return false;
      }

      setBalances((prev) => ({
        ...prev,
        cold: { ...prev.cold, ctc: prev.cold.ctc - amount },
        hot: { ...prev.hot, ctc: prev.hot.ctc + amount },
      }));

      sounds.playVaultAuth();
      showToast(`Withdrew ${amount} CTC to liquid Hot Wallet.`);
    }

    // Record Transaction
    const newTx: TransactionRecord = {
      id: `tx_transfer_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      type: toCold ? 'SWEEP_COLD' : 'TRANSFER_HOT',
      amount,
      currency: 'ctc',
      from: toCold ? 'Hot Gaming Balance' : 'Air-Gapped Vault',
      to: toCold ? 'Air-Gapped Vault' : 'Hot Gaming Balance',
      timestamp: Date.now(),
      blockHeight: 184215 + transactions.length,
      confirmations: 2,
      status: 'confirmed',
      gasFee: 0.00012,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return true;
  };

  const handleUpdateSecurity = (newSettings: Partial<SecuritySettings>) => {
    setSecurity((prev) => ({ ...prev, ...newSettings }));
    showToast('Wallet security policies updated.');
  };

  const handleAddWhitelistAddress = (label: string, address: string, currency: CurrencyType) => {
    const newItem: WhitelistedAddress = {
      id: `wl_${Date.now()}`,
      label,
      address,
      currency,
      addedAt: Date.now(),
      status: 'timelock_pending',
      unlocksAt: Date.now() + 86400000, // 24-hour timelock
    };

    setWhitelist((prev) => [newItem, ...prev]);
    sounds.playVaultAuth();
    showToast('New address added! 24-Hour Security Timelock activated.');
  };

  const handleRemoveWhitelistAddress = (id: string) => {
    setWhitelist((prev) => prev.filter((item) => item.id !== id));
    showToast('Whitelist address revoked.');
  };

  const handleStakeCurrency = (currency: 'ctc' | 'btc', amount: number, termDays: number): boolean => {
    if (balances.hot.ctc < amount) {
      showToast('Insufficient CTC balance to stake!');
      sounds.playHurt();
      return false;
    }

    setBalances((prev) => ({
      ...prev,
      hot: { ...prev.hot, ctc: prev.hot.ctc - amount },
    }));

    const apy = termDays === 30 ? 22.4 : 8.5;
    const newStake: StakedPosition = {
      id: `stake_${Date.now()}`,
      currency,
      amount,
      apy,
      termDays,
      startDate: Date.now(),
      unlockDate: termDays === 0 ? Date.now() : Date.now() + termDays * 86400000,
      accumulatedReward: 0,
    };

    setStaked((prev) => [newStake, ...prev]);
    sounds.playCombo();
    showToast(`Staked ${amount} CTC at ${apy}% APY!`);

    const newTx: TransactionRecord = {
      id: `tx_stake_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      type: 'STAKE_LOCK',
      amount,
      currency: 'ctc',
      from: 'Hot Gaming Balance',
      to: 'CT Pool PoS Node #04',
      timestamp: Date.now(),
      blockHeight: 184218 + transactions.length,
      confirmations: 1,
      status: 'confirmed',
      gasFee: 0.00015,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return true;
  };

  const handleClaimStake = (id: string) => {
    const target = staked.find((s) => s.id === id);
    if (!target) return;

    const totalReturn = target.amount + target.accumulatedReward;
    setBalances((prev) => ({
      ...prev,
      hot: { ...prev.hot, ctc: prev.hot.ctc + totalReturn },
    }));

    setStaked((prev) => prev.filter((s) => s.id !== id));
    sounds.playCoin();
    showToast(`Unlocked ${totalReturn.toFixed(2)} CTC (+${target.accumulatedReward.toFixed(2)} Yield)!`);

    const newTx: TransactionRecord = {
      id: `tx_claim_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      type: 'CLAIM_STAKE',
      amount: totalReturn,
      currency: 'ctc',
      from: 'CT Pool PoS Node #04',
      to: 'Hot Gaming Balance',
      timestamp: Date.now(),
      blockHeight: 184220 + transactions.length,
      confirmations: 1,
      status: 'confirmed',
      gasFee: 0.0001,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDexSwap = (fromCurrency: CurrencyType, toCurrency: CurrencyType, amount: number): boolean => {
    if (balances.hot[fromCurrency] < amount) {
      showToast(`Insufficient ${fromCurrency.toUpperCase()} balance!`);
      sounds.playHurt();
      return false;
    }

    const rates: Record<CurrencyType, number> = {
      ctc: 1.85,
      btc: 88500,
      eth: 3400,
      hash: 0.05,
    };

    const fromValUsd = amount * rates[fromCurrency];
    const toAmt = (fromValUsd / rates[toCurrency]) * 0.995; // 0.5% slippage

    setBalances((prev) => ({
      ...prev,
      hot: {
        ...prev.hot,
        [fromCurrency]: prev.hot[fromCurrency] - amount,
        [toCurrency]: prev.hot[toCurrency] + toAmt,
      },
    }));

    sounds.playCoin();
    showToast(`Swapped ${amount} ${fromCurrency.toUpperCase()} for ${toAmt.toFixed(4)} ${toCurrency.toUpperCase()}!`);

    const newTx: TransactionRecord = {
      id: `tx_swap_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      type: 'DEX_SWAP',
      amount,
      currency: fromCurrency,
      from: `Hot ${fromCurrency.toUpperCase()}`,
      to: `Hot ${toCurrency.toUpperCase()}`,
      timestamp: Date.now(),
      blockHeight: 184222 + transactions.length,
      confirmations: 1,
      status: 'confirmed',
      gasFee: 0.0002,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return true;
  };

  const handleUpgradeRig = (field: keyof RigUpgrades, cost: number): boolean => {
    if (balances.hot.ctc < cost) {
      showToast('Insufficient liquid CTC in Hot Wallet!');
      sounds.playHurt();
      return false;
    }

    setBalances((prev) => ({
      ...prev,
      hot: { ...prev.hot, ctc: prev.hot.ctc - cost },
    }));

    setUpgrades((prev) => ({
      ...prev,
      [field]: prev[field] + 1,
    }));

    sounds.playCombo();
    showToast(`Upgraded ${String(field)} to Level ${upgrades[field] + 1}!`);

    const newTx: TransactionRecord = {
      id: `tx_upgrade_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      type: 'UPGRADE_PURCHASE',
      amount: cost,
      currency: 'ctc',
      from: 'Hot Gaming Balance',
      to: 'Mining Hardware Vendor',
      timestamp: Date.now(),
      blockHeight: 184225 + transactions.length,
      confirmations: 6,
      status: 'confirmed',
      gasFee: 0.00005,
    };
    setTransactions((prev) => [newTx, ...prev]);

    return true;
  };

  const handleDepositAllToCold = () => {
    const amt = Math.floor(balances.hot.ctc);
    if (amt > 0) {
      handleTransferHotCold(amt, true);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      
      {/* 60fps Isolated Canvas Viewport */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block touch-none cursor-crosshair"
      />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 z-30">
          <TitleScreen
            onStartGame={startGame}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenUpgrades={() => setIsUpgradesOpen(true)}
            balances={balances}
            upgrades={upgrades}
            highScore={highScore}
            isMuted={isMuted}
            onToggleMute={() => {
              const muted = sounds.toggleMute();
              setIsMuted(muted);
            }}
          />
        </div>
      )}

      {/* World-Matched Low-Occlusion HUD during Playing */}
      {gameState === 'PLAYING' && (
        <GameHUD
          hp={playerHp}
          maxHp={playerMaxHp}
          shield={playerShield}
          maxShield={playerMaxShield}
          combo={playerCombo}
          runStats={currentRunStats}
          isMuted={isMuted}
          onToggleMute={() => {
            const muted = sounds.toggleMute();
            setIsMuted(muted);
          }}
          onPause={() => {
            if (engineRef.current) engineRef.current.pause();
            setGameState('PAUSED');
          }}
          onOpenVault={() => {
            if (engineRef.current) engineRef.current.pause();
            setGameState('PAUSED');
            setIsWalletOpen(true);
            sounds.playVaultAuth();
          }}
        />
      )}

      {/* Pause Modal */}
      <PauseModal
        isOpen={gameState === 'PAUSED' && !isWalletOpen && !isDrillOpen && !isUpgradesOpen}
        onResume={() => {
          if (engineRef.current) engineRef.current.resume();
          setGameState('PLAYING');
        }}
        onRestart={startGame}
        onQuitToTitle={() => {
          if (engineRef.current) engineRef.current.stop();
          setGameState('TITLE');
        }}
        onOpenVault={() => setIsWalletOpen(true)}
        isMuted={isMuted}
        onToggleMute={() => {
          const muted = sounds.toggleMute();
          setIsMuted(muted);
        }}
      />

      {/* Round Summary Modal */}
      <RoundSummaryModal
        isOpen={gameState === 'ROUND_SUMMARY'}
        isVictory={currentRunStats.threatsNeutralized >= 10 || currentRunStats.score >= 1000}
        stats={currentRunStats}
        onPlayAgain={startGame}
        onOpenVault={() => setIsWalletOpen(true)}
        onDepositAllToCold={handleDepositAllToCold}
      />

      {/* Secure Game Wallet & Storage Manager Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balances={balances}
        security={security}
        staked={staked}
        whitelist={whitelist}
        transactions={transactions}
        onTransferHotCold={handleTransferHotCold}
        onUpdateSecurity={handleUpdateSecurity}
        onAddWhitelistAddress={handleAddWhitelistAddress}
        onRemoveWhitelistAddress={handleRemoveWhitelistAddress}
        onStakeCurrency={handleStakeCurrency}
        onClaimStake={handleClaimStake}
        onDexSwap={handleDexSwap}
        onTriggerSecurityDrill={() => setIsDrillOpen(true)}
      />

      {/* Interactive Threat & Malware Drill Simulation */}
      <SecurityDrillModal
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        security={security}
        balances={balances}
        onLogSecurityEvent={(detail) => {
          const newTx: TransactionRecord = {
            id: `tx_drill_${Date.now()}`,
            txHash: `0x${Math.random().toString(16).substring(2, 10)}...sec`,
            type: 'SECURITY_INTERCEPT',
            amount: 0,
            currency: 'ctc',
            from: 'Malware Exploit Probe',
            to: 'Blocked by Cold Vault & 2FA',
            timestamp: Date.now(),
            blockHeight: 184230 + transactions.length,
            confirmations: 1,
            status: 'intercepted',
            gasFee: 0,
            note: detail,
          };
          setTransactions((prev) => [newTx, ...prev]);
        }}
      />

      {/* Mining Rig Hardware Upgrades Modal */}
      <RigUpgradesModal
        isOpen={isUpgradesOpen}
        onClose={() => setIsUpgradesOpen(false)}
        upgrades={upgrades}
        balances={balances}
        onUpgrade={handleUpgradeRig}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-cyan-400/50 text-cyan-300 px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-fade-in pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
