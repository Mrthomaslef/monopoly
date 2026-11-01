import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Dices, Users, Eye, Compass } from 'lucide-react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { LandedTilePopup } from './components/ui/LandedTilePopup';
import { FortifySelectorModal } from './components/ui/FortifySelectorModal';
import { UpgradesModal } from './components/ui/UpgradesModal';
import { CaptainAvatar } from './components/ui/CaptainAvatar';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);
  const floatingTexts = useGameStore((s) => s.floatingTexts);
  const showSetupModal = useGameStore((s) => s.showSetupModal);
  const landedTilePopup = useGameStore((s) => s.landedTilePopup);
  const diceStowed = useGameStore((s) => s.diceStowed);
  const setDiceStowed = useGameStore((s) => s.setDiceStowed);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const rollDice = useGameStore((s) => s.rollDice);

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn = Boolean(
    activePlayer && !activePlayer.isAI && !activePlayer.bankrupt
  );
  const humanPlayersCount = players.filter((p) => !p.isAI && !p.bankrupt).length;
  const isLocalMultiplayer = humanPlayersCount >= 2;

  const [dismissedHandoffTurn, setDismissedHandoffTurn] = useState<number | null>(null);

  // Reset handoff banner whenever the active player changes
  useEffect(() => {
    setDismissedHandoffTurn(null);
  }, [currentPlayerIndex]);

  const showPassAndPlayHandoff =
    isLocalMultiplayer &&
    phase === 'IDLE' &&
    isHumanTurn &&
    !showSetupModal &&
    !landedTilePopup &&
    !diceStowed &&
    dismissedHandoffTurn !== currentPlayerIndex;

  const showDiceStowToggle =
    isHumanTurn && phase === 'IDLE' && !showSetupModal && !landedTilePopup;

  const handleToggleDiceStowed = () => {
    const nextStowed = !diceStowed;
    setDiceStowed(nextStowed);
    if (nextStowed) {
      setCameraMode('GLOBAL');
      setDismissedHandoffTurn(currentPlayerIndex);
    }
  };

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute: HUD Capitaines, Caméra & Partie */}
      <TopHUD />

      {/* Zone Centrale: Plateau 3D dégagé */}
      <div className="relative flex-1 w-full overflow-hidden">
        <Scene />

        {/* Compact Turn Pill at Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 wood-plank flex items-center gap-2 px-3 py-1 rounded-full shadow-xl border border-amber-500/40 whitespace-nowrap">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-black text-white border border-white/60 shrink-0 leading-none"
              style={{ backgroundColor: activePlayer.color }}
            >
              {activePlayer.isAI ? 'IA' : `J${currentPlayerIndex + 1}`}
            </span>
            <span className="text-xs font-black text-white drop-shadow">
              {activePlayer.name}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-950/80 text-orange-200 border border-orange-400/50">
              🪵 Matériaux : {activePlayer.materials}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/55 text-amber-300 border border-amber-500/40">
              🎲 {dice[0]}+{dice[1]}
            </span>
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

        {/* Bottom-Right Icon Button: Stow Dice & Toggle Free Board Camera */}
        <AnimatePresence>
          {showDiceStowToggle && (
            <motion.button
              key="stow-dice-toggle"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleToggleDiceStowed}
              title={
                diceStowed
                  ? 'Reprendre les dés pour lancer'
                  : 'Ranger les dés et passer en caméra libre sur le plateau'
              }
              className={`pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 shadow-[0_10px_25px_rgba(0,0,0,0.85)] cursor-pointer transition-colors ${
                diceStowed
                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-amber-100'
                  : 'wood-panel text-amber-200 border-amber-400/70 hover:border-amber-300'
              }`}
            >
              {diceStowed ? (
                <>
                  <Dices className="w-4 h-4 shrink-0 animate-bounce" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Sortir les Dés
                  </span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Caméra Libre
                  </span>
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Local Multiplayer (Pass & Play) Turn Handoff Card */}
        <AnimatePresence>
          {showPassAndPlayHandoff && activePlayer && (
            <motion.div
              key={`handoff-${currentPlayerIndex}`}
              initial={{ opacity: 0, scale: 0.82, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="pointer-events-none absolute inset-x-4 bottom-14 z-25 flex justify-center"
            >
              <div
                className="pointer-events-auto w-full max-w-[330px] wood-panel rounded-2xl border-3 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.9)] text-white"
                style={{ borderColor: activePlayer.color }}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <CaptainAvatar
                        captainId={activePlayer.id}
                        color={activePlayer.color}
                        size="md"
                      />
                      <span
                        className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-slate-950 shadow"
                        style={{ backgroundColor: activePlayer.color }}
                      >
                        J{currentPlayerIndex + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>Multijoueur Local • Passez l&apos;écran</span>
                      </div>
                      <div className="text-base font-black text-white truncate leading-tight mt-0.5">
                        À ton tour, {activePlayer.name} !
                      </div>
                      <div className="text-xs font-bold text-amber-300 mt-0.5">
                        💰 {activePlayer.gold} Or • 🪵 {activePlayer.materials} Matériau(x)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={rollDice}
                    className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white border-2 border-white/80 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: activePlayer.color }}
                  >
                    <Dices className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>Lancer les Dés (J{currentPlayerIndex + 1})</span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => {
                      setDismissedHandoffTurn(currentPlayerIndex);
                      setDiceStowed(true);
                      setCameraMode('GLOBAL');
                    }}
                    className="wood-plank py-2.5 px-2.5 rounded-xl text-xs font-bold text-amber-200 border border-amber-500/40 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    title="Ranger les dés et inspecter le plateau librement"
                  >
                    <Eye className="w-4 h-4 text-amber-300" />
                    <span>Plateau</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zone Basse: Barre de commandement contextuelle & Fiche d'île */}
      <BottomDeck />

      {/* Modales */}
      <LandedTilePopup />
      <FortifySelectorModal />
      <UpgradesModal />
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;


