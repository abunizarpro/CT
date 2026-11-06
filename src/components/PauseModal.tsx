import React from 'react';
import { Play, RotateCcw, Shield, Volume2, VolumeX, Home } from 'lucide-react';
import { sounds } from '../services/audio';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  onOpenVault: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onQuitToTitle,
  onOpenVault,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-5">
        
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white">MINING RIG PAUSED</h3>
          <p className="text-xs text-slate-400 font-mono">Stratum simulation suspended</p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onResume();
              sounds.playLaser();
            }}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME (ESC / SPACE)</span>
          </button>

          <button
            onClick={() => {
              onOpenVault();
              sounds.playVaultAuth();
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold font-mono text-xs transition-colors flex items-center justify-center gap-2 border border-cyan-500/30"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>MANAGE SECURE VAULT</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onRestart();
                sounds.playCoin();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            <button
              onClick={() => {
                onQuitToTitle();
                sounds.playCoin();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Title</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Audio:</span>
          <button
            onClick={onToggleMute}
            className="flex items-center gap-1.5 text-cyan-400 hover:underline"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {isMuted ? 'Muted' : 'Sound Active'}
          </button>
        </div>

      </div>
    </div>
  );
};
