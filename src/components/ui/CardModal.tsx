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
      {/* Treasure Chest & Sea Curse Parchment Modal */}
      {activeCard && (
        <motion.div
          key="card-modal"
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-xs parchment-card rounded-2xl border-4 border-amber-800 p-5 text-center shadow-2xl relative overflow-hidden">
            {/* Top Ribbon Icon */}
            <div
              className={`w-12 h-12 mx-auto mb-2.5 rounded-full flex items-center justify-center border-2 shadow-md ${
                activeCard.deck === 'chest'
                  ? 'bg-amber-500 border-amber-200 text-slate-950'
                  : 'bg-purple-900 border-purple-400 text-purple-100'
              }`}
            >
              {activeCard.deck === 'chest' ? (
                <Sparkles className="w-6 h-6" />
              ) : (
                <Skull className="w-6 h-6" />
              )}
            </div>

            <div className="text-[11px] font-black uppercase tracking-widest text-amber-800">
              {activeCard.deck === 'chest'
                ? '⚓ Coffre au Trésor'
                : '🦑 Malédiction des Mers'}
            </div>

            <h3 className="text-lg font-black text-amber-950 mt-1">
              {activeCard.title}
            </h3>

            <p className="text-xs font-medium text-amber-900/90 mt-2 leading-relaxed">
              {activeCard.description}
            </p>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={resolveCardModal}
              className="mt-4 w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-b from-amber-700 to-amber-900 text-amber-100 border border-amber-500 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-amber-300" />
              <span>Accepter le Destin</span>
            </motion.button>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm wood-panel rounded-2xl border-2 border-amber-400 p-6 text-center shadow-2xl text-amber-50">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.7)]">
              <Trophy className="w-9 h-9" />
            </div>

            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
              Seigneur des Sept Mers
            </div>

            <h2 className="text-2xl font-black mt-1 text-white">
              {winner.name} Triomphe !
            </h2>

            <p className="text-xs text-amber-200/85 mt-2">
              Avec un trésor de <strong className="text-amber-300">{winner.gold} Doublons</strong>,{' '}
              {winner.name} règne sans partage sur l&apos;archipel des Caraïbes !
            </p>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => initGame(aiCount, passAndPlay)}
              className="mt-5 w-full py-3 px-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border border-amber-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejouer une Expédition</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
