import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, KeyRound } from 'lucide-react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);
  const showSetupModal = useGameStore((s) => s.showSetupModal);
  const rollDice = useGameStore((s) => s.rollDice);
  const payBailAndRoll = useGameStore((s) => s.payBailAndRoll);

  const activePlayer = players[currentPlayerIndex];
  const showRollPopup =
    Boolean(activePlayer) &&
    !activePlayer.isAI &&
    !activePlayer.bankrupt &&
    phase === 'IDLE' &&
    !showSetupModal;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute (15%): HUD en planches de bois des Capitaines, Audio & Caméra */}
      <TopHUD />

      {/* Zone Centrale (60%): Canvas 3D prenant toute la largeur */}
      <div className="relative flex-1 h-[60dvh] w-full overflow-hidden">
        <Scene />

        {/* Wooden Plank Turn Banner on Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 wood-plank wood-nails flex items-center gap-2 px-3.5 py-1 rounded-xl shadow-xl">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/60"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs font-black text-amber-100">
              Tour de {activePlayer.name}
            </span>
            <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-700/50">
              🎲 {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
            </span>
            {activePlayer.isAI && phase !== 'GAME_OVER' && (
              <span className="text-[10px] font-bold text-cyan-300 animate-pulse">
                • IA en manœuvre...
              </span>
            )}
          </div>
        )}

        {/* Center-Screen Pop-up Roll Dice Button (under the zoomed-in 3D dice) */}
        <AnimatePresence>
          {showRollPopup && activePlayer && (
            <motion.div
              key="roll-popup"
              initial={{ opacity: 0, scale: 0.65, y: 35 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 20 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="absolute inset-x-0 bottom-5 z-20 flex flex-col items-center justify-center gap-2 px-4 pointer-events-none"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={rollDice}
                className="pointer-events-auto wood-plank wood-nails px-7 py-3.5 rounded-2xl border-2 border-amber-300 ring-4 ring-amber-400/50 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(251,191,36,0.65)] flex items-center gap-3 cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow">
                  <Dices className="w-6 h-6 animate-bounce" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                    À votre tour, {activePlayer.name} !
                  </div>
                  <div className="text-base sm:text-lg font-black uppercase tracking-wider text-amber-50 drop-shadow">
                    Lancer les Dés (1–3)
                  </div>
                </div>
              </motion.button>

              {/* Optional Bail Button if Player is in Skull Island Jail */}
              {activePlayer.inJail && activePlayer.gold >= 100 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={payBailAndRoll}
                  className="pointer-events-auto wood-plank wood-nails px-4 py-1.5 rounded-xl text-xs font-extrabold text-amber-200 ring-1 ring-amber-400/70 flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ou payer 100 Or de caution &amp; Lancer</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zone Basse (25%): Tiroir de commandement Planches de Bois & Parchemin */}
      <BottomDeck />

      {/* Modales : Configuration Joueurs/IA, Bataille Navale & Cartes Parchemin */}
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;
