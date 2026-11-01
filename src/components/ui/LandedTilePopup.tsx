import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag,
  Castle,
  Crosshair,
  Coins,
  X,
  Compass,
  ArrowRight,
  Sparkles,
  Flame,
} from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  TileData,
  FORTIFY_MATERIAL_COST,
  MAX_FORTIFY_LEVEL,
  FORTRESS_LEVEL_NAMES,
  FORTRESS_LEVEL_IMAGES,
  CULVERIN_RANGE,
  canAccessUpgradesShop,
  getTileDistance,
} from '../../store/useGameStore';
import { getTileTerrainTheme, TerrainTheme } from '../3d/Tile';
import { CaptainAvatar } from './CaptainAvatar';

interface ThemeStyleConfig {
  biomeLabel: string;
  terrainImg: string;
  propImg: string;
  cardBg: string;
  headerOverlay: string;
  borderClass: string;
  glowColor: string;
  badgeBg: string;
  titleColor: string;
  textColor: string;
  subTextColor: string;
  statBoxBg: string;
}

export const BIOME_CARD_STYLES: Record<TerrainTheme, ThemeStyleConfig> = {
  plage: {
    biomeLabel: 'Plage des Caraïbes',
    terrainImg: './assets/tile_plage.jpg?v=terrain3',
    propImg: './assets/prop_plage.png',
    cardBg:
      'linear-gradient(180deg, #fef3c7 0%, #fde68a 58%, #f59e0b 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(120,53,15,0.2) 0%, rgba(69,26,3,0.82) 100%)',
    borderClass: 'border-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.55)',
    badgeBg: 'bg-amber-900/85 text-amber-100 border-amber-400/60',
    titleColor: 'text-amber-950',
    textColor: 'text-amber-950',
    subTextColor: 'text-amber-900/85',
    statBoxBg: 'bg-amber-950/12 border-amber-900/25',
  },
  lagon: {
    biomeLabel: 'Lagon Corallien',
    terrainImg: './assets/tile_lagon.jpg?v=terrain3',
    propImg: './assets/prop_lagon.png',
    cardBg:
      'linear-gradient(180deg, #ecfeff 0%, #a5f3fc 58%, #22d3ee 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(8,51,68,0.18) 0%, rgba(8,51,68,0.85) 100%)',
    borderClass: 'border-cyan-300',
    glowColor: 'rgba(34, 211, 238, 0.6)',
    badgeBg: 'bg-cyan-950/85 text-cyan-100 border-cyan-300/60',
    titleColor: 'text-cyan-950',
    textColor: 'text-cyan-950',
    subTextColor: 'text-cyan-900/85',
    statBoxBg: 'bg-cyan-950/12 border-cyan-900/25',
  },
  falaise: {
    biomeLabel: 'Bastion & Falaises',
    terrainImg: './assets/tile_falaise.jpg?v=terrain3',
    propImg: './assets/prop_falaise.png',
    cardBg:
      'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 55%, #94a3b8 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.88) 100%)',
    borderClass: 'border-slate-300',
    glowColor: 'rgba(148, 163, 184, 0.55)',
    badgeBg: 'bg-slate-900/90 text-slate-100 border-slate-400/60',
    titleColor: 'text-slate-950',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-800',
    statBoxBg: 'bg-slate-900/12 border-slate-800/25',
  },
  temple: {
    biomeLabel: 'Sanctuaire de la Jungle',
    terrainImg: './assets/tile_temple.jpg?v=terrain3',
    propImg: './assets/prop_temple.png',
    cardBg:
      'linear-gradient(180deg, #ecfdf5 0%, #a7f3d0 58%, #34d399 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(6,78,59,0.2) 0%, rgba(6,78,59,0.88) 100%)',
    borderClass: 'border-emerald-400',
    glowColor: 'rgba(52, 211, 153, 0.55)',
    badgeBg: 'bg-emerald-950/90 text-emerald-100 border-emerald-400/60',
    titleColor: 'text-emerald-950',
    textColor: 'text-emerald-950',
    subTextColor: 'text-emerald-900/85',
    statBoxBg: 'bg-emerald-950/12 border-emerald-900/25',
  },
  volcan: {
    biomeLabel: 'Terres Volcaniques',
    terrainImg: './assets/tile_volcan.jpg?v=terrain3',
    propImg: './assets/prop_volcan.png',
    cardBg:
      'linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #064e3b 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.9) 100%)',
    borderClass: 'border-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-400/70',
    titleColor: 'text-emerald-300',
    textColor: 'text-emerald-50',
    subTextColor: 'text-emerald-200/85',
    statBoxBg: 'bg-black/35 border-emerald-500/35',
  },
  eldorado: {
    biomeLabel: 'Cité d’Or d’El Dorado',
    terrainImg: './assets/tile_eldorado.jpg?v=terrain3',
    propImg: './assets/prop_eldorado.png',
    cardBg:
      'linear-gradient(180deg, #fef9c3 0%, #fde047 55%, #eab308 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(113,63,18,0.18) 0%, rgba(66,32,6,0.86) 100%)',
    borderClass: 'border-yellow-300',
    glowColor: 'rgba(250, 204, 21, 0.75)',
    badgeBg: 'bg-amber-950/90 text-yellow-200 border-yellow-300/80',
    titleColor: 'text-amber-950',
    textColor: 'text-amber-950',
    subTextColor: 'text-amber-900',
    statBoxBg: 'bg-amber-950/15 border-amber-900/30',
  },
  port: {
    biomeLabel: 'Port de l’Amirauté',
    terrainImg: './assets/tile_port.jpg?v=terrain3',
    propImg: './assets/prop_port.png',
    cardBg:
      'linear-gradient(180deg, #fffbeb 0%, #fde68a 60%, #d97706 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(30,41,59,0.2) 0%, rgba(69,26,3,0.86) 100%)',
    borderClass: 'border-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    badgeBg: 'bg-amber-950/90 text-amber-100 border-amber-300/70',
    titleColor: 'text-amber-950',
    textColor: 'text-amber-950',
    subTextColor: 'text-amber-900/90',
    statBoxBg: 'bg-amber-950/12 border-amber-900/25',
  },
  taverne: {
    biomeLabel: 'Repaire de Tortuga',
    terrainImg: './assets/tile_taverne.jpg?v=terrain3',
    propImg: './assets/prop_taverne.png',
    cardBg:
      'linear-gradient(180deg, #ffedd5 0%, #fdba74 58%, #ea580c 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(67,20,7,0.2) 0%, rgba(67,20,7,0.88) 100%)',
    borderClass: 'border-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.65)',
    badgeBg: 'bg-orange-950/90 text-orange-100 border-orange-400/70',
    titleColor: 'text-orange-950',
    textColor: 'text-orange-950',
    subTextColor: 'text-orange-900',
    statBoxBg: 'bg-orange-950/14 border-orange-900/25',
  },
  tresor: {
    biomeLabel: 'Îlot au Trésor',
    terrainImg: './assets/tile_tresor.jpg?v=terrain3',
    propImg: './assets/prop_tresor.png',
    cardBg:
      'linear-gradient(180deg, #fef9c3 0%, #fcd34d 58%, #d97706 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(120,53,15,0.2) 0%, rgba(69,26,3,0.86) 100%)',
    borderClass: 'border-yellow-300',
    glowColor: 'rgba(250, 204, 21, 0.7)',
    badgeBg: 'bg-amber-950/90 text-yellow-200 border-yellow-300/70',
    titleColor: 'text-amber-950',
    textColor: 'text-amber-950',
    subTextColor: 'text-amber-900',
    statBoxBg: 'bg-amber-950/12 border-amber-900/25',
  },
  malediction: {
    biomeLabel: 'Récif Maudit des Abysses',
    terrainImg: './assets/tile_malediction.jpg?v=terrain3',
    propImg: './assets/prop_malediction.png',
    cardBg:
      'linear-gradient(180deg, #2e1065 0%, #1e1b4b 60%, #0f172a 100%)',
    headerOverlay:
      'linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.92) 100%)',
    borderClass: 'border-purple-400',
    glowColor: 'rgba(168, 85, 247, 0.7)',
    badgeBg: 'bg-purple-950/90 text-purple-200 border-purple-400/70',
    titleColor: 'text-purple-200',
    textColor: 'text-purple-50',
    subTextColor: 'text-purple-200/85',
    statBoxBg: 'bg-black/35 border-purple-400/35',
  },
};

