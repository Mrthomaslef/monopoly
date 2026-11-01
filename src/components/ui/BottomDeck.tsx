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
  Sparkles,
  Flame,
  Handshake,
  Skull,
} from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  FORTIFY_MATERIAL_COST,
  MAX_FORTIFY_LEVEL,
  FORTRESS_LEVEL_NAMES,
  canAccessUpgradesShop,
  getCulverinTargets,
} from '../../store/useGameStore';

const PrimaryButton: React.FC<{
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}> = ({ onClick, className, children }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    type="button"
    onClick={onClick}
    className={`flex-1 min-w-0 py-2.5 px-2 rounded-xl font-black text-xs sm:text-sm uppercase leading-tight text-center border-2 shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${className}`}
  >
    {children}
  </motion.button>
);

const SecondaryButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title: string;
  className: string;
}> = ({ onClick, icon, label, title, className }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    type="button"
    onClick={onClick}
    title={title}
    className={`flex-1 min-w-0 py-1 px-0.5 rounded-xl font-black text-[11px] leading-tight text-center border-2 shadow-md flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer ${className}`}
  >
    {icon}
    <span>{label}</span>
  </motion.button>
);

export const BottomDeck: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);
  const isRollingDice = useGameStore((s) => s.isRollingDice);
  const actionLogs = useGameStore((s) => s.actionLogs);
  const hasAttackedThisTurn = useGameStore((s) => s.hasAttackedThisTurn);
  const hasFortifiedThisTurn = useGameStore((s) => s.hasFortifiedThisTurn);
  const hasFiredCulverinThisTurn = useGameStore((s) => s.hasFiredCulverinThisTurn);
  const showSetupModal = useGameStore((s) => s.showSetupModal);
  const landedTilePopup = useGameStore((s) => s.landedTilePopup);

  const rollDice = useGameStore((s) => s.rollDice);
  const payBailAndRoll = useGameStore((s) => s.payBailAndRoll);
  const buyIsland = useGameStore((s) => s.buyIsland);
  const setShowFortifyModal = useGameStore((s) => s.setShowFortifyModal);
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const setShowUpgradesModal = useGameStore((s) => s.setShowUpgradesModal);
  const showUpgradesModal = useGameStore((s) => s.showUpgradesModal);
  const triggerManualNavalBattle = useGameStore((s) => s.triggerManualNavalBattle);
  const endTurn = useGameStore((s) => s.endTurn);
  const setShowTradeModal = useGameStore((s) => s.setShowTradeModal);
  const setShowCurseModal = useGameStore((s) => s.setShowCurseModal);

  // Une carte ouverte sur le plateau reprend ces infos et actions : sur petit écran on lui laisse la place
  const collapseOnShortScreen =
    landedTilePopup || showFortifyModal ? '[@media(max-height:700px)]:hidden' : '';

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

  const isAnyTurnActionPhase =
    isHumanTurn && (phase === 'IDLE' || phase === 'TILE_ACTION' || phase === 'END_TURN');

  const canBuyCurrent =
    isPostMovePhase &&
    currentTile.type === 'island' &&
    currentTile.ownerId === null &&
    (currentTile.price ?? 0) <= (activePlayer?.gold ?? 0);

  // All owned islands across the entire map that haven't reached max fortification level yet
  const ownedUpgradableIslands = activePlayer
    ? tiles.filter(
        (t) =>
          t.type === 'island' &&
          t.ownerId === activePlayer.id &&
          t.level < MAX_FORTIFY_LEVEL
      )
    : [];

  const fortifiableIslands = ownedUpgradableIslands.filter(
    (t) => (t.upgradeCost ?? 0) <= (activePlayer?.gold ?? 0)
  );

  const canFortify =
    isAnyTurnActionPhase &&
    !hasFortifiedThisTurn &&
    fortifiableIslands.length > 0 &&
    (activePlayer?.materials ?? 0) >= FORTIFY_MATERIAL_COST;

  const canShopUpgrades =
    isAnyTurnActionPhase &&
    Boolean(activePlayer && canAccessUpgradesShop(activePlayer, tiles));

  const culverinTargets =
    isAnyTurnActionPhase &&
    activePlayer?.hasCulverin &&
    !hasFiredCulverinThisTurn
      ? getCulverinTargets(activePlayer, tiles)
      : [];

  const canUseCulverinNow = culverinTargets.length > 0;
  const showArsenalButton = canShopUpgrades || canUseCulverinNow;

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

  const secondaryButtons = isAnyTurnActionPhase && (
    <>
      {canFortify && (
        <SecondaryButton
          onClick={() => setShowFortifyModal(!showFortifyModal)}
          icon={<Castle className="w-4 h-4 shrink-0" />}
          label="Fortifier"
          title="Fortifier une île"
          className="bg-gradient-to-b from-cyan-300 to-cyan-500 text-slate-950 border-cyan-100"
        />
      )}
      {showArsenalButton && (
        <SecondaryButton
          onClick={() => setShowUpgradesModal(!showUpgradesModal)}
          icon={
            canUseCulverinNow ? (
              <Flame className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )
          }
          label={canUseCulverinNow ? 'Tirer' : 'Arsenal'}
          title={canUseCulverinNow ? 'Tirer à la Coulevrine' : 'Arsenal & Améliorations'}
          className={
            canUseCulverinNow
              ? 'bg-gradient-to-b from-red-500 to-red-700 text-white border-red-200'
              : 'bg-gradient-to-b from-purple-400 to-indigo-600 text-white border-purple-200'
          }
        />
      )}
      {activePlayer?.hasCurseCharge && (
        <SecondaryButton
          onClick={() => setShowCurseModal(true)}
          icon={<Skull className="w-4 h-4 shrink-0" />}
          label="Maudire"
          title="Lancer une malédiction"
          className="bg-gradient-to-b from-purple-500 to-purple-800 text-white border-purple-200"
        />
      )}
      <SecondaryButton
        onClick={() => setShowTradeModal(true)}
        icon={<Handshake className="w-4 h-4 shrink-0" />}
        label="Échanger"
        title="Échanger avec un capitaine"
        className="bg-gradient-to-b from-sky-400 to-blue-600 text-white border-sky-100"
      />
      {canRoll && canPayBail && (
        <SecondaryButton
          onClick={payBailAndRoll}
          icon={<KeyRound className="w-4 h-4 shrink-0" />}
          label="Caution 100"
          title="Payer 100 Or de caution et lancer les dés"
          className="wood-plank text-amber-200"
        />
      )}
    </>
  );

  return (
    <section className="relative z-20 w-full shrink-0 wood-panel border-t-4 border-amber-950 px-2.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5 select-none">
      {/* 1. Fiche de Case Parchemin (Haute Lisibilité) */}
      <div className={`parchment-card rounded-xl px-2.5 py-1.5 border-2 border-amber-900 flex items-center justify-between gap-2 shadow-md ${collapseOnShortScreen}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3.5 h-10 rounded-md shrink-0 border border-black/40 shadow-xs"
            style={{ backgroundColor: inspectedTile.color }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5">
              <span className="text-sm sm:text-base font-black text-slate-950 leading-tight">
                {inspectedTile.name}
              </span>
              {inspectedTile.trapped && inspectedTile.level > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px] font-black uppercase shrink-0">
                  💣 Piégée
                </span>
              )}
            </div>

            {inspectedTile.type === 'island' ? (
              <div className="mt-0.5 text-xs font-extrabold text-amber-950 flex flex-wrap items-center gap-x-2">
                {tileOwner ? (
                  <>
                    <span>Loyer : {calculateIslandRent(inspectedTile, tiles)} Or</span>
                    {inspectedTile.level > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-900">
                          {FORTRESS_LEVEL_NAMES[inspectedTile.level]}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!(canBuyCurrent && inspectedTile.id === currentTile.id) && (
                      <>
                        <span>Prix : {inspectedTile.price} Or</span>
                        <span>•</span>
                      </>
                    )}
                    <span>Loyer : {calculateIslandRent(inspectedTile, tiles)} Or</span>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-0.5 text-[11px] font-semibold leading-tight text-amber-950/90">
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
              N°{inspectedTile.id}
            </span>
          )}
        </div>
      </div>

      {/* 2. Barre d'Actions : action principale en haut, actions secondaires réparties sur toute la largeur */}
      {isAnyTurnActionPhase && activePlayer ? (
        <div className={`flex flex-col gap-1.5 ${collapseOnShortScreen}`}>
          <div className="flex items-stretch gap-1.5">
            {canRoll ? (
              <PrimaryButton
                onClick={rollDice}
                className="bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-amber-100"
              >
                <Dices className="w-5 h-5 shrink-0 animate-bounce" />
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-black text-white border border-black/30 shrink-0"
                  style={{ backgroundColor: activePlayer.color }}
                >
                  J{currentPlayerIndex + 1}
                </span>
                <span>Lancer les Dés</span>
              </PrimaryButton>
            ) : (
              <>
                {canBuyCurrent && (
                  <PrimaryButton
                    onClick={buyIsland}
                    className="bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 border-emerald-200"
                  >
                    <Flag className="w-4 h-4 shrink-0" />
                    <span>Acheter {currentTile.price} Or</span>
                  </PrimaryButton>
                )}
                {canFireCannon && (
                  <PrimaryButton
                    onClick={triggerManualNavalBattle}
                    className="bg-gradient-to-b from-rose-500 to-red-700 text-white border-rose-300"
                  >
                    <Crosshair className="w-4 h-4 shrink-0" />
                    <span>{'Aborder\u00A0!'}</span>
                  </PrimaryButton>
                )}
                <PrimaryButton
                  onClick={endTurn}
                  className="bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 border-amber-200"
                >
                  <SkipForward className="w-4 h-4 shrink-0" />
                  <span>Fin du Tour</span>
                </PrimaryButton>
              </>
            )}
          </div>
          <div className="flex items-stretch gap-1.5">{secondaryButtons}</div>
        </div>
      ) : (
        <div className="w-full wood-plank rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-amber-200 border border-amber-500/30">
          {phase === 'ROLLING' && !isRollingDice ? (
            <>
              <Dices className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-amber-300 font-black">
                Résultat : {dice[0]} + {dice[1]} = {dice[0] + dice[1]} cases !
              </span>
            </>
          ) : activePlayer?.isAI ? (
            <>
              <Bot className="w-4 h-4 text-cyan-300 animate-spin shrink-0" />
              <span>{activePlayer.name} joue...</span>
            </>
          ) : (
            <>
              <Dices className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>{phase === 'ROLLING' ? 'Lancer des dés...' : 'Navigation...'}</span>
            </>
          )}
        </div>
      )}

      {/* 3. Bandeau Matériaux & Journal de Bord */}
      <div className="bg-black/65 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <ScrollText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="text-[11px] font-bold leading-tight text-amber-100">
            {actionLogs[0] ?? '⚓ Bienvenue dans Jolly Roger’s !'}
          </div>
        </div>

        {activePlayer && (
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-amber-950/90 border border-orange-400/50 text-[11px] font-black text-orange-200 whitespace-nowrap">
              🪵 {activePlayer.materials}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
