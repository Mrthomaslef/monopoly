import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface PlayerDeltaBadge {
  key: string;
  goldDelta: number;
  matDelta: number;
}

export const TopHUD: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);
  const setShowSetupModal = useGameStore((s) => s.setShowSetupModal);

  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted());
  const [deltas, setDeltas] = useState<Record<number, PlayerDeltaBadge>>({});
  const prevStatsRef = useRef<Record<number, { gold: number; materials: number }>>({});

  useEffect(() => {
    const prev = prevStatsRef.current;
    // Detect if a brand new game was initialized (all players back to 1500 gold & position 0)
    const isFreshReset =
      players.length > 0 &&
      players.every((p) => p.gold === 1500 && p.materials === 0 && p.position === 0);

    if (isFreshReset) {
      const nextSnap: Record<number, { gold: number; materials: number }> = {};
      players.forEach((p) => {
        nextSnap[p.id] = { gold: p.gold, materials: p.materials };
      });
      prevStatsRef.current = nextSnap;
      setDeltas({});
      return;
    }

    const newDeltas: Record<number, PlayerDeltaBadge> = {};
    const nextSnap: Record<number, { gold: number; materials: number }> = {};

    players.forEach((p) => {
      const old = prev[p.id];
      nextSnap[p.id] = { gold: p.gold, materials: p.materials };
      if (old) {
        const gDiff = p.gold - old.gold;
        const mDiff = p.materials - old.materials;
        if (gDiff !== 0 || mDiff !== 0) {
          newDeltas[p.id] = {
            key: `${p.id}-${Date.now()}-${Math.random()}`,
            goldDelta: gDiff,
            matDelta: mDiff,
          };
        }
      }
    });

    prevStatsRef.current = nextSnap;

    const changedIds = Object.keys(newDeltas).map(Number);
    if (changedIds.length > 0) {
      setDeltas((curr) => ({ ...curr, ...newDeltas }));
      const timer = setTimeout(() => {
        setDeltas((curr) => {
          const copy = { ...curr };
          changedIds.forEach((id) => {
            if (copy[id]?.key === newDeltas[id].key) {
              delete copy[id];
            }
          });
          return copy;
        });
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [players]);

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
    <header className="relative z-20 h-[14.5dvh] min-h-[96px] max-h-[128px] w-full wood-panel border-b-4 border-amber-950 px-2.5 py-1.5 flex flex-col justify-between select-none">
      {/* Top Bar: Official Logo Badge + Compact Action Icons */}
      <div className="flex items-center justify-between gap-2">
        <div className="wood-plank wood-nails px-2.5 py-0.5 rounded-lg flex items-center gap-2">
          <img
            src="./assets/pirate_logo.png"
            alt="Pirate's Plunder Logo"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] shrink-0"
          />
          <span className="font-cinzel text-amber-200 text-xs sm:text-sm font-black tracking-wider drop-shadow">
            PIRATE&apos;S PLUNDER
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Crew / Players & AI Setup Button */}
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="wood-plank flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-100 hover:brightness-110 active:scale-95 transition cursor-pointer"
            title="Équipage & Partie"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Partie</span>
          </button>

          {/* Camera Mode Toggle Icon Button */}
          <button
            type="button"
            onClick={toggleCameraMode}
            className="wood-plank p-1.5 rounded-lg text-amber-100 hover:brightness-110 active:scale-95 transition cursor-pointer"
            title={
              cameraMode === 'GLOBAL'
                ? 'Vue Globale (cliquer pour Vue Suivi)'
                : 'Vue Suivi (cliquer pour Vue Globale)'
            }
          >
            {cameraMode === 'GLOBAL' ? (
              <Compass className="w-4 h-4 text-cyan-300" />
            ) : (
              <Camera className="w-4 h-4 text-amber-300" />
            )}
          </button>

          {/* Audio Mute/Unmute Icon Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`wood-plank p-1.5 rounded-lg active:scale-95 transition cursor-pointer ${
              isMuted ? 'text-rose-300 opacity-80' : 'text-amber-200 hover:brightness-110'
            }`}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Captains Row (2 to 4 Captains) — Clean & High-Contrast with Live Gold Delta Popups */}
      <div className={`grid ${gridColsClass} gap-1.5 my-auto`}>
        {players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex && !player.bankrupt;
          const islandCount = tiles.filter((t) => t.ownerId === player.id).length;
          const delta = deltas[player.id];
          const isGain = Boolean(delta && delta.goldDelta > 0);
          const isLoss = Boolean(delta && delta.goldDelta < 0);

          const formatDeltaLabel = (d: PlayerDeltaBadge) => {
            const parts: string[] = [];
            if (d.goldDelta !== 0) {
              parts.push(`${d.goldDelta > 0 ? '+' : ''}${d.goldDelta} Or`);
            }
            if (d.matDelta !== 0) {
              parts.push(`${d.matDelta > 0 ? '+' : ''}${d.matDelta} 🪵`);
            }
            return parts.join(' ');
          };

          return (
            <motion.div
              key={player.id}
              onClick={() =>
                useGameStore.setState({ focusedTileIndex: player.position })
              }
              animate={
                isLoss
                  ? { x: [0, -5, 5, -4, 4, 0], scale: 1.03 }
                  : isGain
                  ? { scale: [1, 1.08, 1.03] }
                  : { scale: isCurrent ? 1.02 : 1, x: 0 }
              }
              transition={{ duration: 0.45 }}
              className={`relative wood-plank cursor-pointer rounded-xl px-2 py-1 transition-all flex items-center gap-2 ${
                player.bankrupt
                  ? 'opacity-40 grayscale'
                  : isGain
                  ? 'ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.85)] brightness-120'
                  : isLoss
                  ? 'ring-2 ring-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.85)]'
                  : isCurrent
                  ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)] brightness-115'
                  : 'opacity-90 hover:opacity-100'
              }`}
            >
              {/* Animated Gold / Material Delta Popup Pill */}
              <AnimatePresence>
                {delta && (
                  <motion.div
                    key={delta.key}
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: -6, scale: [1.22, 1] }}
                    exit={{ opacity: 0, y: -16, scale: 0.75 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className={`pointer-events-none absolute -bottom-2.5 right-1 z-30 px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight border-2 shadow-xl whitespace-nowrap ${
                      delta.goldDelta >= 0
                        ? 'bg-emerald-400 text-slate-950 border-white shadow-[0_4px_14px_rgba(16,185,129,0.9)]'
                        : 'bg-rose-600 text-white border-rose-200 shadow-[0_4px_14px_rgba(244,63,94,0.9)]'
                    }`}
                  >
                    {formatDeltaLabel(delta)}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Captain Color Dot + Portrait */}
              <div className="relative shrink-0">
                <CaptainAvatar
                  captainId={player.id}
                  color={player.color}
                  size="sm"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 shadow"
                  style={{ backgroundColor: player.color }}
                />
              </div>

              <div className="min-w-0 flex-1">
                {/* Captain Name + Jail / Bankrupt Icon */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight">
                    {player.name}
                  </span>
                  {player.bankrupt ? (
                    <Skull className="w-3 h-3 text-rose-400 shrink-0" />
                  ) : player.inJail ? (
                    <span className="text-[10px] leading-none shrink-0" title="En Cale">
                      ⛓️
                    </span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  ) : null}
                </div>

                {/* High-Contrast Stats Pill (Gold, Materials, Islands) */}
                <div
                  className={`mt-1 border rounded-md px-1.5 py-0.5 flex items-center justify-between text-[11px] leading-none gap-1 transition-colors ${
                    isGain
                      ? 'bg-emerald-950/90 border-emerald-400/80'
                      : isLoss
                      ? 'bg-rose-950/90 border-rose-400/80'
                      : 'bg-black/60 border-white/10'
                  }`}
                >
                  <motion.span
                    key={`gold-${player.id}-${player.gold}`}
                    initial={{ scale: 1.35 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 16 }}
                    className={`flex items-center gap-0.5 font-black ${
                      isGain
                        ? 'text-emerald-300'
                        : isLoss
                        ? 'text-rose-300'
                        : 'text-amber-300'
                    }`}
                    title="Or (Doublons)"
                  >
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    {player.gold}
                  </motion.span>
                  <span
                    className="flex items-center gap-0.5 font-extrabold text-orange-200"
                    title="Matériaux"
                  >
                    <span className="text-[10px]">🪵</span>
                    {player.materials}
                  </span>
                  <span
                    className="flex items-center gap-0.5 font-extrabold text-cyan-300"
                    title="Îles possédées"
                  >
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {islandCount}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </header>
  );
};