export const LandedTilePopup: React.FC = () => {
  const landedTilePopup = useGameStore((s) => s.landedTilePopup);
  const dismissLandedTilePopup = useGameStore((s) => s.dismissLandedTilePopup);
  const tiles = useGameStore((s) => s.tiles);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const activeCard = useGameStore((s) => s.activeCard);
  const navalBattle = useGameStore((s) => s.navalBattle);
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const showUpgradesModal = useGameStore((s) => s.showUpgradesModal);
  const setShowUpgradesModal = useGameStore((s) => s.setShowUpgradesModal);
  const hasAttackedThisTurn = useGameStore((s) => s.hasAttackedThisTurn);
  const hasFortifiedThisTurn = useGameStore((s) => s.hasFortifiedThisTurn);
  const hasFiredCulverinThisTurn = useGameStore((s) => s.hasFiredCulverinThisTurn);

  const buyIsland = useGameStore((s) => s.buyIsland);
  const fortifyIsland = useGameStore((s) => s.fortifyIsland);
  const fireCulverin = useGameStore((s) => s.fireCulverin);
  const triggerManualNavalBattle = useGameStore(
    (s) => s.triggerManualNavalBattle
  );

  // Yield screen space if a Drawn Card modal, Naval Battle modal, Fortify Selector, or Upgrades modal is active
  if (
    !landedTilePopup ||
    activeCard ||
    navalBattle?.active ||
    showFortifyModal ||
    showUpgradesModal ||
    phase === 'GAME_OVER'
  ) {
    return null;
  }

  const tile: TileData | undefined = tiles[landedTilePopup.tileId];
  if (!tile) return null;

  const theme = getTileTerrainTheme(tile);
  const styleCfg = BIOME_CARD_STYLES[theme];

  const activePlayer = players[currentPlayerIndex];
  const landingPlayer =
    players.find((p) => p.id === landedTilePopup.playerId) ?? activePlayer;
  const tileOwner =
    tile.ownerId !== null
      ? players.find((p) => p.id === tile.ownerId) ?? null
      : null;

  const isHumanTurnActive =
    Boolean(activePlayer) &&
    !activePlayer.isAI &&
    !activePlayer.bankrupt &&
    (phase === 'TILE_ACTION' || phase === 'END_TURN');

  const isHumanAnyPhaseActive =
    Boolean(activePlayer) &&
    !activePlayer.isAI &&
    !activePlayer.bankrupt &&
    (phase === 'IDLE' || phase === 'TILE_ACTION' || phase === 'END_TURN');

  const isHumanActiveOnThisTile =
    isHumanTurnActive && activePlayer.position === tile.id;

  const canBuy =
    isHumanActiveOnThisTile &&
    tile.type === 'island' &&
    tile.ownerId === null &&
    (tile.price ?? 0) <= activePlayer.gold;

  // Player can fortify 1 owned island per turn from anywhere on the map if they have Gold + 1 Material
  const canFortify =
    isHumanAnyPhaseActive &&
    !hasFortifiedThisTurn &&
    tile.type === 'island' &&
    tile.ownerId === activePlayer.id &&
    tile.level < MAX_FORTIFY_LEVEL &&
    (tile.upgradeCost ?? 0) <= activePlayer.gold &&
    activePlayer.materials >= FORTIFY_MATERIAL_COST;

  const canShopOnThisTile =
    isHumanAnyPhaseActive &&
    canAccessUpgradesShop(activePlayer, tiles) &&
    (tile.type === 'start' ||
      tile.type === 'free_parking' ||
      (tile.type === 'island' && tile.ownerId === activePlayer.id));

  const canShootThisWithCulverin =
    isHumanAnyPhaseActive &&
    Boolean(activePlayer.hasCulverin) &&
    !hasFiredCulverinThisTurn &&
    tile.type === 'island' &&
    tile.ownerId !== null &&
    tile.ownerId !== activePlayer.id &&
    tile.level >= 1 &&
    getTileDistance(activePlayer.position, tile.id) <= CULVERIN_RANGE;

  const rivalsOnTile = activePlayer
    ? players.filter(
        (p) =>
          p.id !== activePlayer.id &&
          !p.bankrupt &&
          p.position === tile.id &&
          activePlayer.position === tile.id
      )
    : [];

  const canFireCannon =
    isHumanActiveOnThisTile && !hasAttackedThisTurn && rivalsOnTile.length > 0;
  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, tiles) : 0;

  return (
    <AnimatePresence>
      <motion.div
        key={`tile-popup-${tile.id}-${landedTilePopup.playerId}-${tile.ownerId ?? 'free'}-${tile.level}-${tile.trapped ? 'trap' : 'clean'}`}
        initial={{ opacity: 0, scale: 0.72, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
        className="fixed inset-x-0 top-[15.5dvh] bottom-[25.5dvh] z-30 flex items-end justify-center px-4 pb-2 pointer-events-none"
      >
        <div
          className={`pointer-events-auto relative w-full max-w-[330px] rounded-2xl border-4 ${styleCfg.borderClass} overflow-hidden shadow-2xl`}
          style={{
            background: styleCfg.cardBg,
            boxShadow: `0 18px 42px rgba(0,0,0,0.82), 0 0 28px ${styleCfg.glowColor}`,
          }}
        >
          {/* Top Color Ribbon matching the Tile's Group Color */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: tile.color }}
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={dismissLandedTilePopup}
            className="absolute top-3.5 right-2.5 z-20 w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 text-amber-100 border border-white/30 flex items-center justify-center shadow cursor-pointer"
            aria-label="Fermer la carte"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Banner with the Tile's Higgsfield Ground Terrain Texture & 3D Landmark Prop */}
          <div className="relative h-24 w-full overflow-hidden border-b-2 border-black/30">
            <img
              src={styleCfg.terrainImg}
              alt={tile.name}
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            <div
              className="absolute inset-0"
              style={{ background: styleCfg.headerOverlay }}
            />

            {/* Captain Arrival Badge (Top Left) */}
            {landingPlayer && !landedTilePopup.isInspect && (
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-white/25 backdrop-blur-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
                  style={{ backgroundColor: landingPlayer.color }}
                />
                <span className="text-[11px] font-extrabold text-amber-100">
                  {landingPlayer.name}
                </span>
              </div>
            )}

            {/* 3D Higgsfield Landmark Cutout Prop popping on the Right of the Header */}
            <motion.img
              src={styleCfg.propImg}
              alt={tile.name}
              initial={{ scale: 0.7, rotate: -6, y: 10 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="absolute right-2.5 bottom-0.5 w-22 h-22 object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] z-10 pointer-events-none"
            />
          </div>

          {/* Minimalist, High-Clarity Card Body */}
          <div className="p-3.5 text-center">
            {/* Tile Name + Group Dot */}
            <div className="flex items-center justify-center gap-2">
              <span
                className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                style={{ backgroundColor: tile.color }}
              />
              <h2
                className={`font-pirata text-2xl leading-none tracking-wide ${styleCfg.titleColor}`}
              >
                {tile.name}
              </h2>
              {tile.trapped && tile.level > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase shadow">
                  💣 Piégée
                </span>
              )}
            </div>

            {/* 1. If Rent Payment just occurred: show ONLY the animated Payer -> Owner transfer */}
            {landedTilePopup.rentPayment ? (
              (() => {
                const payer = players.find(
                  (p) => p.id === landedTilePopup.rentPayment!.payerId
                );
                const owner = players.find(
                  (p) => p.id === landedTilePopup.rentPayment!.ownerId
                );
                const amount = landedTilePopup.rentPayment.amount;
                if (!payer || !owner) return null;

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                    className="mt-2.5 rounded-xl bg-slate-950/90 border-2 border-rose-400/90 p-2.5 shadow-[0_0_24px_rgba(244,63,94,0.5)] text-white"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1.5">
                      {tile.trapped && tile.level > 0
                        ? '💣 Forteresse Piégée (-50% Or) & Loyer'
                        : '⚓ Droit de Mouillage'}
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      {/* Payer (Losses Gold) */}
                      <motion.div
                        animate={{ x: [0, -5, 5, -4, 4, 0] }}
                        transition={{ duration: 0.55 }}
                        className="flex-1 bg-rose-950/85 border border-rose-400/70 rounded-lg p-1.5 flex flex-col items-center"
                      >
                        <CaptainAvatar
                          captainId={payer.id}
                          color={payer.color}
                          size="sm"
                        />
                        <span className="text-[11px] font-black text-white truncate max-w-full mt-0.5">
                          {payer.name}
                        </span>
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: [1.25, 1] }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className="mt-0.5 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-xs border border-rose-200 shadow"
                        >
                          -{amount} Or
                        </motion.span>
                      </motion.div>

                      {/* Animated Flying Gold Coins Stream */}
                      <div className="flex flex-col items-center justify-center px-1 shrink-0">
                        <div className="relative w-12 h-6 flex items-center justify-center overflow-hidden">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ x: -18, opacity: 0, scale: 0.6 }}
                              animate={{
                                x: [-18, 0, 18],
                                opacity: [0, 1, 0],
                                scale: [0.7, 1.15, 0.7],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.95,
                                delay: i * 0.28,
                                ease: 'easeInOut',
                              }}
                              className="absolute"
                            >
                              <Coins className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.95)]" />
                            </motion.div>
                          ))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-amber-300 stroke-[3]" />
                      </div>

                      {/* Island Owner (Gains Gold) */}
                      <motion.div
                        animate={{ scale: [1, 1.09, 1] }}
                        transition={{ duration: 0.65, repeat: 2 }}
                        className="flex-1 bg-emerald-950/85 border border-emerald-400/80 rounded-lg p-1.5 flex flex-col items-center shadow-[0_0_15px_rgba(16,185,129,0.45)]"
                      >
                        <CaptainAvatar
                          captainId={owner.id}
                          color={owner.color}
                          size="sm"
                        />
                        <span className="text-[11px] font-black text-white truncate max-w-full mt-0.5">
                          {owner.name}
                        </span>
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: [1.28, 1] }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className="mt-0.5 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs border border-white shadow"
                        >
                          +{currentRent} Or
                        </motion.span>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })()
            ) : tile.type === 'island' ? (
              /* 2. Clean, Single-Pill Island Summary */
              <div className="mt-2.5 space-y-2">
                <div
                  className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${styleCfg.statBoxBg}`}
                >
                  {tileOwner ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full text-white shadow border border-white/40 truncate"
                      style={{ backgroundColor: tileOwner.color }}
                    >
                      {FORTRESS_LEVEL_IMAGES[tile.level] && (
                        <img
                          src={FORTRESS_LEVEL_IMAGES[tile.level]!}
                          alt={FORTRESS_LEVEL_NAMES[tile.level]}
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span className="truncate">{tileOwner.name}</span>
                    </span>
                  ) : (
                    <span className="inline-block text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-800 text-white shadow">
                      Île Libre
                    </span>
                  )}

                  <div className={`text-xs font-black flex items-center gap-2 ${styleCfg.textColor}`}>
                    {!tileOwner && !canBuy && (
                      <span>Prix : {tile.price} Or •</span>
                    )}
                    <span>Loyer : {currentRent} Or</span>
                  </div>
                </div>

                {/* Show confirmation banner when an island was just bought, fortified, or hit by Culverin */}
                {landedTilePopup.eventSummary &&
                  (landedTilePopup.eventSummary.startsWith('🏴‍☠️') ||
                    landedTilePopup.eventSummary.startsWith('💥') ||
                    (landedTilePopup.eventSummary.startsWith('🏰 Votre') === false &&
                      landedTilePopup.eventSummary.startsWith('🏰'))) && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black shadow-md ${
                        landedTilePopup.eventSummary.startsWith('💥')
                          ? 'border-red-400 bg-red-950/90 text-red-200'
                          : 'border-emerald-400 bg-emerald-950/90 text-emerald-200'
                      }`}
                    >
                      {landedTilePopup.eventSummary}
                    </motion.div>
                  )}
              </div>
            ) : (
              /* 3. Special Tile (Port Royal, Tortuga, Tax, Kraken, Cale) — Single Clean Banner */
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`mt-2.5 px-3 py-2 rounded-xl border-2 text-xs font-black shadow-md ${
                  landedTilePopup.eventSummary?.includes('+')
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                    : landedTilePopup.eventSummary?.includes('-')
                    ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                    : `${styleCfg.statBoxBg} ${styleCfg.textColor}`
                }`}
              >
                {landedTilePopup.eventSummary ?? tile.description}
              </motion.div>
            )}

            {/* Direct Action Buttons inside the Card */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canBuy && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    buyIsland();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 border-2 border-emerald-200 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-4 h-4 shrink-0" />
                  <span>Acheter ({tile.price} Or)</span>
                </motion.button>
              )}

              {canFortify && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    fortifyIsland(tile.id);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-b from-cyan-300 to-cyan-500 text-slate-950 border-2 border-cyan-100 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Castle className="w-4 h-4 shrink-0" />
                  <span>
                    Fortifier ({tile.upgradeCost} Or + {FORTIFY_MATERIAL_COST} 🪵)
                  </span>
                </motion.button>
              )}

              {canShootThisWithCulverin && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    fireCulverin(tile.id);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-b from-red-500 to-red-700 text-white border-2 border-red-200 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>Coulevrine (-1 Étage)</span>
                </motion.button>
              )}

              {canShopOnThisTile && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowUpgradesModal(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-b from-purple-400 to-indigo-600 text-white border-2 border-purple-200 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Améliorations (1000 Or + 3 🪵)</span>
                </motion.button>
              )}

              {canFireCannon && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    dismissLandedTilePopup();
                    triggerManualNavalBattle();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-b from-rose-500 to-red-700 text-white border-2 border-rose-300 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Crosshair className="w-4 h-4 shrink-0" />
                  <span>Aborder !</span>
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={dismissLandedTilePopup}
                className={`${
                  canBuy ||
                  canFortify ||
                  canFireCannon ||
                  canShopOnThisTile ||
                  canShootThisWithCulverin
                    ? 'px-4'
                    : 'w-full'
                } py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider bg-slate-950/85 hover:bg-slate-950 text-amber-200 border border-amber-400/50 shadow flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                {canBuy ||
                canFortify ||
                canFireCannon ||
                canShopOnThisTile ||
                canShootThisWithCulverin ? (
                  <span>Fermer</span>
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Continuer</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
