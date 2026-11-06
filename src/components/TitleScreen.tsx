import React from 'react';
import { Play, Shield, Wrench, Volume2, VolumeX, Sparkles, Zap, Lock } from 'lucide-react';
import { WalletBalances, RigUpgrades } from '../types/game';
import { sounds } from '../services/audio';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenWallet: () => void;
  onOpenUpgrades: () => void;
  balances: WalletBalances;
  upgrades: RigUpgrades;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenWallet,
  onOpenUpgrades,
  balances,
  upgrades,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden cyber-grid">
      
      {/* Ambient glowing radial orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Controls (World-matched, clean) */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-sm font-mono">
              CT
            </div>
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-wider text-white">CT POOL ARCADE</span>
            <span className="text-[10px] text-cyan-400 block font-mono -mt-1 tracking-widest">STRATUM PROTOCOL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Mute Toggle */}
          <button
            onClick={() => {
              onToggleMute();
              sounds.playCoin();
            }}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Quick Wallet Pill */}
          <button
            onClick={() => {
              onOpenWallet();
              sounds.playVaultAuth();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-all hover:bg-slate-800"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold tabular-nums">
              {(balances.hot.ctc + balances.cold.ctc).toFixed(1)} CTC
            </span>
          </button>
        </div>
      </div>

      {/* Hero Centerpiece with Bespoke Inline SVG Title Lockup */}
      <div className="my-auto text-center flex flex-col items-center max-w-2xl z-10 space-y-6">
        
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="relative group cursor-pointer" onClick={onStartGame}>
          <svg className="w-72 sm:w-96 h-28 mx-auto filter drop-shadow-[0_0_20px_rgba(0,240,255,0.35)]" viewBox="0 0 420 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="60%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Hexagonal Shield Core */}
            <polygon points="210,12 245,32 245,72 210,92 175,72 175,32" stroke="url(#cyberGrad)" strokeWidth="2.5" fill="url(#shieldGrad)" />
            <polygon points="210,24 235,38 235,66 210,80 185,66 185,38" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            <circle cx="210" cy="52" r="8" fill="#00f0ff" />

            {/* Glowing Title Typography */}
            <text x="210" y="58" textAnchor="middle" fill="#ffffff" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="32" letterSpacing="6">
              CT POOL
            </text>
            <text x="210" y="85" textAnchor="middle" fill="#00f0ff" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="13" letterSpacing="8">
              HASHRATE DEFENDER
            </text>
          </svg>
        </div>

        {/* Tagline */}
        <p className="text-slate-300 text-xs sm:text-sm font-mono max-w-lg leading-relaxed">
          Pilot the HashRig MK-IV through the Quantum Stratum Blockstream. Mine real crypto coins, neutralize 51% exploit attacks, and secure your earnings in the Enterprise Cold Storage Vault.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-2">
          <button
            onClick={() => {
              onStartGame();
              sounds.playLaser();
            }}
            className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-slate-950 font-extrabold text-xs sm:text-sm font-mono tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 group"
          >
            <Play className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
            <span>START MINING RUN</span>
          </button>

          <button
            onClick={() => {
              onOpenWallet();
              sounds.playVaultAuth();
            }}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>OPEN VAULT</span>
          </button>

          <button
            onClick={() => {
              onOpenUpgrades();
              sounds.playCoin();
            }}
            className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2"
            title="Rig Hardware Upgrades"
          >
            <Wrench className="w-4 h-4" />
            <span className="sm:hidden">UPGRADES</span>
          </button>
        </div>

        {/* Flat control-hint line as required by guidelines */}
        <div className="text-[11px] font-mono text-slate-400 pt-3">
          <span>WASD / Arrows Move</span>
          <span className="mx-2 text-slate-600">·</span>
          <span>Space / Click Fire & Mine</span>
          <span className="mx-2 text-slate-600">·</span>
          <span>V Open Vault</span>
          <span className="mx-2 text-slate-600">·</span>
          <span>Esc Pause</span>
        </div>

      </div>

      {/* Bottom Status Ribbon */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500 pt-4 border-t border-slate-900 z-10">
        <div className="flex items-center gap-4">
          <span>HIGH SCORE: <strong className="text-white tabular-nums">{highScore}</strong></span>
          <span>·</span>
          <span>COLD STORAGE: <strong className="text-cyan-400 tabular-nums">{balances.cold.ctc.toFixed(1)} CTC</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Air-Gapped Multi-Sig Protocol Active</span>
        </div>
      </div>

    </div>
  );
};
