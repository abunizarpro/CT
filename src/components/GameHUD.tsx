import React from 'react';
import { Shield, Zap, Pause, Volume2, VolumeX, Flame, Lock } from 'lucide-react';
import { MinedRunStats } from '../types/game';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  combo: number;
  runStats: MinedRunStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenVault: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  shield,
  maxShield,
  combo,
  runStats,
  isMuted,
  onToggleMute,
  onPause,
  onOpenVault,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const shieldPct = Math.max(0, Math.min(100, (shield / maxShield) * 100));

  return (
    // Low-occlusion perimeter HUD (wrapper has pointer-events: none)
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none z-20">
      
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between w-full">
        
        {/* Left: Hull & Shield Status */}
        <div className="space-y-2 pointer-events-auto bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> HULL INTEGRITY
            </span>
            <span className="text-white font-bold tabular-nums">
              {Math.round(hp)}/{maxHp}
            </span>
          </div>
          {/* Hull Bar */}
          <div className="w-36 sm:w-48 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full transition-all duration-200 ${
                hpPct > 50 ? 'bg-cyan-400' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 text-xs pt-0.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> FIREWALL SHIELD
            </span>
            <span className="text-purple-300 font-bold tabular-nums">
              {Math.round(shield)}/{maxShield}
            </span>
          </div>
          {/* Shield Bar */}
          <div className="w-36 sm:w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-purple-400 transition-all duration-200"
              style={{ width: `${shieldPct}%` }}
            />
          </div>
        </div>

        {/* Right: Hashrate Speedometer & Run Yields */}
        <div className="space-y-1.5 pointer-events-auto bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-right font-mono">
          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-slate-400">EST. HASHRATE:</span>
            <span className="text-cyan-400 font-bold tabular-nums text-sm">
              {runStats.peakHashrate.toFixed(1)} TH/s
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 text-xs">
            <span className="text-slate-400">SCORE:</span>
            <span className="text-white font-extrabold tabular-nums text-base">
              {runStats.score}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-cyan-300 font-bold tabular-nums">
              +{runStats.ctc.toFixed(1)} CTC
            </span>
            {runStats.btc > 0 && (
              <span className="text-amber-400 font-bold tabular-nums">
                +{runStats.btc.toFixed(5)} BTC
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Perimeter Cluster */}
      <div className="flex items-end justify-between w-full">
        
        {/* Left: Combo Multiplier Indicator */}
        <div className="pointer-events-none">
          {combo > 1 && (
            <div className="bg-slate-950/80 border border-cyan-400/40 rounded-xl px-3 py-2 font-mono flex items-center gap-2 transform animate-bounce">
              <Flame className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-cyan-400">
                  {combo}X HASHRATE COMBO!
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">
                  Mining Yield Multiplier Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Interactive Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Vault Trigger */}
          <button
            onClick={onOpenVault}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition-all hover:bg-slate-800 shadow-lg"
            title="Open Vault (V)"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">VAULT [V]</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
