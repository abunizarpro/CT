import React from 'react';
import { Wrench, Zap, Shield, Magnet, Gauge, Cpu, Check, X } from 'lucide-react';
import { RigUpgrades, WalletBalances } from '../types/game';
import { sounds } from '../services/audio';

interface RigUpgradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: RigUpgrades;
  balances: WalletBalances;
  onUpgrade: (field: keyof RigUpgrades, cost: number) => boolean;
}

export const RigUpgradesModal: React.FC<RigUpgradesModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  balances,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  const upgradeDefinitions = [
    {
      key: 'laserPower' as keyof RigUpgrades,
      name: 'Stratum Mining Laser',
      desc: 'Increases laser beam thickness, damage, and unlocks dual & triple spread shots.',
      icon: Zap,
      color: 'text-cyan-400',
      baseCost: 25,
    },
    {
      key: 'magnetReach' as keyof RigUpgrades,
      name: 'Quantum Coin Magnet',
      desc: 'Expands the electromagnetic pull radius to vacuum mined tokens from farther away.',
      icon: Magnet,
      color: 'text-emerald-400',
      baseCost: 20,
    },
    {
      key: 'shieldCapacity' as keyof RigUpgrades,
      name: 'Firewall Shield Matrix',
      desc: 'Boosts absorption capacity and accelerates passive energy shield recharge.',
      icon: Shield,
      color: 'text-purple-400',
      baseCost: 30,
    },
    {
      key: 'engineSpeed' as keyof RigUpgrades,
      name: 'Ion Thruster Overdrive',
      desc: 'Improves lateral rig agility and evasion against darting exploit packets.',
      icon: Gauge,
      color: 'text-amber-400',
      baseCost: 15,
    },
    {
      key: 'overclockRate' as keyof RigUpgrades,
      name: 'Stratum ASIC Overclock',
      desc: 'Minimizes laser cooldown delay for higher continuous firing frequency.',
      icon: Cpu,
      color: 'text-rose-400',
      baseCost: 35,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">HashRig MK-IV Hardware Lab</h3>
              <p className="text-xs text-slate-400 font-mono">
                Upgrade mining rig components using liquid Hot Wallet CTC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block uppercase">Hot Liquid CTC</span>
              <span className="text-sm font-bold text-cyan-400 tabular-nums">
                {balances.hot.ctc.toFixed(1)} CTC
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upgrade Cards List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {upgradeDefinitions.map((item) => {
            const currentLevel = upgrades[item.key];
            const isMax = currentLevel >= 5;
            const cost = item.baseCost * currentLevel;
            const canAfford = balances.hot.ctc >= cost;
            const Icon = item.icon;

            return (
              <div 
                key={item.key}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${item.color} mt-0.5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.name}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div 
                            key={lvl}
                            className={`w-2.5 h-2.5 rounded-sm ${
                              lvl <= currentLevel ? 'bg-cyan-400' : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] font-sans leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                  {!isMax ? (
                    <>
                      <span className="text-slate-400 text-[11px]">
                        Cost: <strong className="text-cyan-300 font-bold tabular-nums">{cost} CTC</strong>
                      </span>
                      <button
                        onClick={() => {
                          if (canAfford) {
                            onUpgrade(item.key, cost);
                          } else {
                            sounds.playHurt();
                          }
                        }}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${
                          canAfford
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        UPGRADE
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> MAX LEVEL
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Tip: Withdraw funds from Cold Storage if liquid Hot CTC is insufficient.</span>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
