import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Skull, Trophy, RotateCcw, Compass } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const CardModal: React.FC = () => {
  const activeCard = useGameStore((s) => s.activeCard);
  const resolveCardModal = useGameStore((s) => s.resolveCardModal);
  const phase = useGameStore((s) => s.phase);
  const winner = useGameStore((s) => s.winner);
  const initGame = useGameStore((s) => s.initGame);
  const aiCount = useGameStore((s) => s.aiCount);
  const passAndPlay = useGameStore((s) => s.passAndPlay);

  return (
    <AnimatePresence>
      {/* Treasure Chest & Sea Curse Parchment Modal styled after the Tile */}
      {activeCard && (
        <motion.div
          key="card-modal"
          initial={{ opacity: 0, scale: 0.78, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 24 }}
          className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
        >
          <div
            className={`w-full max-w-xs max-h-full flex flex-col rounded-2xl border-4 overflow-hidden text-center shadow-2xl relative ${
              activeCard.deck === 'chest'
                ? 'parchment-card border-yellow-400'
                : 'border-purple-400 bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 text-purple-50'
            }`}
          >
            {/* Top Tile Terrain Banner & 3D Higgsfield Prop Cutout */}
            <div className="relative h-20 [@media(min-height:700px)]:h-28 w-full shrink-0 overflow-hidden border-b-2 border-black/30">
              <img
                src={
                  activeCard.deck === 'chest'
                    ? './assets/tile_tresor.jpg?v=terrain3'
                    : './assets/tile_malediction.jpg?v=terrain3'
                }
                alt={activeCard.title}
                className="absolute inset-0 w-full h-full object-cover scale-105"
              />
              <div
                className={`absolute inset-0 ${
                  activeCard.deck === 'chest'
                    ? 'bg-gradient-to-b from-amber-950/20 to-amber-950/85'
                    : 'bg-gradient-to-b from-purple-950/30 to-slate-950/90'
                }`}
              />
              <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1.5">
                {activeCard.deck === 'chest' ? (
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                ) : (
                  <Skull className="w-4 h-4 text-purple-300" />
                )}
                <span className="font-cinzel text-[11px] font-black uppercase leading-tight text-left pr-24 text-amber-200">
                  {activeCard.deck === 'chest'
                    ? 'Coffre au Trésor'
                    : 'Malédiction des Mers'}
                </span>
              </div>
              <img
                src={
                  activeCard.deck === 'chest'
                    ? './assets/prop_tresor.png?v=model3d'
                    : './assets/prop_malediction.png?v=model3d'
                }
                alt={activeCard.title}
                className="absolute right-2 bottom-0.5 w-24 h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] z-10 pointer-events-none"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pirate-scroll p-4">
              <h3
                className={`font-pirata text-2xl tracking-wide ${
                  activeCard.deck === 'chest'
                    ? 'text-amber-950'
                    : 'text-purple-200'
                }`}
              >
                {activeCard.title}
              </h3>

              <p
                className={`text-xs font-semibold mt-2 leading-relaxed ${
                  activeCard.deck === 'chest'
                    ? 'text-amber-900/95'
                    : 'text-purple-100/90'
                }`}
              >
                {activeCard.description}
              </p>

              {(activeCard.goldDelta || activeCard.materialsDelta) && (
                <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
                  {typeof activeCard.goldDelta === 'number' && activeCard.goldDelta !== 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                        activeCard.goldDelta > 0
                          ? 'bg-amber-900/85 text-amber-200 border-amber-400/60'
                          : 'bg-rose-950/85 text-rose-200 border-rose-400/60'
                      }`}
                    >
                      {activeCard.goldDelta > 0 ? `+${activeCard.goldDelta}` : activeCard.goldDelta} Or
                    </span>
                  )}
                  {typeof activeCard.materialsDelta === 'number' && activeCard.materialsDelta > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-950/90 text-emerald-200 border border-emerald-400/70">
                      +{activeCard.materialsDelta} {activeCard.materialsDelta > 1 ? 'Matériaux' : 'Matériau'} 🪵
                    </span>
                  )}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={resolveCardModal}
                className="mt-4 w-full py-2.5 px-4 rounded-xl font-cinzel font-black text-xs uppercase tracking-wider bg-gradient-to-b from-amber-600 to-amber-900 text-amber-100 border border-amber-400 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-300" />
                <span>Continuer</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Victory Fanfare Modal */}
      {phase === 'GAME_OVER' && winner && (
        <motion.div
          key="victory-modal"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm max-h-full overflow-y-auto wood-panel rounded-2xl border-2 border-amber-400 p-6 text-center shadow-2xl text-amber-50">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.7)]">
              <Trophy className="w-9 h-9" />
            </div>

            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
              Victoire !
            </div>

            <h2 className="text-2xl font-black mt-1 text-white">
              {winner.name} Gagne !
            </h2>

            <p className="text-xs text-amber-200/85 mt-2">
              Trésor : <strong className="text-amber-300">{winner.gold} Or</strong>
            </p>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => initGame(aiCount, passAndPlay)}
              className="mt-5 w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border border-amber-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejouer</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
