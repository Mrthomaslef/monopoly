import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Flame, Coins, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { CaptainAvatar } from './CaptainAvatar';

export const NavalBattleModal: React.FC = () => {
  const navalBattle = useGameStore((s) => s.navalBattle);
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const rollNavalBattleDice = useGameStore((s) => s.rollNavalBattleDice);
  const completeNavalBattle = useGameStore((s) => s.completeNavalBattle);

  if (!navalBattle || !navalBattle.active) return null;

  const attacker = players.find((p) => p.id === navalBattle.attackerId);
  const defender = players.find((p) => p.id === navalBattle.defenderId);
  const tile = tiles[navalBattle.tileIndex];

  if (!attacker || !defender) return null;

  const winner =
    navalBattle.winnerId !== null
      ? players.find((p) => p.id === navalBattle.winnerId)
      : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-x-3 top-[17dvh] z-40 mx-auto max-w-sm pointer-events-auto"
      >
        <div className="wood-panel border-2 border-amber-400 rounded-2xl p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-amber-50">
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-amber-700/60 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-600/90 text-white shadow">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                  Bataille Navale — Abordage !
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  Conflit au large de <strong className="text-amber-100">{tile?.name}</strong>
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
              Enjeu: 150 Or + 1 🪵
            </span>
          </div>

          {/* Combatants Duel Row with Illustrated Portraits */}
          <div className="grid grid-cols-7 items-center gap-2 my-2">
            {/* Attacker Card */}
            <div className="col-span-3 parchment-card rounded-xl p-2 text-center border-2 border-amber-700 flex flex-col items-center">
              <CaptainAvatar
                captainId={attacker.id}
                color={attacker.color}
                size="md"
              />
              <div className="text-xs font-black truncate text-amber-950 mt-1 max-w-full">
                {attacker.name}
              </div>
              <div className="text-[10px] font-bold text-rose-800 uppercase">
                Attaquant
              </div>
              <div className="mt-1 h-9 w-9 mx-auto rounded-lg bg-amber-950 text-amber-200 flex items-center justify-center text-lg font-black border border-amber-500 shadow-inner">
                {navalBattle.attackerRoll ?? '?'}
              </div>
            </div>

            {/* VS Divider */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-rose-400">VS</span>
              <Flame className="w-4 h-4 text-orange-400 animate-pulse mt-0.5" />
            </div>

            {/* Defender Card */}
            <div className="col-span-3 parchment-card rounded-xl p-2 text-center border-2 border-amber-700 flex flex-col items-center">
              <CaptainAvatar
                captainId={defender.id}
                color={defender.color}
                size="md"
              />
              <div className="text-xs font-black truncate text-amber-950 mt-1 max-w-full">
                {defender.name}
              </div>
              <div className="text-[10px] font-bold text-sky-900 uppercase">
                Défenseur
              </div>
              <div className="mt-1 h-9 w-9 mx-auto rounded-lg bg-amber-950 text-amber-200 flex items-center justify-center text-lg font-black border border-amber-500 shadow-inner">
                {navalBattle.defenderRoll ?? '?'}
              </div>
            </div>
          </div>

          {/* Battle Status & Action Button */}
          <div className="mt-3">
            {navalBattle.phase === 'ready' && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={rollNavalBattleDice}
                className="w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 text-white border border-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.65)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Lancer le Dé de Combat &amp; Canonnade !</span>
              </motion.button>
            )}

            {navalBattle.phase === 'firing' && (
              <div className="py-2 text-center text-xs font-bold text-orange-300 flex items-center justify-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>
                  BOULET DE CANON EN VOL ! {winner?.name} ouvre le feu !
                </span>
              </div>
            )}

            {navalBattle.phase === 'resolved' && winner && (
              <div className="space-y-2">
                <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-lg px-3 py-1.5 text-center">
                  <div className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {winner.name} remporte l&apos;abordage (+{navalBattle.plunderAmount} Or &amp; +{navalBattle.materialsLooted ?? 1} Matériau 🪵) !
                    </span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={completeNavalBattle}
                  className="w-full py-2 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border border-amber-200 shadow-lg cursor-pointer"
                >
                  Continuer l&apos;Expédition
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
