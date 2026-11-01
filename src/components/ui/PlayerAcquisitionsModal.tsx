import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, MapPin, Sparkles, Skull, X } from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  FORTRESS_LEVEL_NAMES,
  FORTRESS_LEVEL_IMAGES,
  SET_BONUSES,
  countOwnedInSet,
  hasSetBonus,
  getTileSetBonus,
  CULVERIN_RANGE,
  TileData,
} from '../../store/useGameStore';
import { getTileTerrainTheme, TerrainTheme } from '../3d/Tile';
import { BIOME_CARD_STYLES } from './LandedTilePopup';
import { CaptainAvatar } from './CaptainAvatar';

const ISLAND_THEME_ORDER: TerrainTheme[] = [
  'plage',
  'lagon',
  'falaise',
  'temple',
  'volcan',
  'eldorado',
];

interface ActiveBonusItem {
  key: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

export const PlayerAcquisitionsModal: React.FC = () => {
  const inspectedPlayerId = useGameStore((s) => s.inspectedPlayerId);
  const setInspectedPlayerId = useGameStore((s) => s.setInspectedPlayerId);
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const inspectTileCard = useGameStore((s) => s.inspectTileCard);

  const player =
    inspectedPlayerId !== null
      ? players.find((p) => p.id === inspectedPlayerId) ?? null
      : null;

  if (!player) return null;

  const playerIndex = players.findIndex((p) => p.id === player.id);
  const ownedIslands = tiles.filter(
    (t) => t.type === 'island' && t.ownerId === player.id
  );

  // Group owned islands by tile theme (same 3D model and visual design)
  const themeGroups = ISLAND_THEME_ORDER.map((theme) => {
    const allThemeIslands = tiles.filter(
      (t) => t.type === 'island' && getTileTerrainTheme(t) === theme
    );
    const ownedInTheme = allThemeIslands.filter((t) => t.ownerId === player.id);
    const setBonus =
      allThemeIslands.length > 0
        ? getTileSetBonus(allThemeIslands[0].id)
        : undefined;
    return {
      theme,
      styleCfg: BIOME_CARD_STYLES[theme],
      allThemeIslands,
      ownedInTheme,
      setBonus,
    };
  }).filter((group) => group.ownedInTheme.length > 0);

  // Collect all active bonuses for this player
  const activeBonuses: ActiveBonusItem[] = [];

  // 1. Active Set Bonuses (Perles, Plages, Maya, El Dorado)
  for (const bonus of SET_BONUSES) {
    if (hasSetBonus(bonus.id, player.id, tiles)) {
      const ownedCount = countOwnedInSet(bonus, player.id, tiles);
      activeBonuses.push({
        key: `set-${bonus.id}`,
        icon: bonus.icon,
        title: bonus.name,
        description: bonus.description,
        badge: `${ownedCount}/${bonus.tileIds.length} îles`,
      });
    }
  }

  // 2. Ship / Arsenal Upgrades & Charges
  if (player.hasPerfectBoarding) {
    activeBonuses.push({
      key: 'upgrade-boarding',
      icon: '⚔️',
      title: 'Abordage Parfait',
      description: 'Pille 50% de l’or adverse lors d’un abordage gagné',
      badge: 'Arsenal',
    });
  }

  if (player.hasCulverin) {
    activeBonuses.push({
      key: 'upgrade-culverin',
      icon: '🎯',
      title: 'Tir de Coulevrine',
      description: `Détruit 1 étage d’un bâtiment adverse à ≤ ${CULVERIN_RANGE} cases`,
      badge: 'Arsenal',
    });
  }

  if (player.hasCurseCharge) {
    activeBonuses.push({
      key: 'curse-charge',
      icon: '🗿',
      title: 'Malédiction Maya prête',
      description: 'Une malédiction est chargée et prête à frapper un rival',
      badge: 'Prêt',
    });
  }

  // 3. Trapped Fortresses owned by this player
  const trappedIslands = ownedIslands.filter((t) => t.trapped && t.level > 0);
  for (const trappedTile of trappedIslands) {
    activeBonuses.push({
      key: `trap-${trappedTile.id}`,
      icon: '💣',
      title: `Forteresse Piégée (${trappedTile.name})`,
      description: 'Fait perdre 50% de son or à l’ennemi qui y accoste',
      badge: 'Piège',
    });
  }

  // 4. Complete Color Monopolies (Loyer x1.5 on unfortified islands)
  const colorGroups = Array.from(
    new Set(tiles.filter((t) => t.type === 'island').map((t) => t.group))
  );
  for (const groupName of colorGroups) {
    const groupTiles = tiles.filter(
      (t) => t.type === 'island' && t.group === groupName
    );
    if (
      groupTiles.length > 1 &&
      groupTiles.every((t) => t.ownerId === player.id)
    ) {
      activeBonuses.push({
        key: `monopoly-${groupName}`,
        icon: '🏴‍☠️',
        title: `Monopole ${groupName}`,
        description: 'Série complète possédée : loyer de base +50%',
        badge: `${groupTiles.length}/${groupTiles.length}`,
      });
    }
  }

  const handleSelectIsland = (tile: TileData) => {
    inspectTileCard(tile.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={`player-acquisitions-modal-${player.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setInspectedPlayerId(null)}
        className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[430px] max-h-full flex flex-col rounded-3xl wood-panel border-3 shadow-[0_22px_60px_rgba(0,0,0,0.95)] overflow-hidden text-white"
          style={{ borderColor: player.color }}
        >
          {/* Top Captain Switcher + Header */}
          <div className="px-3.5 pt-3 pb-2.5 bg-gradient-to-b from-slate-950/90 to-slate-900/85 border-b-2 border-amber-700/50 shrink-0">
            {/* Quick switcher between captains */}
            {players.length > 1 && (
              <div className="flex items-center gap-1.5 mb-2.5 pr-8">
                {players.map((p, idx) => {
                  const active = p.id === player.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setInspectedPlayerId(p.id)}
                      className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-1 rounded-xl border text-center transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                          : 'bg-black/40 border-white/15 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <CaptainAvatar
                        captainId={p.id}
                        color={p.color}
                        size="sm"
                      />
                      <span className="text-[11px] font-black leading-tight text-white">
                        {p.isAI ? 'IA' : `J${idx + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Captain Identity & Stats */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <CaptainAvatar
                    captainId={player.id}
                    color={player.color}
                    size="lg"
                  />
                  <span
                    className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white border border-slate-950 shadow leading-none"
                    style={{
                      backgroundColor: player.isAI ? '#0f172a' : player.color,
                    }}
                  >
                    {player.isAI ? 'IA' : `J${playerIndex + 1}`}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <h2 className="font-pirata text-xl sm:text-2xl leading-none tracking-wide text-amber-200">
                      {player.name}
                    </h2>
                    {player.bankrupt && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-900/90 border border-rose-400 text-[10px] font-black text-rose-200 inline-flex items-center gap-0.5">
                        <Skull className="w-3 h-3" /> Éliminé
                      </span>
                    )}
                    {!player.bankrupt && player.inJail && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-400 text-[10px] font-black text-slate-200">
                        ⛓️ En Cale
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-amber-100/75 leading-tight mt-0.5">
                    {player.title}
                  </p>

                  {/* Gold, Materials & Owned Islands Count */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/50 text-[11px] font-black text-amber-300 inline-flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {player.gold} Or
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-orange-400/50 text-[11px] font-black text-orange-200">
                      🪵 {player.materials}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-[11px] font-black text-cyan-200 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-300" />
                      {ownedIslands.length}{' '}
                      {ownedIslands.length > 1 ? 'îles' : 'île'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setInspectedPlayerId(null)}
              aria-label="Fermer"
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/65 hover:bg-black/85 text-amber-100 border border-white/30 flex items-center justify-center cursor-pointer shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body: Bonuses + Acquisitions by Theme */}
          <div className="p-3 space-y-3 overflow-y-auto pirate-scroll flex-1">
            {/* Active Bonuses Section (shown when the player has at least one bonus) */}
            {activeBonuses.length > 0 && (
              <div className="rounded-2xl bg-slate-950/85 border-2 border-amber-400/60 p-2.5 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Bonus Actifs ({activeBonuses.length})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {activeBonuses.map((bonus) => (
                    <div
                      key={bonus.key}
                      className="rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-slate-950/90 border border-amber-400/35 px-2.5 py-2 flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-base leading-none mt-0.5 shrink-0">
                          {bonus.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-amber-200 leading-tight">
                            {bonus.title}
                          </div>
                          <div className="text-[11px] font-semibold text-amber-100/85 leading-snug mt-0.5">
                            {bonus.description}
                          </div>
                        </div>
                      </div>
                      {bonus.badge && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 whitespace-nowrap">
                          {bonus.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acquisitions Grouped by Case Theme (Same 3D Model & Design) */}
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                  Acquisitions ({ownedIslands.length})
                </span>
                {themeGroups.length > 0 && (
                  <span className="text-[10px] font-bold text-amber-200/75">
                    {themeGroups.length}{' '}
                    {themeGroups.length > 1 ? 'thèmes' : 'thème'}
                  </span>
                )}
              </div>

              {themeGroups.length === 0 ? (
                <div className="rounded-2xl bg-black/45 border border-amber-500/30 p-5 text-center">
                  <div className="text-2xl mb-1">🏝️</div>
                  <div className="text-xs font-black text-amber-200">
                    Aucune île pour le moment
                  </div>
                  <p className="text-[11px] font-semibold text-amber-100/70 mt-0.5">
                    Les îles de {player.name} apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {themeGroups.map(
                    ({
                      theme,
                      styleCfg,
                      allThemeIslands,
                      ownedInTheme,
                      setBonus,
                    }) => {
                      const setProgress = setBonus
                        ? countOwnedInSet(setBonus, player.id, tiles)
                        : 0;
                      const isSetActive = Boolean(
                        setBonus && setProgress >= setBonus.required
                      );

                      return (
                        <div
                          key={theme}
                          className={`rounded-2xl border-3 ${styleCfg.borderClass} overflow-hidden shadow-xl`}
                          style={{
                            background: styleCfg.cardBg,
                            boxShadow: `0 10px 25px rgba(0,0,0,0.65), 0 0 16px ${styleCfg.glowColor}`,
                          }}
                        >
                          {/* Theme Banner: Same Terrain Texture & 3D Landmark Model Render as LandedTilePopup */}
                          <div className="relative min-h-20 w-full overflow-hidden border-b-2 border-black/30">
                            <img
                              src={styleCfg.terrainImg}
                              alt={styleCfg.biomeLabel}
                              className="absolute inset-0 w-full h-full object-cover scale-105"
                            />
                            <div
                              className="absolute inset-0"
                              style={{ background: styleCfg.headerOverlay }}
                            />

                            {/* Theme Title + Owned Count + Theme Set Bonus Status */}
                            <div className="relative z-10 min-h-20 flex flex-col justify-between gap-1 p-2.5 pr-20">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styleCfg.badgeBg}`}
                                >
                                  {ownedInTheme.length}/{allThemeIslands.length}{' '}
                                  {allThemeIslands.length > 1 ? 'îles' : 'île'}
                                </span>
                                {setBonus && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                      isSetActive
                                        ? 'bg-emerald-500 text-slate-950 border-white shadow'
                                        : 'bg-black/65 text-amber-200 border-amber-400/50'
                                    }`}
                                  >
                                    {setBonus.icon} {setBonus.name} •{' '}
                                    {isSetActive
                                      ? 'Actif ✓'
                                      : `${setProgress}/${setBonus.required}`}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-pirata text-xl leading-none tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                {styleCfg.biomeLabel}
                              </h3>
                            </div>

                            {/* 3D Model Render Cutout on the Right */}
                            <img
                              src={styleCfg.propImg}
                              alt={styleCfg.biomeLabel}
                              className="absolute right-1 bottom-0.5 w-18 h-18 object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.85)] z-10 pointer-events-none"
                            />
                          </div>

                          {/* Theme Islands List */}
                          <div className="p-2.5 space-y-1.5">
                            {setBonus && (
                              <div
                                className={`rounded-xl px-2.5 py-1 border text-[11px] font-bold flex items-center justify-between gap-2 ${styleCfg.statBoxBg} ${styleCfg.textColor}`}
                              >
                                <span>
                                  {setBonus.icon} {setBonus.description}
                                </span>
                              </div>
                            )}

                            {ownedInTheme.map((tile) => {
                              const currentRent = calculateIslandRent(
                                tile,
                                tiles
                              );
                              const fortImg = FORTRESS_LEVEL_IMAGES[tile.level];

                              return (
                                <button
                                  key={tile.id}
                                  type="button"
                                  onClick={() => handleSelectIsland(tile)}
                                  className={`w-full rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 text-left transition cursor-pointer hover:brightness-105 active:scale-[0.99] ${styleCfg.statBoxBg}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-3 h-3 rounded-full border border-black/40 shrink-0 shadow-xs"
                                      style={{ backgroundColor: tile.color }}
                                    />
                                    <div className="min-w-0">
                                      <div
                                        className={`text-xs sm:text-sm font-black leading-tight flex flex-wrap items-center gap-x-1.5 ${styleCfg.titleColor}`}
                                      >
                                        <span>
                                          {tile.name}
                                        </span>
                                        {tile.trapped && tile.level > 0 && (
                                          <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[9px] font-black uppercase shrink-0">
                                            💣 Piégée
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`text-[10px] font-extrabold flex flex-wrap items-center gap-x-1 mt-0.5 ${styleCfg.subTextColor}`}
                                      >
                                        {fortImg && (
                                          <img
                                            src={fortImg}
                                            alt={
                                              FORTRESS_LEVEL_NAMES[tile.level]
                                            }
                                            className="w-3.5 h-3.5 object-contain shrink-0"
                                          />
                                        )}
                                        <span>
                                          {FORTRESS_LEVEL_NAMES[tile.level]}
                                        </span>
                                        <span>•</span>
                                        <span>{tile.group}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black border ${styleCfg.badgeBg}`}
                                    >
                                      {currentRent} Or
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
