import React from 'react';
import { motion } from 'framer-motion';
import {
  Flag,
  Castle,
  Crosshair,
  SkipForward,
  ScrollText,
  Dices,
  KeyRound,
  Bot,
} from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  FORTIFY_MATERIAL_COST,
  MAX_FORTIFY_LEVEL,
  FORTRESS_LEVEL_NAMES,
} from '../../store/useGameStore';

export const BottomDeck: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const phase = useGameStore((s) => s.phase);
  const actionLogs = useGameStore((s) => s.actionLogs);
  const hasAttackedThisTurn = useGameStore((s) => s.hasAttackedThisTurn);
  const showSetupModal = useGameStore((s) => s.showSetupModal);

  const rollDice = useGameStore((s) => s.rollDice);
  const payBailAndRoll = useGameStore((s) => s.payBailAndRoll);
  const buyIsland = useGameStore((s) => s.buyIsland);
  const setShowFortifyModal = useGameStore((s) => s.setShowFortifyModal);
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const triggerManualNavalBattle = useGameStore((s) => s.triggerManualNavalBattle);
  const endTurn = useGameStore((s) => s.endTurn);

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn = Boolean(
    activePlayer && !activePlayer.isAI && !activePlayer.bankrupt && !showSetupModal
  );

  const currentTile = tiles[activePlayer ? activePlayer.position : 0];
  const inspectedTile = tiles[focusedTileIndex] ?? currentTile;
  const tileOwner =
    inspectedTile.ownerId !== null
      ? players.find((p) => p.id === inspectedTile.ownerId) ?? null
      : null;

  const canRoll = isHumanTurn && phase === 'IDLE';
  const canPayBail =
    canRoll && Boolean(activePlayer?.inJail) && (activePlayer?.gold ?? 0) >= 100;

  const isPostMovePhase =
    isHumanTurn && (phase === 'TILE_ACTION' || phase === 'END_TURN');

  const canBuyCurrent =
    isPostMovePhase &&
    currentTile.type === 'island' &&
    currentTile.ownerId === null &&
    (currentTile.price ?? 0) <= (activePlayer?.gold ?? 0);

  const fortifiableIslands = activePlayer
    ? tiles.filter(
        (t) =>
          t.type === 'island' &&
          t.ownerId === activePlayer.id &&
          t.level < MAX_FORTIFY_LEVEL &&
          (t.upgradeCost ?? 0) <= activePlayer.gold
      )
    : [];

  const canFortify =
    isPostMovePhase &&
    fortifiableIslands.length > 0 &&
    (activePlayer?.materials ?? 0) >= FORTIFY_MATERIAL_COST;

  const rivalsOnCurrentTile = activePlayer
    ? players.filter(
        (p) =>
          p.id !== activePlayer.id &&
          !p.bankrupt &&
          p.position === activePlayer.position
      )
    : [];

  const canFireCannon =
    isPostMovePhase && !hasAttackedThisTurn && rivalsOnCurrentTile.length > 0;

  return (
    <section className="relative z-20 w-full wood-panel border-t-4 border-amber-950 px-3 py-2 flex flex-col gap-2 select-none">
      {/* 1. Fiche de Case Parchemin (Haute Lisibilité) */}
      <div className="parchment-card rounded-xl px-3 py-2 border-2 border-amber-900 flex items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3.5 h-10 rounded-md shrink-0 border border-black/40 shadow-xs"
            style={{ backgroundColor: inspectedTile.color }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-slate-950 truncate leading-tight">
                {inspectedTile.name}
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-950/15 text-amber-950 shrink-0">
                {inspectedTile.group}
              </span>
            </div>

            {inspectedTile.type === 'island' ? (
              <div className="mt-0.5 text-xs font-extrabold text-amber-950 flex flex-wrap items-center gap-x-2">
                <span>Prix : {inspectedTile.price} Or</span>
                <span>•</span>
                <span>Loyer : {calculateIslandRent(inspectedTile, tiles)} Or</span>
                {inspectedTile.level > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-900">
                      {FORTRESS_LEVEL_NAMES[inspectedTile.level]}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-0.5 text-xs font-semibold text-amber-950/90 truncate">
                {inspectedTile.description}
              </div>
            )}
          </div>
        </div>

        {/* Badge Propriétaire / Statut */}
        <div className="shrink-0 text-right">
          {inspectedTile.type === 'island' ? (
            tileOwner ? (
              <span
                className="inline-block text-xs font-black px-2.5 py-1 rounded-full text-white shadow border border-white/40"
                style={{ backgroundColor: tileOwner.color }}
              >
                {tileOwner.name}
              </span>
            ) : (
              <span className="inline-block text-xs font-black uppercase px-2.5 py-1 rounded-full bg-emerald-800 text-white shadow">
                Île Libre
              </span>
            )
          ) : (
            <span className="inline-block text-xs font-black uppercase px-2 py-0.5 rounded-md bg-amber-950/15 text-amber-950">
              Case #{inspectedTile.id}
            </span>
          )}
        </div>
      </div>

      {/* 2. Barre d'Actions Contextuelle (Uniquement les boutons utiles au moment présent) */}
      <div className="min-h-[46px] flex items-center gap-2">
        {canRoll && activePlayer ? (
          <>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={rollDice}
              className="flex-1 py-3 px-4 rounded-xl font-black text-sm sm:text-base uppercase tracking-wider bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-amber-100 shadow-[0_4px_18px_rgba(251,191,36,0.55)] flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Dices className="w-5 h-5 shrink-0 animate-bounce" />
              <span>Lancer les Dés — {activePlayer.name}</span>
            </motion.button>

            {canPayBail && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={payBailAndRoll}
                className="wood-plank py-3 px-3 rounded-xl font-black text-xs text-amber-200 border-2 border-amber-400/70 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Caution (100 Or)</span>
              </motion.button>
            )}
          </>
        ) : isPostMovePhase ? (
          <>
            {canBuyCurrent && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={buyIsland}
                className="flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 border-2 border-emerald-200 shadow-[0_4px_15px_rgba(16,185,129,0.45)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-4 h-4 shrink-0" />
                <span className="truncate">Acheter ({currentTile.price} Or)</span>
              </motion.button>
            )}

            {canFireCannon && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={triggerManualNavalBattle}
                className="flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-b from-rose-500 to-red-700 text-white border-2 border-rose-300 shadow-[0_4px_15px_rgba(244,63,94,0.5)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crosshair className="w-4 h-4 shrink-0" />
                <span className="truncate">Aborder !</span>
              </motion.button>
            )}

            {canFortify && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setShowFortifyModal(!showFortifyModal)}
                className="flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-b from-cyan-300 to-cyan-500 text-slate-950 border-2 border-cyan-100 shadow-[0_4px_15px_rgba(6,182,212,0.45)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Castle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Fortifier ({fortifiableIslands.length})
                </span>
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={endTurn}
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-2 border-amber-200 shadow-[0_4px_15px_rgba(249,115,22,0.45)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SkipForward className="w-4 h-4 shrink-0" />
              <span className="truncate">Fin du Tour</span>
            </motion.button>
          </>
        ) : (
          <div className="w-full wood-plank rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-amber-200 border border-amber-500/30">
            {activePlayer?.isAI ? (
              <>
                <Bot className="w-4 h-4 text-cyan-300 animate-spin shrink-0" />
                <span>{activePlayer.name} (IA) joue son tour...</span>
              </>
            ) : (
              <>
                <Dices className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span>Déplacement du navire en cours...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Bandeau Journal de Bord (1 ligne claire et lisible) */}
      <div className="bg-black/55 border border-amber-500/25 rounded-lg px-3 py-1.5 flex items-center gap-2">
        <ScrollText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <div className="text-xs font-bold text-amber-100 truncate">
          {actionLogs[0] ?? '⚓ Bienvenue dans Jolly Roger’s !'}
        </div>
      </div>
    </section>
  );
};
