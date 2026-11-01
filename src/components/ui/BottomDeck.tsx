import React from 'react';
import { motion } from 'framer-motion';
import {
  Dices,
  Flag,
  Castle,
  Crosshair,
  SkipForward,
  KeyRound,
  ScrollText,
} from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
} from '../../store/useGameStore';

export const BottomDeck: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const phase = useGameStore((s) => s.phase);
  const actionLogs = useGameStore((s) => s.actionLogs);

  const rollDice = useGameStore((s) => s.rollDice);
  const buyIsland = useGameStore((s) => s.buyIsland);
  const fortifyIsland = useGameStore((s) => s.fortifyIsland);
  const payBailAndRoll = useGameStore((s) => s.payBailAndRoll);
  const triggerManualNavalBattle = useGameStore((s) => s.triggerManualNavalBattle);
  const endTurn = useGameStore((s) => s.endTurn);

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn = activePlayer && !activePlayer.isAI && !activePlayer.bankrupt;

  // Show the tile the active player is standing on, or the tile tapped by the user
  const currentTile = tiles[activePlayer ? activePlayer.position : 0];
  const inspectedTile = tiles[focusedTileIndex] ?? currentTile;
  const tileOwner =
    inspectedTile.ownerId !== null
      ? players.find((p) => p.id === inspectedTile.ownerId) ?? null
      : null;

  // Can buy current tile?
  const canBuyCurrent =
    isHumanTurn &&
    (phase === 'TILE_ACTION' || phase === 'END_TURN') &&
    currentTile.type === 'island' &&
    currentTile.ownerId === null &&
    (currentTile.price ?? 0) <= activePlayer.gold;

  // Can fortify current tile (or inspected tile if owned by activePlayer)?
  const targetFortifyTile =
    inspectedTile.type === 'island' &&
    inspectedTile.ownerId === activePlayer?.id &&
    inspectedTile.level < 4
      ? inspectedTile
      : currentTile.type === 'island' &&
        currentTile.ownerId === activePlayer?.id &&
        currentTile.level < 4
      ? currentTile
      : tiles.find(
          (t) =>
            t.type === 'island' &&
            t.ownerId === activePlayer?.id &&
            t.level < 4 &&
            (t.upgradeCost ?? 0) <= (activePlayer?.gold ?? 0)
        ) ?? null;

  const canFortify =
    isHumanTurn &&
    (phase === 'TILE_ACTION' || phase === 'END_TURN') &&
    targetFortifyTile !== null &&
    (targetFortifyTile.upgradeCost ?? 0) <= activePlayer.gold;

  // Rivals on the active player's tile for "Tirer au Canon"
  const rivalsOnCurrentTile = activePlayer
    ? players.filter(
        (p) =>
          p.id !== activePlayer.id &&
          !p.bankrupt &&
          p.position === activePlayer.position
      )
    : [];

  const canFireCannon =
    isHumanTurn &&
    (phase === 'TILE_ACTION' || phase === 'END_TURN') &&
    rivalsOnCurrentTile.length > 0;

  const canRoll = isHumanTurn && phase === 'IDLE';
  const canEndTurn =
    isHumanTurn && (phase === 'TILE_ACTION' || phase === 'END_TURN');

  const levelLabels = [
    'Mouillage Vierge',
    'Avant-poste Niv.1',
    'Avant-poste Niv.2',
    'Avant-poste Niv.3',
    '🏰 Forteresse Pirate',
  ];

  return (
    <section className="relative z-20 h-[25dvh] min-h-[178px] max-h-[240px] w-full wood-panel border-t-2 border-amber-600/80 px-3 py-2 flex flex-col justify-between select-none">
      {/* Top Row: Parchment Tile Inspector Card + Turn Indicator */}
      <div className="flex items-stretch gap-2">
        {/* Parchment Tile Info Card */}
        <div className="flex-1 parchment-card rounded-lg px-2.5 py-1.5 border border-amber-800/60 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3.5 h-9 rounded-sm shrink-0 border border-amber-950/50 shadow-inner"
              style={{ backgroundColor: inspectedTile.color }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black tracking-tight text-amber-950 truncate">
                  {inspectedTile.name}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-900/20 text-amber-900 shrink-0">
                  {inspectedTile.group}
                </span>
              </div>

              {inspectedTile.type === 'island' ? (
                <div className="text-[11px] font-semibold text-amber-900/90 flex flex-wrap items-center gap-x-2">
                  <span>Prix: {inspectedTile.price} Or</span>
                  <span>•</span>
                  <span>
                    Loyer: {calculateIslandRent(inspectedTile, tiles)} Or
                  </span>
                  <span>•</span>
                  <span className="text-amber-800 font-bold">
                    {levelLabels[inspectedTile.level]}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] font-medium text-amber-900/85 truncate">
                  {inspectedTile.description}
                </div>
              )}
            </div>
          </div>

          {/* Owner Crest Badge */}
          <div className="shrink-0 text-right">
            {inspectedTile.type === 'island' ? (
              tileOwner ? (
                <div className="flex flex-col items-end">
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow"
                    style={{ backgroundColor: tileOwner.color }}
                  >
                    {tileOwner.name}
                  </span>
                  {inspectedTile.level < 4 && (
                    <span className="text-[10px] font-bold text-amber-900 mt-0.5">
                      Fortif: {inspectedTile.upgradeCost} Or
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-800 text-emerald-100">
                  Île Libre
                </span>
              )
            ) : (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-950">
                Case #{inspectedTile.id}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Thumb-Friendly Command Action Buttons */}
      <div className="grid grid-cols-4 gap-1.5 my-1">
        {/* 1. Lancer les Dés (or Caution if in Jail) */}
        {activePlayer?.inJail && canRoll && activePlayer.gold >= 100 ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={payBailAndRoll}
            className="col-span-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-extrabold text-xs bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border border-amber-200 shadow-lg"
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            <span className="truncate">Caution 100 Or</span>
          </motion.button>
        ) : (
          <motion.button
            whileTap={canRoll ? { scale: 0.95 } : undefined}
            type="button"
            disabled={!canRoll}
            onClick={rollDice}
            className={`col-span-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-extrabold text-xs border transition shadow-md ${
              canRoll
                ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.5)] cursor-pointer'
                : 'bg-stone-900/70 text-stone-500 border-stone-800 cursor-not-allowed'
            }`}
          >
            <Dices className="w-4 h-4 shrink-0" />
            <span className="truncate">Lancer Dés</span>
          </motion.button>
        )}

        {/* 2. Acheter l'Île */}
        <motion.button
          whileTap={canBuyCurrent ? { scale: 0.95 } : undefined}
          type="button"
          disabled={!canBuyCurrent}
          onClick={buyIsland}
          className={`col-span-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-extrabold text-xs border transition shadow-md ${
            canBuyCurrent
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.45)] cursor-pointer'
              : 'bg-stone-900/70 text-stone-500 border-stone-800 cursor-not-allowed'
          }`}
        >
          <Flag className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {canBuyCurrent ? `Acheter (${currentTile.price})` : 'Acheter l’Île'}
          </span>
        </motion.button>

        {/* 3. Fortifier OR Tirer au Canon */}
        {canFireCannon ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={triggerManualNavalBattle}
            className="col-span-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-extrabold text-xs bg-gradient-to-b from-rose-500 to-red-700 text-white border border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tirer au Canon</span>
          </motion.button>
        ) : (
          <motion.button
            whileTap={canFortify ? { scale: 0.95 } : undefined}
            type="button"
            disabled={!canFortify}
            onClick={() =>
              targetFortifyTile && fortifyIsland(targetFortifyTile.id)
            }
            className={`col-span-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-extrabold text-xs border transition shadow-md ${
              canFortify
                ? 'bg-gradient-to-b from-cyan-500 to-blue-700 text-white border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.45)] cursor-pointer'
                : 'bg-stone-900/70 text-stone-500 border-stone-800 cursor-not-allowed'
            }`}
          >
            <Castle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {canFortify && targetFortifyTile
                ? `Fortifier (${targetFortifyTile.upgradeCost})`
                : 'Fortifier'}
            </span>
          </motion.button>
        )}

        {/* 4. Fin du Tour */}
        <motion.button
          whileTap={canEndTurn ? { scale: 0.95 } : undefined}
          type="button"
          disabled={!canEndTurn}
          onClick={endTurn}
          className={`col-span-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg font-extrabold text-xs border transition shadow-md ${
            canEndTurn
              ? 'bg-gradient-to-b from-orange-500 to-amber-700 text-white border-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.45)] cursor-pointer'
              : 'bg-stone-900/70 text-stone-500 border-stone-800 cursor-not-allowed'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Fin du Tour</span>
        </motion.button>
      </div>

      {/* Bottom Row: Scrolling Ticker of the Last 3 Actions */}
      <div className="bg-black/45 border border-amber-900/60 rounded-md px-2.5 py-1 flex items-start gap-2 h-11 overflow-y-auto pirate-scroll">
        <ScrollText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-0.5 text-[11px] leading-tight">
          {actionLogs.slice(0, 3).map((log, index) => (
            <div
              key={index}
              className={`truncate ${
                index === 0
                  ? 'text-amber-200 font-bold'
                  : 'text-amber-100/65 font-normal'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
