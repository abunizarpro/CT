import React from 'react';
import { Trophy, Shield, RefreshCw, Layers, ArrowRight, Zap, Flame, Lock } from 'lucide-react';
import { MinedRunStats } from '../types/game';

interface RoundSummaryModalProps {
  isOpen: boolean;
  isVictory: boolean;
  stats: MinedRunStats;
  onPlayAgain: () => void;
  onOpenVault: () => void;
  onDepositAllToCold: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  isVictory,
  stats,
  onPlayAgain,
  onOpenVault,
  onDepositAllToCold,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        
        {/* Glowing badge */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-lg ${
          isVictory 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20' 
            : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-cyan-500/20'
        }`}>
          {isVictory ? <Trophy className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
        </div>

        {/* Title Lockup */}
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white">
            {isVictory ? 'Block Solved & Consensus Reached!' : 'Stratum Mining Run Complete'}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            HashRig MK-IV Telemetry & Mined Currencies
          </p>
        </div>

        {/* Score & Mined Currency Grid */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>FINAL RUN SCORE:</span>
            <span className="text-white font-extrabold text-base tabular-nums">{stats.score}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>PEAK HASHRATE:</span>
            <span className="text-cyan-400 font-bold tabular-nums">{stats.peakHashrate.toFixed(1)} TH/s</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>BLOCKS CRACKED:</span>
            <span className="text-slate-200 font-bold tabular-nums">{stats.blocksCracked} Blocks</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>THREATS MITIGATED:</span>
            <span className="text-slate-200 font-bold tabular-nums">{stats.threatsNeutralized}</span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider text-left">
              Mined Currency Payout:
            </div>
            <div className="flex justify-between items-center text-cyan-300 font-bold">
              <span>CT Coins (CTC):</span>
              <span className="tabular-nums">+{stats.ctc.toFixed(2)} CTC</span>
            </div>
            {stats.btc > 0 && (
              <div className="flex justify-between items-center text-amber-400 font-bold">
                <span>Bitcoin Satoshis:</span>
                <span className="tabular-nums">+{stats.btc.toFixed(6)} BTC</span>
              </div>
            )}
            {stats.eth > 0 && (
              <div className="flex justify-between items-center text-purple-400 font-bold">
                <span>Ethereum Ether:</span>
                <span className="tabular-nums">+{stats.eth.toFixed(4)} ETH</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-slate-950 font-bold font-mono text-xs tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>PLAY AGAIN (ENTER)</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onOpenVault}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold font-mono text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>MANAGE VAULT</span>
            </button>

            <button
              onClick={onDepositAllToCold}
              className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs transition-colors flex items-center justify-center gap-1.5"
              title="Quick Sweep to Cold Vault"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Cold Sweep</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
