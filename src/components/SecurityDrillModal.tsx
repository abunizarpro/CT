import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle2, Lock, Flame, Fingerprint, Activity, X } from 'lucide-react';
import { SecuritySettings, WalletBalances } from '../types/game';
import { sounds } from '../services/audio';

interface SecurityDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  security: SecuritySettings;
  balances: WalletBalances;
  onLogSecurityEvent: (details: string) => void;
}

export const SecurityDrillModal: React.FC<SecurityDrillModalProps> = ({
  isOpen,
  onClose,
  security,
  balances,
  onLogSecurityEvent,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [drillCompleted, setDrillCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDrillCompleted(false);
      sounds.playSecurityAlert();

      const timer1 = setTimeout(() => {
        setCurrentStep(2);
        sounds.playShield();
      }, 1400);

      const timer2 = setTimeout(() => {
        setCurrentStep(3);
        sounds.playVaultAuth();
      }, 2800);

      const timer3 = setTimeout(() => {
        setCurrentStep(4);
        setDrillCompleted(true);
        sounds.playCombo();
        onLogSecurityEvent('Simulated Malware Drainer blocked by Cold Vault & 2FA Quorum');
      }, 4200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-400">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              LIVE SECURITY DRILL: MALWARE EXPLOIT SIMULATION
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps display */}
        <div className="space-y-4">
          
          {/* Step 1: Drainer attempt */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            currentStep >= 1 ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-950 border-slate-800 opacity-40'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-rose-300">
                  STEP 1: Unauthorized In-Game Drain Attack Initiated
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A rogue mod or phishing exploit attempts to sweep 500 CTC out of your active session.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Cold Vault Defense */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            currentStep >= 2 ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950 border-slate-800 opacity-40'
          }`}>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  STEP 2: Cold Storage Defense Engaged
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your <strong className="text-cyan-400">{balances.cold.ctc.toFixed(1)} CTC</strong> stored in Cold Vault is completely air-gapped. Memory attacks cannot reach offline private keys!
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Velocity & 2FA Block */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            currentStep >= 3 ? 'bg-purple-500/10 border-purple-500/40' : 'bg-slate-950 border-slate-800 opacity-40'
          }`}>
            <div className="flex items-start gap-3">
              <Fingerprint className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-purple-300">
                  STEP 3: Velocity Limiter & 2FA Biometric Challenge
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The protocol flags anomalous velocity. Transaction is challenged for WebAuthn passkey confirmation. Attacker fails the challenge!
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Intercept Result */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            currentStep >= 4 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800 opacity-40'
          }`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-emerald-300">
                  STEP 4: Attack Neutralized & Funds Preserved
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  0 CTC lost. Incident cryptographic fingerprint logged to audit trail. Your in-game currencies remain 100% secure!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            disabled={!drillCompleted}
            className={`w-full py-3 rounded-xl font-bold font-mono text-xs tracking-wider transition-all ${
              drillCompleted 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {drillCompleted ? 'DRILL PASSED - RETURN TO VAULT' : 'SIMULATING THREAT MITIGATION...'}
          </button>
        </div>

      </div>
    </div>
  );
};
