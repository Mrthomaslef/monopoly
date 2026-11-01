import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Camera,
  Compass,
  Coins,
  MapPin,
  Skull,
  Users,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { soundEffects } from '../../utils/soundEffects';
import { CaptainAvatar } from './CaptainAvatar';

export const TopHUD: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);
  const setShowSetupModal = useGameStore((s) => s.setShowSetupModal);

  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted());

  const handleToggleMute = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  const gridColsClass =
    players.length === 2
      ? 'grid-cols-2'
      : players.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <header className="relative z-20 h-[15dvh] min-h-[100px] max-h-[136px] w-full wood-panel border-b-4 border-amber-950 px-2.5 py-1.5 flex flex-col justify-between select-none">
      {/* Top Bar: Carved Wooden Sign + Audio, Camera & Crew Setup Plank Buttons */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="wood-plank wood-nails px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
          <span className="text-amber-300 text-xs sm:text-sm font-black tracking-wider drop-shadow">
            🏴‍☠️ PIRATE&apos;S PLUNDER
          </span>
          <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/35 text-amber-200 border border-amber-700/50">
            Dés 1–3
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Crew / Players & AI Setup Plank Button */}
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="wood-plank flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-extrabold text-amber-200 hover:brightness-110 active:scale-95 transition cursor-pointer"
            title="Choisir le nombre de joueurs et IA"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Joueurs / IA</span>
          </button>

          {/* Camera Mode Toggle Plank Button */}
          <button
            type="button"
            onClick={toggleCameraMode}
            className="wood-plank flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-extrabold text-amber-100 hover:brightness-110 active:scale-95 transition cursor-pointer"
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

          {/* Audio Mute/Unmute Plank Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`wood-plank p-1.5 rounded-lg active:scale-95 transition cursor-pointer ${
              isMuted ? 'text-rose-300 opacity-80' : 'text-amber-200 hover:brightness-110'
            }`}
            title={isMuted ? 'Activer le son Web Audio' : 'Couper le son'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Captains Wooden Plank Cards Row (2 to 4 Captains) */}
      <div className={`grid ${gridColsClass} gap-1.5 my-auto`}>
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
              className={`wood-plank wood-nails cursor-pointer rounded-lg px-1.5 py-1 transition-all overflow-hidden flex items-center gap-1.5 ${
                player.bankrupt
                  ? 'opacity-45 grayscale'
                  : isCurrent
                  ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)] brightness-115'
                  : 'opacity-90 hover:opacity-100'
              }`}
            >
              {/* Illustrated Captain Portrait */}
              <CaptainAvatar
                captainId={player.id}
                color={player.color}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                {/* Active Captain Glowing Indicator Dot */}
                {isCurrent && (
                  <span className="absolute top-1 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                )}

                <div className="text-[11px] font-black text-amber-100 truncate drop-shadow leading-tight">
                  {player.name}
                </div>

                {/* Gold, Materials & Islands Row */}
                <div className="flex items-center justify-between text-[10px] leading-tight mt-0.5 gap-1">
                  <span className="flex items-center gap-0.5 font-black text-amber-300" title="Or (Doublons)">
                    <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    {player.gold}
                  </span>
                  <span className="flex items-center gap-0.5 font-extrabold text-orange-300" title="Matériaux de construction">
                    <span>🪵</span>
                    {player.materials}
                  </span>
                  <span className="flex items-center gap-0.5 text-cyan-300 font-bold" title="Îles possédées">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {islandCount}
                  </span>
                </div>

                {/* Status Overlay Badge */}
                {player.bankrupt ? (
                  <div className="text-[8px] text-rose-300 font-bold flex items-center gap-0.5">
                    <Skull className="w-2 h-2" /> Naufragé
                  </div>
                ) : player.inJail ? (
                  <div className="text-[8px] text-amber-300 font-bold truncate">
                    ⛓️ En Cale
                  </div>
                ) : (
                  <div className="text-[8px] text-amber-200/80 font-semibold truncate">
                    {player.isAI ? '🤖 Cap. IA' : '⚓ Humain'}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </header>
  );
};
