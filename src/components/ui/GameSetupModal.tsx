import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Anchor,
  Bot,
  User,
  Users,
  Sparkles,
  Dices,
  X,
} from 'lucide-react';
import {
  useGameStore,
  PlayerSlotConfig,
} from '../../store/useGameStore';

export const GameSetupModal: React.FC = () => {
  const showSetupModal = useGameStore((s) => s.showSetupModal);
  const setShowSetupModal = useGameStore((s) => s.setShowSetupModal);
  const slotConfigs = useGameStore((s) => s.slotConfigs);
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const startCustomGame = useGameStore((s) => s.startCustomGame);

  const [slots, setSlots] = useState<PlayerSlotConfig[]>(() =>
    slotConfigs.map((s) => ({ ...s }))
  );

  useEffect(() => {
    if (showSetupModal) {
      setSlots(slotConfigs.map((s) => ({ ...s })));
    }
  }, [showSetupModal, slotConfigs]);

  const enabledCount = slots.filter((s) => s.enabled).length;
  const aiCount = slots.filter((s) => s.enabled && s.isAI).length;
  const humanCount = slots.filter((s) => s.enabled && !s.isAI).length;
  const isLocalMultiMode = humanCount >= 2;

  const selectGameMode = (mode: 'solo' | 'local_multi') => {
    setSlots((prev) =>
      prev.map((s, idx) => ({
        ...s,
        isAI: mode === 'solo' ? idx > 0 : false,
      }))
    );
  };

  const setTotalPlayers = (count: number) => {
    setSlots((prev) => {
      const currentlyLocalMulti =
        prev.filter((s) => s.enabled && !s.isAI).length >= 2 &&
        prev.filter((s) => s.enabled && s.isAI).length === 0;
      return prev.map((s, idx) => ({
        ...s,
        enabled: idx < count,
        isAI: currentlyLocalMulti ? false : idx === 0 ? false : s.isAI,
      }));
    });
  };

  const setPlayerRole = (index: number, isAI: boolean) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, isAI } : s))
    );
  };

  const setPlayerName = (index: number, name: string) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, name } : s))
    );
  };

  return (
    <AnimatePresence>
      {showSetupModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md wood-panel rounded-2xl border-4 border-amber-900 p-3 text-amber-50 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative max-h-full flex flex-col"
          >
            {/* Close button to resume current game */}
            <button
              type="button"
              onClick={() => setShowSetupModal(false)}
              className="absolute! top-3 right-3 z-10 wood-plank p-1.5 rounded-lg text-amber-200 hover:text-white active:scale-95 cursor-pointer"
              title="Fermer et reprendre la partie"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Everything but the start buttons scrolls, so those stay on screen */}
            <div className="min-h-0 flex-1 overflow-y-auto pirate-scroll">
            {/* Wooden Header Plank */}
            <div className="wood-plank wood-nails rounded-xl pl-3 pr-11 py-1.5 mb-3 flex items-center gap-2.5">
              <img
                src="./assets/pirate_logo.png"
                alt="Jolly Roger's"
                className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)] shrink-0"
              />
              <div className="text-left">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jolly Roger&apos;s</span>
                </div>
                <h2 className="text-base sm:text-xl font-black leading-tight text-amber-100 drop-shadow mt-0.5">
                  Nouvelle partie
                </h2>
              </div>
            </div>

            {/* Section 1: Prominent Game Mode Selector (Solo vs Local Multiplayer) */}
            <div className="mb-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-1.5">
                1. Mode de jeu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectGameMode('solo')}
                  className={`wood-plank wood-nails py-2.5 px-3 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer ${
                    !isLocalMultiMode
                      ? 'ring-2 ring-amber-400 bg-amber-950/80 brightness-120 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-200">
                    <Bot className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>Solo vs IA</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-100/80 leading-tight">
                    Contre 1 à 3 IA
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectGameMode('local_multi')}
                  className={`wood-plank wood-nails py-2.5 px-3 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer ${
                    isLocalMultiMode
                      ? 'ring-2 ring-emerald-400 bg-emerald-950/80 brightness-120 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-emerald-300">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi Local</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-100/80 leading-tight">
                    2 à 4 sur le même écran
                  </span>
                </button>
              </div>
            </div>

            {/* Section 2: Number of Players (2, 3, or 4 Ships) */}
            <div className="mb-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-1.5">
                2. Nombre de joueurs
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTotalPlayers(count)}
                    className={`wood-plank wood-nails py-2 px-2 rounded-xl font-black text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      enabledCount === count
                        ? 'ring-2 ring-amber-400 text-amber-200 brightness-125'
                        : 'text-amber-100/70 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="text-sm">{count} Joueurs</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Detailed Captain Slots (Human vs AI toggle per ship) */}
            <div className="mb-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-1.5">
                3. Capitaines ({humanCount} J • {aiCount} IA)
              </label>
              <div className="space-y-2">
                {slots.map((slot, idx) => {
                  if (!slot.enabled) return null;
                  return (
                    <div
                      key={slot.id}
                      className="wood-plank wood-nails rounded-xl px-2 py-1.5 flex flex-wrap items-center justify-between gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-[11rem] flex-1">
                        <div
                          className="w-9 h-9 rounded-lg shrink-0 border-2 shadow overflow-hidden relative"
                          style={{
                            borderColor: slot.color,
                            backgroundImage: 'url(./assets/captains_sheet.jpg)',
                            backgroundSize: '215% 215%',
                            backgroundPosition:
                              idx === 0
                                ? '4% 4%'
                                : idx === 1
                                ? '96% 4%'
                                : idx === 2
                                ? '4% 96%'
                                : '96% 96%',
                          }}
                        >
                          <span
                            className="absolute bottom-0 right-0 px-1 text-[8px] font-black text-white rounded-tl"
                            style={{ backgroundColor: slot.color }}
                          >
                            J{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={slot.name}
                            onChange={(e) => setPlayerName(idx, e.target.value)}
                            placeholder={`Joueur ${idx + 1}`}
                            maxLength={16}
                            className="w-full bg-black/35 border border-amber-700/60 rounded px-2 py-0.5 text-xs font-black text-amber-100 focus:outline-none focus:border-amber-400"
                          />
                          <div className="text-[10px] leading-tight text-amber-300/80 mt-0.5">
                            {slot.title}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Humain / IA */}
                      <div className="flex items-center gap-1 shrink-0 bg-black/40 p-1 rounded-lg border border-amber-900">
                        <button
                          type="button"
                          onClick={() => setPlayerRole(idx, false)}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer ${
                            !slot.isAI
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'text-amber-200/70 hover:text-amber-100'
                          }`}
                        >
                          <User className="w-3 h-3" />
                          <span>Humain</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerRole(idx, true)}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer ${
                            slot.isAI
                              ? 'bg-cyan-500 text-slate-950 shadow'
                              : 'text-amber-200/70 hover:text-amber-100'
                          }`}
                        >
                          <Bot className="w-3 h-3" />
                          <span>IA</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Banner about Adapted 24-Tile Dice */}
            <div className="parchment-card rounded-xl p-2 flex items-center gap-2.5 border-2 border-amber-800">
              <div className="p-2 rounded-lg bg-amber-900 text-amber-200 shrink-0">
                <Dices className="w-5 h-5" />
              </div>
              <div className="text-[11px] leading-snug text-amber-950">
                <strong className="font-black">Dés de 1 à 3 :</strong> <strong>2 à 6 cases</strong> par tour.
              </div>
            </div>

            </div>

            {/* Resume Saved Game Button (if a game is already in progress) */}
            <div className="shrink-0 mt-2.5">
            {players.some((p) => p.position !== 0 || p.gold !== 1500 || p.materials > 0) ||
            tiles.some((t) => t.ownerId !== null) ? (
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="w-full py-2.5 px-2 rounded-xl font-black text-xs sm:text-sm uppercase leading-tight bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 border-2 border-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Anchor className="w-4 h-4" />
                  <span>Reprendre la Partie</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => startCustomGame(slots)}
                  className="w-full py-2.5 px-2 rounded-xl font-black text-xs sm:text-sm uppercase leading-tight bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-2 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Nouvelle Partie ({humanCount} J • {aiCount} IA)
                  </span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => startCustomGame(slots)}
                className="w-full py-3 px-2 rounded-xl font-black text-sm uppercase leading-tight bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-2 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Lever l&apos;Ancre ({humanCount} J • {aiCount} IA)
                </span>
              </motion.button>
            )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
