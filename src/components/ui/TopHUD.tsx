import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Camera,
  Compass,
  Coins,
  MapPin,
  Skull,
  RotateCcw,
  Users,
  Bot,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { soundEffects } from '../../utils/soundEffects';

export const TopHUD: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);
  const initGame = useGameStore((s) => s.initGame);
  const aiCount = useGameStore((s) => s.aiCount);
  const passAndPlay = useGameStore((s) => s.passAndPlay);

  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted());
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const handleToggleMute = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="relative z-20 h-[15dvh] min-h-[96px] max-h-[132px] w-full wood-panel border-b-2 border-amber-700/70 px-2.5 py-1.5 flex flex-col justify-between select-none">
      {/* Top Bar: Title + Audio, Camera & Mode Controls */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-sm sm:text-base font-bold tracking-wider drop-shadow">
            🏴‍☠️ PIRATE&apos;S PLUNDER
          </span>
          <span className="hidden xs:inline-block text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/50">
            24 Cases
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Camera Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleCameraMode}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-600/60 active:scale-95 transition"
            title="Basculer entre Vue Globale et Vue Suivi"
          >
            {cameraMode === 'GLOBAL' ? (
              <>
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                <span>Globale</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>Suivi</span>
              </>
            )}
          </button>

          {/* Audio Mute/Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-md border active:scale-95 transition ${
              isMuted
                ? 'bg-rose-950/80 border-rose-700/60 text-rose-300'
                : 'bg-amber-900/80 border-amber-600/60 text-amber-200 hover:bg-amber-800'
            }`}
            title={isMuted ? 'Activer le son Web Audio' : 'Couper le son'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Game Setup / Restart Button */}
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="p-1.5 rounded-md bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-600/60 active:scale-95 transition"
            title="Nouvelle Partie / Configuration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Captains Status Cards Row (2 to 4 Captains) */}
      <div className="grid grid-cols-4 gap-1.5 my-auto">
        {players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex && !player.bankrupt;
          const islandCount = tiles.filter((t) => t.ownerId === player.id).length;

          return (
            <motion.div
              key={player.id}
              onClick={() =>
                useGameStore.setState({ focusedTileIndex: player.position })
              }
              animate={{
                scale: isCurrent ? 1.03 : 1,
                y: isCurrent ? -1 : 0,
              }}
              className={`relative cursor-pointer rounded-lg px-2 py-1 border transition-all overflow-hidden ${
                player.bankrupt
                  ? 'bg-slate-950/70 border-slate-800 opacity-50'
                  : isCurrent
                  ? 'bg-gradient-to-b from-amber-900/95 to-amber-950/95 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                  : 'bg-amber-950/75 border-amber-800/60 hover:border-amber-700'
              }`}
            >
              {/* Active Captain Glowing Indicator Dot */}
              {isCurrent && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
              )}

              {/* Captain Name + Color Crest */}
              <div className="flex items-center gap-1 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-[11px] font-bold text-amber-100 truncate">
                  {player.name}
                </span>
              </div>

              {/* Gold & Islands Row */}
              <div className="mt-0.5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-0.5 font-extrabold text-amber-300">
                  <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                  {player.gold}
                </span>
                <span className="flex items-center gap-0.5 text-cyan-300 font-semibold">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {islandCount}
                </span>
              </div>

              {/* Status Overlay Badge (Jail / AI / Bankrupt) */}
              {player.bankrupt ? (
                <div className="text-[9px] text-rose-400 font-bold flex items-center gap-0.5">
                  <Skull className="w-2.5 h-2.5" /> Naufragé
                </div>
              ) : player.inJail ? (
                <div className="text-[9px] text-amber-300 font-bold truncate">
                  ⛓️ En Cale
                </div>
              ) : (
                <div className="text-[9px] text-amber-400/75 truncate">
                  {player.isAI ? '🤖 Cap. IA' : '⚓ Joueur'}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Game Setup Popover Modal */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-2 mt-1 w-72 rounded-xl wood-panel border-2 border-amber-500 p-3 shadow-2xl z-50 text-amber-100"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
              ⚓ Configurer l&apos;Expédition
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-amber-200/80 block mb-1">
                  Nombre d&apos;adversaires (1 à 3) :
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        initGame(count, passAndPlay);
                        setShowConfig(false);
                      }}
                      className={`py-1.5 rounded font-bold border transition ${
                        aiCount === count
                          ? 'bg-amber-600 text-slate-950 border-amber-300'
                          : 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                      }`}
                    >
                      {count + 1} Navires
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-amber-200/80 block mb-1">
                  Mode de jeu :
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      initGame(aiCount, false);
                      setShowConfig(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded font-bold border transition ${
                      !passAndPlay
                        ? 'bg-amber-600 text-slate-950 border-amber-300'
                        : 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" /> Contre IA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      initGame(aiCount, true);
                      setShowConfig(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded font-bold border transition ${
                      passAndPlay
                        ? 'bg-amber-600 text-slate-950 border-amber-300'
                        : 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Pass &amp; Play
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
