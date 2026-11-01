import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Flame, Coins, ShieldAlert, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
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

  const isResolved = navalBattle.phase === 'resolved';
  const isFiringOrResolved =
    navalBattle.phase === 'firing' || navalBattle.phase === 'resolved';

  const attackerWon = isFiringOrResolved && navalBattle.winnerId === attacker.id;
  const defenderWon = isFiringOrResolved && navalBattle.winnerId === defender.id;
  const attackerLost = isFiringOrResolved && navalBattle.loserId === attacker.id;
  const defenderLost = isFiringOrResolved && navalBattle.loserId === defender.id;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="safe-modal fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden wood-panel border-2 border-amber-400 rounded-2xl p-3 shadow-[0_14px_45px_rgba(0,0,0,0.9)] text-amber-50">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-amber-700/60 pb-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-rose-600/90 text-white shadow">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
                  Abordage !
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  Au large de <strong className="text-amber-100">{tile?.name}</strong>
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
              150 Or + 1 🪵
            </span>
          </div>

          {/* Combatants Duel Row with Winner Celebration & Loser Impact Shake */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 mt-4 mb-3">
            {/* Attacker Card */}
            <motion.div
              key={`atk-${navalBattle.phase}-${attackerWon ? 'win' : 'norm'}`}
              animate={
                attackerWon
                  ? {
                      scale: [1, 1.12, 1.06],
                      y: [0, -6, -3],
                    }
                  : attackerLost
                  ? {
                      x: [0, -8, 8, -6, 6, 0],
                      scale: 0.93,
                      opacity: 0.72,
                    }
                  : { scale: 1, x: 0, y: 0, opacity: 1 }
              }
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`relative min-w-0 parchment-card rounded-xl p-2 text-center border-2 flex flex-col items-center transition-shadow ${
                attackerWon
                  ? 'border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_28px_rgba(251,191,36,0.95)] z-10'
                  : attackerLost
                  ? 'border-rose-600/80 shadow-inner'
                  : 'border-amber-700'
              }`}
            >
              {/* Winner Trophy Crown Badge */}
              {attackerWon && (
                <motion.div
                  initial={{ scale: 0, y: 8, rotate: -12 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                  className="absolute -top-3 inset-x-2 mx-auto w-fit px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Trophy className="w-3 h-3 text-amber-950 fill-amber-950 shrink-0" />
                  <span>Vainqueur !</span>
                </motion.div>
              )}

              {/* Floating Gold Gain / Loss Badge */}
              {isResolved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.4, y: 10 }}
                  animate={{ opacity: 1, scale: [1.2, 1], y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  className={`mt-1 mb-1 px-2 py-0.5 rounded-full text-[11px] font-black leading-tight border shadow-md ${
                    attackerWon
                      ? 'bg-emerald-500 text-slate-950 border-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.85)]'
                      : 'bg-rose-600 text-white border-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                  }`}
                >
                  {attackerWon
                    ? `+${navalBattle.plunderAmount} Or & +1 🪵`
                    : `-${navalBattle.plunderAmount} Or`}
                </motion.div>
              )}

              <div className="relative mt-0.5">
                {attackerWon && (
                  <motion.div
                    animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.9, 0.55] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="absolute -inset-1.5 rounded-full bg-amber-400/50 blur-xs"
                  />
                )}
                <CaptainAvatar
                  captainId={attacker.id}
                  color={attacker.color}
                  size="md"
                />
              </div>

              <div className="text-xs font-black leading-tight text-amber-950 mt-1">
                {attacker.name}
              </div>
              <div className="text-[10px] font-bold text-rose-800 uppercase">
                Attaquant
              </div>
              <div
                className={`mt-1 h-9 w-9 mx-auto rounded-lg flex items-center justify-center text-lg font-black border shadow-inner ${
                  attackerWon
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                    : attackerLost
                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                    : 'bg-amber-950 text-amber-200 border-amber-500'
                }`}
              >
                {navalBattle.attackerRoll ?? '?'}
              </div>
            </motion.div>

            {/* VS / Loot Transfer Divider */}
            <div className="flex flex-col items-center justify-center">
              {isResolved ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                  className="flex flex-col items-center text-amber-300"
                >
                  <Coins className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  {attackerWon ? (
                    <ArrowLeft className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  )}
                </motion.div>
              ) : (
                <>
                  <span className="text-xs font-black text-rose-400">VS</span>
                  <Flame className="w-4 h-4 text-orange-400 animate-pulse mt-0.5" />
                </>
              )}
            </div>

            {/* Defender Card */}
            <motion.div
              key={`def-${navalBattle.phase}-${defenderWon ? 'win' : 'norm'}`}
              animate={
                defenderWon
                  ? {
                      scale: [1, 1.12, 1.06],
                      y: [0, -6, -3],
                    }
                  : defenderLost
                  ? {
                      x: [0, -8, 8, -6, 6, 0],
                      scale: 0.93,
                      opacity: 0.72,
                    }
                  : { scale: 1, x: 0, y: 0, opacity: 1 }
              }
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`relative min-w-0 parchment-card rounded-xl p-2 text-center border-2 flex flex-col items-center transition-shadow ${
                defenderWon
                  ? 'border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_28px_rgba(251,191,36,0.95)] z-10'
                  : defenderLost
                  ? 'border-rose-600/80 shadow-inner'
                  : 'border-amber-700'
              }`}
            >
              {/* Winner Trophy Crown Badge */}
              {defenderWon && (
                <motion.div
                  initial={{ scale: 0, y: 8, rotate: 12 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                  className="absolute -top-3 inset-x-2 mx-auto w-fit px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] uppercase border-2 border-white shadow-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Trophy className="w-3 h-3 text-amber-950 fill-amber-950 shrink-0" />
                  <span>Vainqueur !</span>
                </motion.div>
              )}

              {/* Floating Gold Gain / Loss Badge */}
              {isResolved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.4, y: 10 }}
                  animate={{ opacity: 1, scale: [1.2, 1], y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                  className={`mt-1 mb-1 px-2 py-0.5 rounded-full text-[11px] font-black leading-tight border shadow-md ${
                    defenderWon
                      ? 'bg-emerald-500 text-slate-950 border-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.85)]'
                      : 'bg-rose-600 text-white border-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                  }`}
                >
                  {defenderWon
                    ? `+${navalBattle.plunderAmount} Or & +1 🪵`
                    : `-${navalBattle.plunderAmount} Or`}
                </motion.div>
              )}

              <div className="relative mt-0.5">
                {defenderWon && (
                  <motion.div
                    animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.9, 0.55] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="absolute -inset-1.5 rounded-full bg-amber-400/50 blur-xs"
                  />
                )}
                <CaptainAvatar
                  captainId={defender.id}
                  color={defender.color}
                  size="md"
                />
              </div>

              <div className="text-xs font-black leading-tight text-amber-950 mt-1">
                {defender.name}
              </div>
              <div className="text-[10px] font-bold text-sky-900 uppercase">
                Défenseur
              </div>
              <div
                className={`mt-1 h-9 w-9 mx-auto rounded-lg flex items-center justify-center text-lg font-black border shadow-inner ${
                  defenderWon
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                    : defenderLost
                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                    : 'bg-amber-950 text-amber-200 border-amber-500'
                }`}
              >
                {navalBattle.defenderRoll ?? '?'}
              </div>
            </motion.div>
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
                <span>Canonnade !</span>
              </motion.button>
            )}

            {navalBattle.phase === 'firing' && (
              <div className="py-2 text-center text-xs font-bold text-orange-300 flex items-center justify-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{winner?.name} ouvre le feu !</span>
              </div>
            )}

            {navalBattle.phase === 'resolved' && winner && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 rounded-xl px-3 py-2 text-center shadow-[0_0_20px_rgba(16,185,129,0.45)]">
                  <div className="text-xs sm:text-sm font-black text-emerald-200 flex items-center justify-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      {winner.name} gagne +{navalBattle.plunderAmount} Or &amp; +{navalBattle.materialsLooted ?? 1} 🪵 !
                    </span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={completeNavalBattle}
                  className="w-full py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-amber-100 shadow-lg cursor-pointer"
                >
                  Continuer
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

