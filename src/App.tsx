import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { LandedTilePopup } from './components/ui/LandedTilePopup';
import { FortifySelectorModal } from './components/ui/FortifySelectorModal';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);
  const floatingTexts = useGameStore((s) => s.floatingTexts);

  const activePlayer = players[currentPlayerIndex];

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute: HUD Capitaines, Caméra & Partie */}
      <TopHUD />

      {/* Zone Centrale: Plateau 3D dégagé */}
      <div className="relative flex-1 w-full overflow-hidden">
        <Scene />

        {/* Compact Turn Pill at Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 wood-plank flex items-center gap-2 px-3.5 py-1 rounded-full shadow-xl border border-amber-500/40 whitespace-nowrap">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs font-black text-white drop-shadow">
              Tour de {activePlayer.name}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/55 text-amber-300 border border-amber-500/40">
              🎲 {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
            </span>
            {activePlayer.isAI && phase !== 'GAME_OVER' && (
              <span className="text-[11px] font-bold text-cyan-300 animate-pulse">
                • IA
              </span>
            )}
          </div>
        )}

        {/* High-Visibility Animated Gold / Loot Gain & Loss Popups */}
        <div className="pointer-events-none absolute top-11 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5">
          <AnimatePresence>
            {floatingTexts.map((item) => {
              const isLoss = item.text.trim().startsWith('-');
              const isGain = item.text.trim().startsWith('+');
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12, scale: 0.65 }}
                  animate={{ opacity: 1, y: 0, scale: [1.18, 1] }}
                  exit={{ opacity: 0, y: -14, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className={`px-3 py-1 rounded-full font-black text-xs sm:text-sm border-2 flex items-center gap-1.5 shadow-2xl whitespace-nowrap ${
                    isGain
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 border-white shadow-[0_0_20px_rgba(16,185,129,0.85)]'
                      : isLoss
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.85)]'
                      : 'bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 border-white shadow-[0_0_18px_rgba(251,191,36,0.85)]'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>{item.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Zone Basse: Barre de commandement contextuelle & Fiche d'île */}
      <BottomDeck />

      {/* Modales */}
      <LandedTilePopup />
      <FortifySelectorModal />
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;

