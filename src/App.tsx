import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Dices, Users, Eye, Compass, Crosshair, FastForward } from 'lucide-react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { LandedTilePopup } from './components/ui/LandedTilePopup';
import { FortifySelectorModal } from './components/ui/FortifySelectorModal';
import { UpgradesModal } from './components/ui/UpgradesModal';
import { TradeModal } from './components/ui/TradeModal';
import { CurseModal } from './components/ui/CurseModal';
import { PlayerAcquisitionsModal } from './components/ui/PlayerAcquisitionsModal';
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
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const diceStowed = useGameStore((s) => s.diceStowed);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const botSpeed = useGameStore((s) => s.botSpeed);
  const spotlightPlayerId = useGameStore((s) => s.spotlightPlayerId);
  const setDiceStowed = useGameStore((s) => s.setDiceStowed);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const toggleBotSpeed = useGameStore((s) => s.toggleBotSpeed);
  const focusOnPlayer = useGameStore((s) => s.focusOnPlayer);
  const rollDice = useGameStore((s) => s.rollDice);

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn = Boolean(
    activePlayer && !activePlayer.isAI && !activePlayer.bankrupt
  );
  const hasAIPlayers = players.some((p) => p.isAI && !p.bankrupt);
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
    !showFortifyModal &&
    !diceStowed &&
    dismissedHandoffTurn !== currentPlayerIndex;

  const showDiceStowToggle =
    isHumanTurn && phase === 'IDLE' && !showSetupModal && !landedTilePopup && !showFortifyModal;

  const showBotSpeedToggle =
    hasAIPlayers && !showSetupModal && phase !== 'GAME_OVER';

  const isFreeCameraActive =
    isHumanTurn &&
    phase === 'IDLE' &&
    diceStowed &&
    cameraMode === 'GLOBAL' &&
    !showSetupModal &&
    !landedTilePopup &&
    !showFortifyModal;

  const opponents = activePlayer
    ? players.filter((p) => p.id !== activePlayer.id && !p.bankrupt)
    : [];

  const handleToggleDiceStowed = () => {
    const nextStowed = !diceStowed;
    setDiceStowed(nextStowed);
    if (nextStowed) {
      setCameraMode('GLOBAL');
      setDismissedHandoffTurn(currentPlayerIndex);
    } else {
      focusOnPlayer(null);
    }
  };

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute: HUD Capitaines, Caméra & Partie */}
      <TopHUD />

      {/* Zone Centrale: Plateau 3D dégagé */}
      <div className="relative flex-1 w-full overflow-hidden">
        <Scene />

        {/* Compact Turn Pill at Top of 3D Canvas (gold & materials are already in the HUD) */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2 inset-x-2 z-10 flex justify-center">
            <div className="wood-plank flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border border-amber-500/40 max-w-full">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-black text-white border border-white/60 shrink-0 leading-none"
                style={{ backgroundColor: activePlayer.color }}
              >
                {activePlayer.isAI ? 'IA' : `J${currentPlayerIndex + 1}`}
              </span>
              <span className="min-w-0 text-xs font-black leading-tight text-white drop-shadow">
                {activePlayer.name}
              </span>
              <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full bg-black/55 text-amber-300 border border-amber-500/40 shrink-0 whitespace-nowrap">
                🎲 {dice[0]}+{dice[1]}
              </span>
            </div>
          </div>
        )}

        {/* High-Visibility Animated Gold / Loot Gain & Loss Popups */}
        <div className="pointer-events-none absolute top-10 sm:top-11 inset-x-2 z-30 flex flex-col items-center gap-1">
          <AnimatePresence>
            {floatingTexts.map((item) => {
              const isLoss = item.text.trim().startsWith('-');
              const isGain = item.text.trim().startsWith('+');
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10, scale: 0.72 }}
                  animate={{ opacity: 1, y: 0, scale: [1.06, 1] }}
                  exit={{ opacity: 0, y: -10, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className={`max-w-[min(92vw,340px)] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-black text-[11px] sm:text-xs leading-tight text-center border-2 flex items-center justify-center gap-1.5 shadow-2xl ${
                    isGain
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 border-white shadow-[0_0_20px_rgba(16,185,129,0.85)]'
                      : isLoss
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.85)]'
                      : 'bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 border-white shadow-[0_0_18px_rgba(251,191,36,0.85)]'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="min-w-0 break-words">{item.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Free Camera Spotlight Bar: Center on Self ("En évidence") or Inspect an Opponent */}
        <AnimatePresence>
          {isFreeCameraActive && activePlayer && (
            <motion.div
              key="free-camera-spotlight-bar"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="pointer-events-auto absolute bottom-14 left-2 right-2 sm:bottom-3 sm:right-40 z-30 flex items-center justify-center sm:justify-start"
            >
              <div className="wood-panel w-full sm:w-auto p-1.5 rounded-2xl border-2 border-amber-400/70 shadow-[0_10px_28px_rgba(0,0,0,0.88)] flex items-stretch gap-1.5">
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 pr-1 border-r border-amber-500/30 shrink-0">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Cibler :</span>
                </div>

                {[activePlayer, ...opponents].map((target) => {
                  const isSelected = spotlightPlayerId === target.id;
                  const targetIndex = players.findIndex((p) => p.id === target.id);
                  const roleLabel =
                    target.id === activePlayer.id
                      ? 'Moi'
                      : target.isAI
                      ? 'IA'
                      : `J${targetIndex + 1}`;
                  return (
                    <motion.button
                      key={target.id}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => focusOnPlayer(isSelected ? null : target.id)}
                      title={`Centrer la caméra sur ${target.name}`}
                      className={`flex-1 sm:flex-none sm:w-24 min-w-0 flex flex-col items-center gap-0.5 p-1 rounded-xl text-[10px] leading-tight text-center font-black transition-all cursor-pointer border-2 ${
                        isSelected
                          ? 'text-white border-white shadow-[0_0_16px_rgba(255,255,255,0.65)]'
                          : 'wood-plank text-amber-100'
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: target.color }
                          : { borderColor: `${target.color}88` }
                      }
                    >
                      <span className="[@media(max-height:700px)]:hidden">
                        <CaptainAvatar captainId={target.id} color={target.color} size="sm" />
                      </span>
                      <span className="uppercase opacity-85">{roleLabel}</span>
                      <span>{target.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom-Right Controls: Bot Speed Accelerator & Free Board Camera Toggle */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2">
          <AnimatePresence>
            {showBotSpeedToggle && (
              <motion.button
                key="bot-speed-toggle"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={toggleBotSpeed}
                title={
                  botSpeed === 'FAST'
                    ? 'Vitesse des bots accélérée (cliquer pour revenir à la vitesse normale)'
                    : 'Accélérer la vitesse des bots'
                }
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 shadow-[0_10px_25px_rgba(0,0,0,0.85)] cursor-pointer transition-colors ${
                  botSpeed === 'FAST'
                    ? 'bg-gradient-to-b from-cyan-400 to-cyan-600 text-slate-950 border-cyan-100'
                    : 'wood-panel text-amber-200 border-amber-400/70 hover:border-amber-300'
                }`}
              >
                <FastForward
                  className={`w-4 h-4 shrink-0 ${
                    botSpeed === 'FAST' ? 'text-slate-950 animate-pulse' : 'text-cyan-300'
                  }`}
                />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {botSpeed === 'FAST' ? 'Bots Rapides' : 'Accélérer Bots'}
                </span>
              </motion.button>
            )}

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
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 shadow-[0_10px_25px_rgba(0,0,0,0.85)] cursor-pointer transition-colors ${
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
        </div>

        {/* Local Multiplayer (Pass & Play) Turn Handoff Card */}
        <AnimatePresence>
          {showPassAndPlayHandoff && activePlayer && (
            <motion.div
              key={`handoff-${currentPlayerIndex}`}
              initial={{ opacity: 0, scale: 0.82, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="pointer-events-none absolute inset-x-2 top-10 bottom-14 z-25 flex items-end justify-center [@media(max-height:620px)]:hidden"
            >
              <div
                className="pointer-events-auto w-full max-w-[330px] max-h-full overflow-y-auto wood-panel rounded-2xl border-3 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.9)] text-white"
                style={{ borderColor: activePlayer.color }}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0 [@media(max-height:700px)]:hidden">
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
                      <div className="text-[10px] font-extrabold uppercase text-emerald-300 flex items-center gap-1">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>Passez l&apos;écran</span>
                      </div>
                      <div className="text-sm font-black text-white leading-tight mt-0.5">
                        À ton tour, {activePlayer.name} !
                      </div>
                      <div className="text-xs font-bold text-amber-300 mt-0.5 [@media(max-height:700px)]:hidden">
                        💰 {activePlayer.gold} Or • 🪵 {activePlayer.materials}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 [@media(max-height:700px)]:hidden">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={rollDice}
                    className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase leading-tight text-white border-2 border-white/80 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: activePlayer.color }}
                  >
                    <Dices className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>Lancer les Dés</span>
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

        {/* Carte de case / île ancrée en bas de la vue 3D pour laisser l'île 3D et son titre bien dégagés au-dessus */}
        <LandedTilePopup />
        <FortifySelectorModal />
      </div>

      {/* Zone Basse: Barre de commandement contextuelle & Fiche d'île */}
      <BottomDeck />

      {/* Modales */}
      <UpgradesModal />
      <TradeModal />
      <CurseModal />
      <PlayerAcquisitionsModal />
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;


