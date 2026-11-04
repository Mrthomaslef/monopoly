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
  shortEffect: string;
  badge?: string;
}

const COMPACT_SET_EFFECTS: Record<string, string> = {
  perles: '+300 Or / départ',
  plages: '+3 🪵 / tour',
  maya: '1 Malédiction / départ',
  eldorado: '+600 Or / arrêt',
};

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

  // Collect all active bonuses for this player in a condensed format
  const activeBonuses: ActiveBonusItem[] = [];

  // 1. Active Set Bonuses (Perles, Plages, Maya, El Dorado)
  for (const bonus of SET_BONUSES) {
    if (hasSetBonus(bonus.id, player.id, tiles)) {
      const ownedCount = countOwnedInSet(bonus, player.id, tiles);
      activeBonuses.push({
        key: `set-${bonus.id}`,
        icon: bonus.icon,
        title: bonus.name,
        shortEffect: COMPACT_SET_EFFECTS[bonus.id] ?? bonus.description,
        badge: `${ownedCount}/${bonus.tileIds.length}`,
      });
    }
  }

  // 2. Ship / Arsenal Upgrades & Charges
  if (player.hasPerfectBoarding) {
    activeBonuses.push({
      key: 'upgrade-boarding',
      icon: '⚔️',
      title: 'Abordage Parfait',
      shortEffect: 'Pille 50% Or en duel',
    });
  }

  if (player.hasCulverin) {
    activeBonuses.push({
      key: 'upgrade-culverin',
      icon: '🎯',
      title: 'Coulevrine',
      shortEffect: `-1 étage (≤${CULVERIN_RANGE} cases)`,
    });
  }

  if (player.hasCurseCharge) {
    activeBonuses.push({
      key: 'curse-charge',
      icon: '🗿',
      title: 'Malédiction',
      shortEffect: 'Prête à frapper',
      badge: 'Prêt',
    });
  }

  // 3. Trapped Fortresses owned by this player (grouped to stay compact)
  const trappedIslands = ownedIslands.filter((t) => t.trapped && t.level > 0);
  if (trappedIslands.length > 0) {
    activeBonuses.push({
      key: 'trapped-fortresses',
      icon: '💣',
      title:
        trappedIslands.length === 1
          ? `Piège (${trappedIslands[0].name})`
          : `Forteresses Piégées`,
      shortEffect: '-50% Or à l’accostage',
      badge: `${trappedIslands.length}x`,
    });
  }

  // 4. Complete Color Monopolies (Loyer x1.5 on unfortified islands)
  const colorGroups = Array.from(
    new Set(tiles.filter((t) => t.type === 'island').map((t) => t.group))
  );
  const ownedMonopolies = colorGroups.filter((groupName) => {
    const groupTiles = tiles.filter(
      (t) => t.type === 'island' && t.group === groupName
    );
    return (
      groupTiles.length > 1 && groupTiles.every((t) => t.ownerId === player.id)
    );
  });
  if (ownedMonopolies.length > 0) {
    activeBonuses.push({
      key: 'monopolies',
      icon: '🏴‍☠️',
      title:
        ownedMonopolies.length === 1
          ? `Monopole ${ownedMonopolies[0]}`
          : `Monopoles (${ownedMonopolies.length})`,
      shortEffect: 'Loyer de base +50%',
      badge: `${ownedMonopolies.length}x`,
    });
  }

  const handleSelectIsland = (tile: TileData) => {
    inspectTileCard(tile.id);
  };

  const isDense = themeGroups.length >= 4 || ownedIslands.length >= 7;

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
          initial={{ opacity: 0, scale: 0.9, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[440px] max-h-[88dvh] flex flex-col rounded-2xl wood-panel border-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden text-white"
          style={{ borderColor: player.color }}
        >
          {/* Compact Top Captain Switcher + Identity Header */}
          <div className="px-2.5 pt-2 pb-2 bg-gradient-to-b from-slate-950/90 to-slate-900/85 border-b border-amber-700/50 shrink-0">
            {/* Quick switcher between captains */}
            {players.length > 1 && (
              <div className="flex items-center gap-1 mb-1.5 pr-7">
                {players.map((p, idx) => {
                  const active = p.id === player.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setInspectedPlayerId(p.id)}
                      className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border text-center transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/25 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                          : 'bg-black/40 border-white/15 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-[10px] font-black leading-none text-white truncate">
                        {p.isAI ? 'IA' : `J${idx + 1}`} • {p.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Captain Identity & Inline Stats */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <CaptainAvatar
                    captainId={player.id}
                    color={player.color}
                    size="sm"
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 px-1 py-0.2 rounded text-[8px] font-black text-white border border-slate-950 shadow leading-none"
                    style={{
                      backgroundColor: player.isAI ? '#0f172a' : player.color,
                    }}
                  >
                    {player.isAI ? 'IA' : `J${playerIndex + 1}`}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="font-pirata text-lg leading-none tracking-wide text-amber-200 truncate">
                      {player.name}
                    </h2>
                    {player.bankrupt && (
                      <span className="px-1 py-0.2 rounded bg-rose-900/90 border border-rose-400 text-[9px] font-black text-rose-200 inline-flex items-center gap-0.5">
                        <Skull className="w-2.5 h-2.5" /> Éliminé
                      </span>
                    )}
                    {!player.bankrupt && player.inJail && (
                      <span className="px-1 py-0.2 rounded bg-slate-800 border border-slate-400 text-[9px] font-black text-slate-200">
                        ⛓️ Cale
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-amber-100/70 leading-tight truncate">
                    {player.title}
                  </p>
                </div>
              </div>

              {/* Compact Gold, Materials & Owned Islands Pills */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 border border-amber-400/50 text-[10px] font-black text-amber-300 inline-flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  {player.gold}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 border border-orange-400/50 text-[10px] font-black text-orange-200">
                  🪵 {player.materials}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400/50 text-[10px] font-black text-cyan-200 inline-flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
                  {ownedIslands.length}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setInspectedPlayerId(null)}
              aria-label="Fermer"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/65 hover:bg-black/85 text-amber-100 border border-white/30 flex items-center justify-center cursor-pointer shadow"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Body on Mac trackpad & mouse wheel: Active Bonuses + Acquisitions */}
          <div className="p-2 space-y-1.5 min-h-0 flex-1 overflow-y-auto pirate-scroll">
            {/* Active Bonuses Section (2-column compact chips) */}
            {activeBonuses.length > 0 && (
              <div className="rounded-xl bg-slate-950/85 border border-amber-400/55 px-2 py-1.5 shadow">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    Bonus Actifs ({activeBonuses.length})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {activeBonuses.map((bonus) => (
                    <div
                      key={bonus.key}
                      className="rounded-lg bg-gradient-to-r from-amber-950/75 via-slate-900/90 to-slate-950/90 border border-amber-400/35 px-1.5 py-1 flex items-center justify-between gap-1 min-w-0"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs leading-none shrink-0">
                          {bonus.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-amber-200 leading-none truncate">
                            {bonus.title}
                          </div>
                          <div className="text-[9px] font-semibold text-amber-100/80 leading-tight truncate mt-0.5">
                            {bonus.shortEffect}
                          </div>
                        </div>
                      </div>
                      {bonus.badge && (
                        <span className="shrink-0 px-1 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/50 text-[8px] font-black text-emerald-300">
                          {bonus.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acquisitions Grouped by Theme */}
            <div>
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                  Acquisitions ({ownedIslands.length})
                </span>
                {themeGroups.length > 0 && (
                  <span className="text-[9px] font-bold text-amber-200/70">
                    Cliquer sur une île pour l&apos;inspecter
                  </span>
                )}
              </div>

              {themeGroups.length === 0 ? (
                <div className="rounded-xl bg-black/45 border border-amber-500/30 py-3 px-4 text-center">
                  <div className="text-lg leading-none mb-0.5">🏝️</div>
                  <div className="text-[11px] font-black text-amber-200">
                    Aucune île possédée
                  </div>
                </div>
              ) : (
                <div className={isDense ? 'space-y-1' : 'space-y-1.5'}>
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
                          className={`rounded-xl border-2 ${styleCfg.borderClass} overflow-hidden shadow-md`}
                          style={{
                            background: styleCfg.cardBg,
                          }}
                        >
                          {/* Compact Theme Strip */}
                          <div className="relative h-6 w-full overflow-hidden border-b border-black/25 flex items-center justify-between px-2 gap-1.5">
                            <img
                              src={styleCfg.terrainImg}
                              alt={styleCfg.biomeLabel}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div
                              className="absolute inset-0"
                              style={{ background: styleCfg.headerOverlay }}
                            />

                            <div className="relative z-10 flex items-center gap-1.5 min-w-0">
                              <img
                                src={styleCfg.propImg}
                                alt={styleCfg.biomeLabel}
                                className="w-4 h-4 object-contain drop-shadow shrink-0"
                              />
                              <h3 className="font-pirata text-sm leading-none tracking-wide text-white drop-shadow truncate">
                                {styleCfg.biomeLabel}
                              </h3>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-black leading-none border shrink-0 ${styleCfg.badgeBg}`}
                              >
                                {ownedInTheme.length}/{allThemeIslands.length}
                              </span>
                            </div>

                            {setBonus && (
                              <span
                                className={`relative z-10 px-1.5 py-0.2 rounded-full text-[9px] font-black leading-none border shrink-0 ${
                                  isSetActive
                                    ? 'bg-emerald-500 text-slate-950 border-white'
                                    : 'bg-black/65 text-amber-200 border-amber-400/50'
                                }`}
                              >
                                {setBonus.icon}{' '}
                                {isSetActive
                                  ? COMPACT_SET_EFFECTS[setBonus.id] ?? 'Actif ✓'
                                  : `${setProgress}/${setBonus.required}`}
                              </span>
                            )}
                          </div>

                          {/* Compact 2-Column Islands Grid */}
                          <div
                            className={`p-1 grid gap-1 ${
                              ownedInTheme.length === 1
                                ? 'grid-cols-1'
                                : 'grid-cols-2'
                            }`}
                          >
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
                                  className={`w-full rounded-lg px-1.5 ${
                                    isDense ? 'py-0.5' : 'py-1'
                                  } border flex items-center justify-between gap-1 text-left transition cursor-pointer hover:brightness-105 active:scale-[0.99] min-w-0 ${styleCfg.statBoxBg}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full border border-black/40 shrink-0"
                                      style={{ backgroundColor: tile.color }}
                                    />
                                    <div className="min-w-0">
                                      <div
                                        className={`text-[11px] font-black leading-tight flex items-center gap-1 truncate ${styleCfg.titleColor}`}
                                      >
                                        <span className="truncate">
                                          {tile.name}
                                        </span>
                                        {tile.trapped && tile.level > 0 && (
                                          <span
                                            className="text-[9px] shrink-0"
                                            title="Forteresse piégée"
                                          >
                                            💣
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`text-[9px] font-extrabold flex items-center gap-1 leading-none truncate ${styleCfg.subTextColor}`}
                                      >
                                        {fortImg && (
                                          <img
                                            src={fortImg}
                                            alt={
                                              FORTRESS_LEVEL_NAMES[tile.level]
                                            }
                                            className="w-2.5 h-2.5 object-contain shrink-0"
                                          />
                                        )}
                                        <span className="truncate">
                                          {FORTRESS_LEVEL_NAMES[tile.level]}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black leading-none border ${styleCfg.badgeBg}`}
                                  >
                                    {currentRent} Or
                                  </span>
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
