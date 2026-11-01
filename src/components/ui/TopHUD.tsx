import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FastForward,
  Volume2,
  VolumeX,
  Camera,
  Compass,
  Coins,
  MapPin,
  Skull,
  Users,
} from 'lucide-react';
import { useGameStore, INITIAL_MATERIALS } from '../../store/useGameStore';
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
  const botSpeed = useGameStore((s) => s.botSpeed);
  const toggleBotSpeed = useGameStore((s) => s.toggleBotSpeed);
  const phase = useGameStore((s) => s.phase);
  const setShowSetupModal = useGameStore((s) => s.setShowSetupModal);

  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted());
  const [deltas, setDeltas] = useState<Record<number, PlayerDeltaBadge>>({});
  const prevStatsRef = useRef<Record<number, { gold: number; materials: number }>>({});

  useEffect(() => {
    const prev = prevStatsRef.current;
    // Detect if a brand new game was initialized
    const isFreshReset =
      players.length > 0 &&
      players.every(
        (p) =>
          p.gold === 1500 &&
          p.materials === INITIAL_MATERIALS &&
          p.position === 0
      );

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
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <header className="relative z-20 w-full wood-panel border-b-4 border-amber-950 px-2 pt-[max(0.375rem,env(safe-area-inset-top))] pb-1.5 flex flex-col gap-1.5 select-none shrink-0">
      {/* Top Bar: Official Logo Badge + Compact Action Icons */}
      <div className="flex items-center justify-between gap-2">
        <div className="wood-plank wood-nails px-2 py-0.5 rounded-lg flex items-center gap-1.5 min-w-0">
          <img
            src="./assets/pirate_logo.png"
            alt="Jolly Roger's Logo"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] shrink-0"
          />
          <span className="font-cinzel text-amber-200 text-[11px] sm:text-sm font-black leading-tight sm:tracking-wider drop-shadow">
            JOLLY ROGER&apos;S
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Crew / Players, Solo & Local Multiplayer Setup Button */}
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="wood-plank flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold text-amber-100 hover:brightness-110 active:scale-95 transition cursor-pointer border border-emerald-400/40"
            title="Mode Solo ou Multijoueur Local (2 à 4 joueurs)"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {players.filter((p) => !p.isAI).length >= 2
                ? `Multi ${players.filter((p) => !p.isAI).length}J`
                : 'Modes'}
            </span>
          </button>

          {/* Bot Speed Accelerator Icon Button */}
          {players.some((p) => p.isAI) && phase !== 'GAME_OVER' && (
            <button
              type="button"
              onClick={toggleBotSpeed}
              aria-pressed={botSpeed === 'FAST'}
              aria-label="Accélérer les bots"
              title={
                botSpeed === 'FAST'
                  ? 'Bots rapides (cliquer pour revenir à la vitesse normale)'
                  : 'Accélérer les bots'
              }
              className={`p-1.5 rounded-lg active:scale-95 transition cursor-pointer ${
                botSpeed === 'FAST'
                  ? 'bg-gradient-to-b from-cyan-400 to-cyan-600 text-slate-950'
                  : 'wood-plank text-cyan-300 hover:brightness-110'
              }`}
            >
              <FastForward className="w-4 h-4" />
            </button>
          )}

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

      {/* Captains Grid (2 columns on mobile so full names + coins + materials are always readable) */}
      <div className={`grid ${gridColsClass} gap-1.5`}>
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
              onClick={() => {
                useGameStore.getState().focusOnPlayer(player.id);
                useGameStore.getState().setInspectedPlayerId(player.id);
              }}
              title={`Voir les acquisitions et bonus de ${player.name}`}
              animate={
                isLoss
                  ? { x: [0, -5, 5, -4, 4, 0], scale: 1.02 }
                  : isGain
                  ? { scale: [1, 1.06, 1.02] }
                  : { scale: isCurrent ? 1.01 : 1, x: 0 }
              }
              transition={{ duration: 0.45 }}
              style={
                player.bankrupt
                  ? undefined
                  : {
                      borderColor: isGain
                        ? '#34d399'
                        : isLoss
                        ? '#f43f5e'
                        : player.color,
                      boxShadow: isGain
                        ? '0 0 18px rgba(16,185,129,0.85)'
                        : isLoss
                        ? '0 0 18px rgba(244,63,94,0.85)'
                        : isCurrent
                        ? `0 0 16px ${player.color}99, inset 0 0 14px ${player.color}38`
                        : `0 3px 8px rgba(0,0,0,0.6), inset 0 0 10px ${player.color}22`,
                    }
              }
              className={`relative wood-plank cursor-pointer rounded-xl pl-2.5 pr-1.5 py-1 transition-all flex items-center gap-1.5 overflow-hidden ${
                player.bankrupt
                  ? 'opacity-40 grayscale'
                  : isGain
                  ? 'ring-2 ring-emerald-400 brightness-120'
                  : isLoss
                  ? 'ring-2 ring-rose-500'
                  : isCurrent
                  ? 'ring-2 ring-white/80 brightness-115'
                  : 'opacity-95 hover:opacity-100 hover:brightness-110'
              }`}
            >
              {/* Player Color Left Banner Strip & Subtle Tint */}
              {!player.bankrupt && (
                <>
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
                    style={{
                      backgroundColor: player.color,
                      boxShadow: `0 0 8px ${player.color}`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, ${player.color}33 0%, ${player.color}10 55%, transparent 100%)`,
                    }}
                  />
                </>
              )}

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

              {/* Captain Color Badge (J1..J4 or IA) + Portrait */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  useGameStore.getState().focusOnPlayer(player.id);
                  useGameStore.getState().setInspectedPlayerId(player.id);
                }}
                aria-label={`Acquisitions et bonus de ${player.name}`}
                className="relative z-10 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <CaptainAvatar
                  captainId={player.id}
                  color={player.color}
                  size="sm"
                />
                <span
                  className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-black text-white border border-slate-950 shadow leading-none"
                  style={{ backgroundColor: player.color }}
                >
                  {player.isAI ? 'IA' : `J${index + 1}`}
                </span>
              </button>

              <div className="relative z-10 min-w-0 flex-1">
                {/* Captain Full Name + Upgrade Badges + Jail / Bankrupt Icon */}
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[11px] sm:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight flex flex-wrap items-center gap-x-1 min-w-0">
                    <span
                      className="min-w-0 break-words"
                      style={{ color: player.accentColor || '#ffffff' }}
                    >
                      {player.name}
                    </span>
                    {player.hasPerfectBoarding && (
                      <span className="text-[10px] shrink-0" title="Abordage Parfait (50% Or)">
                        ⚔️
                      </span>
                    )}
                    {player.hasCulverin && (
                      <span className="text-[10px] shrink-0" title="Tir de Coulevrine (≤3 cases)">
                        🎯
                      </span>
                    )}
                  </div>
                  {player.bankrupt ? (
                    <Skull className="w-3 h-3 text-rose-400 shrink-0" />
                  ) : player.inJail ? (
                    <span className="text-[10px] leading-none shrink-0" title="En Cale">
                      ⛓️
                    </span>
                  ) : isCurrent ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0 border border-white/80"
                      style={{
                        backgroundColor: player.color,
                        boxShadow: `0 0 8px ${player.color}`,
                      }}
                    />
                  ) : null}
                </div>

                {/* High-Contrast Stats Pill (Gold Coins, Materials, Islands) */}
                <div
                  className={`mt-0.5 border rounded-md px-1 py-0.5 flex flex-wrap items-center justify-between text-[11px] leading-none gap-x-1 gap-y-0.5 transition-colors ${
                    isGain
                      ? 'bg-emerald-950/90 border-emerald-400/80'
                      : isLoss
                      ? 'bg-rose-950/90 border-rose-400/80'
                      : 'bg-black/65 border-white/15'
                  }`}
                >
                  <motion.span
                    key={`gold-${player.id}-${player.gold}`}
                    initial={{ scale: 1.35 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 16 }}
                    className={`flex items-center gap-0.5 font-black shrink-0 ${
                      isGain
                        ? 'text-emerald-300'
                        : isLoss
                        ? 'text-rose-300'
                        : 'text-amber-300'
                    }`}
                    title="Pièces d'Or"
                  >
                    <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{player.gold}</span>
                  </motion.span>
                  <span
                    className="flex items-center gap-0.5 font-black text-orange-200 shrink-0"
                    title="Matériaux de construction"
                  >
                    <span className="text-[10px]">🪵</span>
                    <span>{player.materials}</span>
                  </span>
                  <span
                    className="flex items-center gap-0.5 font-extrabold text-cyan-300 shrink-0"
                    title="Îles possédées"
                  >
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span>{islandCount}</span>
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

