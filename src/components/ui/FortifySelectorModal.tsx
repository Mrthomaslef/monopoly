import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, Coins, ArrowRight, X } from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  FORTIFY_MATERIAL_COST,
  MAX_FORTIFY_LEVEL,
  FORTRESS_LEVEL_NAMES,
  FORTRESS_LEVEL_IMAGES,
  TileData,
} from '../../store/useGameStore';

export const FortifySelectorModal: React.FC = () => {
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const setShowFortifyModal = useGameStore((s) => s.setShowFortifyModal);
  const tiles = useGameStore((s) => s.tiles);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const hasFortifiedThisTurn = useGameStore((s) => s.hasFortifiedThisTurn);
  const fortifyIsland = useGameStore((s) => s.fortifyIsland);

  const activePlayer = players[currentPlayerIndex];

  if (!showFortifyModal || !activePlayer || hasFortifiedThisTurn) {
    return null;
  }

  const upgradableIslands = tiles.filter(
    (t) =>
      t.type === 'island' &&
      t.ownerId === activePlayer.id &&
      t.level < MAX_FORTIFY_LEVEL
  );

  if (upgradableIslands.length === 0) {
    return null;
  }

  const focusedOwnedIsland =
    upgradableIslands.find((t) => t.id === focusedTileIndex) ??
    upgradableIslands[0] ??
    null;

  const canFortifyTile = (tile: TileData) =>
    !hasFortifiedThisTurn &&
    tile.level < MAX_FORTIFY_LEVEL &&
    (tile.upgradeCost ?? 0) <= activePlayer.gold &&
    activePlayer.materials >= FORTIFY_MATERIAL_COST;

  const focusTileOnBoard = (tileId: number) => {
    useGameStore.setState({ focusedTileIndex: tileId });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="fortify-selector-modal"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-2 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-[355px] max-h-full flex flex-col rounded-2xl wood-panel border-4 border-cyan-400/90 shadow-[0_18px_45px_rgba(0,0,0,0.88),0_0_28px_rgba(34,211,238,0.45)] overflow-hidden">
          {/* Header Banner */}
          <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-slate-950/90 via-cyan-950/85 to-slate-950/90 border-b-2 border-amber-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 shrink-0">
                <Castle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-pirata text-lg leading-none tracking-wide text-amber-100">
                  Fortifier une Île
                </h2>
                <div className="text-[10px] font-bold text-cyan-200/90 flex flex-wrap items-center gap-x-2 mt-0.5">
                  <span>💰 {activePlayer.gold} Or</span>
                  <span>•</span>
                  <span>🪵 {activePlayer.materials}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFortifyModal(false)}
              className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-amber-100 border border-white/25 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable List of Upgradable Owned Islands */}
          <div className="p-2.5 space-y-2 min-h-0 flex-1 overflow-y-auto pirate-scroll">
            {upgradableIslands.map((tile) => {
              const isSelected = focusedOwnedIsland?.id === tile.id;
              const eligible = canFortifyTile(tile);
              const currentRent = calculateIslandRent(tile, tiles);
              const nextLevel = tile.level + 1;
              const nextLevelTile: TileData = {
                ...tile,
                level: nextLevel,
              };
              const nextRent = calculateIslandRent(nextLevelTile, tiles);
              const previewImg = FORTRESS_LEVEL_IMAGES[nextLevel];

              return (
                <div
                  key={tile.id}
                  onClick={() => focusTileOnBoard(tile.id)}
                  className={`parchment-card rounded-xl p-2 border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-cyan-500 ring-2 ring-cyan-400/60 shadow-md'
                      : 'border-amber-900/70 opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-10 h-10 rounded-lg bg-amber-950/20 border border-amber-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                      {previewImg && (
                        <img
                          src={previewImg}
                          alt={FORTRESS_LEVEL_NAMES[nextLevel]}
                          className="w-9 h-9 object-contain drop-shadow"
                        />
                      )}
                      <span
                        className="absolute top-0.5 right-0.5 w-2.5 h-2 rounded-[2px] border border-amber-200 shadow"
                        style={{ backgroundColor: activePlayer.color }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                          style={{ backgroundColor: tile.color }}
                        />
                        <span className="text-xs font-black leading-tight text-amber-950">
                          {tile.name}
                        </span>
                      </div>

                      <div className="text-[10px] font-extrabold text-amber-900 mt-0.5">
                        {FORTRESS_LEVEL_NAMES[nextLevel]}
                      </div>

                      <div className="text-[10px] font-extrabold text-emerald-900 inline-flex items-center gap-0.5">
                        Loyer {currentRent} <ArrowRight className="w-2.5 h-2.5" />{' '}
                        {nextRent} Or
                      </div>
                    </div>
                  </div>

                  {/* Direct Fortify Action Button for this Island */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={!eligible}
                      onClick={(e) => {
                        e.stopPropagation();
                        fortifyIsland(tile.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] flex flex-col items-end leading-tight transition ${
                        eligible
                          ? 'bg-gradient-to-b from-cyan-500 to-teal-700 text-white border border-cyan-200 shadow cursor-pointer hover:brightness-110'
                          : 'bg-amber-950/20 text-amber-900/50 border border-amber-900/20 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Castle className="w-3 h-3" />
                        <span>Fortifier</span>
                      </span>
                      <span className="text-[9px] font-extrabold opacity-95 flex items-center gap-0.5">
                        <Coins className="w-2.5 h-2.5" />
                        {tile.upgradeCost} Or + {FORTIFY_MATERIAL_COST} 🪵
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
