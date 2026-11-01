import React, { useState } from 'react';
import {
  useGameStore,
  UPGRADE_COST,
  UPGRADE_MATERIAL_COST,
  CULVERIN_RANGE,
  FORTRESS_LEVEL_NAMES,
  canAccessUpgradesShop,
  getCulverinTargets,
  getTileDistance,
} from '../../store/useGameStore';
import {
  Swords,
  Bomb,
  Crosshair,
  Coins,
  X,
  CheckCircle2,
  MapPin,
  Flame,
} from 'lucide-react';

export const UpgradesModal: React.FC = () => {
  const showUpgradesModal = useGameStore((s) => s.showUpgradesModal);
  const setShowUpgradesModal = useGameStore((s) => s.setShowUpgradesModal);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const tiles = useGameStore((s) => s.tiles);
  const hasFiredCulverinThisTurn = useGameStore((s) => s.hasFiredCulverinThisTurn);
  const buyPerfectBoarding = useGameStore((s) => s.buyPerfectBoarding);
  const buyTrappedFortress = useGameStore((s) => s.buyTrappedFortress);
  const buyCulverin = useGameStore((s) => s.buyCulverin);
  const fireCulverin = useGameStore((s) => s.fireCulverin);

  const activePlayer = players[currentPlayerIndex];

  // Owned fortresses (level >= 1) that are not yet trapped
  const trappableFortresses = activePlayer
    ? tiles.filter(
        (t) =>
          t.type === 'island' &&
          t.ownerId === activePlayer.id &&
          t.level >= 1 &&
          !t.trapped
      )
    : [];

  const [selectedTrapTileId, setSelectedTrapTileId] = useState<number | null>(null);

  if (!showUpgradesModal || !activePlayer || activePlayer.isAI) return null;

  const currentTile = tiles[activePlayer.position];
  const canShopHere = canAccessUpgradesShop(activePlayer, tiles);
  const canAfford =
    activePlayer.gold >= UPGRADE_COST &&
    activePlayer.materials >= UPGRADE_MATERIAL_COST;
  const culverinTargets = getCulverinTargets(activePlayer, tiles);

  const effectiveTrapTileId =
    selectedTrapTileId !== null &&
    trappableFortresses.some((t) => t.id === selectedTrapTileId)
      ? selectedTrapTileId
      : trappableFortresses[0]?.id ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-auto bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[390px] max-h-[86vh] flex flex-col rounded-3xl pirate-Wood-panel border-2 border-amber-500/70 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-amber-500/25">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg shadow-inner">
              🏴‍☠️
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-300 leading-tight">
                Arsenal & Améliorations
              </h2>
              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                {currentTile?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-amber-500/40 px-2 py-1 rounded-xl">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-black text-amber-300 tabular-nums">
                {activePlayer.gold}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-amber-950/85 border border-orange-400/50 px-2 py-1 rounded-xl">
              <span className="text-xs font-black text-orange-200 tabular-nums">
                🪵 {activePlayer.materials}
              </span>
            </div>
            <button
              onClick={() => setShowUpgradesModal(false)}
              className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-600/50 active:scale-95 transition-all"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Location availability notice */}
        {!canShopHere && (
          <div className="mt-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 px-3 py-2 text-[11px] font-bold text-amber-200 leading-snug">
            ⚓ Achats disponibles uniquement à <span className="text-amber-300 font-black">Port Royal</span>, à la{' '}
            <span className="text-amber-300 font-black">Taverne de Tortuga</span> ou sur{' '}
            <span className="text-amber-300 font-black">l’une de vos îles</span>.
          </div>
        )}

        {/* Scrollable Content */}
        <div className="mt-2.5 space-y-2.5 overflow-y-auto pr-0.5 flex-1">
          {/* Active Culverin Firing Section if owned */}
          {activePlayer.hasCulverin && (
            <div className="rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-900/90 to-orange-950/70 border-2 border-red-500/50 p-3 shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-red-400" />
                  Tir de Coulevrine (≤ {CULVERIN_RANGE} cases)
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-200">
                  {hasFiredCulverinThisTurn ? 'Tir effectué ce tour' : 'Prêt à tirer'}
                </span>
              </div>

              {culverinTargets.length === 0 ? (
                <p className="text-[11px] text-slate-300 font-semibold">
                  Aucun bâtiment adverse à moins de {CULVERIN_RANGE} cases de votre navire.
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {culverinTargets.map((target) => {
                    const owner = players.find((p) => p.id === target.ownerId);
                    const dist = getTileDistance(activePlayer.position, target.id);
                    return (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-2 bg-slate-950/80 border border-red-500/35 rounded-xl px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">
                            {target.name}{' '}
                            <span className="text-[10px] font-bold text-amber-300">
                              ({dist} {dist > 1 ? 'cases' : 'case'})
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 truncate">
                            {owner?.name} • {FORTRESS_LEVEL_NAMES[target.level]} →{' '}
                            <span className="text-red-300 font-black">
                              {FORTRESS_LEVEL_NAMES[Math.max(0, target.level - 1)]} (-1 étage)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => fireCulverin(target.id)}
                          disabled={hasFiredCulverinThisTurn}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 disabled:opacity-40 text-white font-black text-[11px] uppercase tracking-wider border border-red-300/60 shadow active:scale-95 transition-all"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Tirer
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 1. Abordage Parfait */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/35 p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wide">
                    Abordage Parfait
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                    Récupère <span className="text-amber-300 font-black">50% de l’or</span> de l’adversaire lors d’un abordage gagné.
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
                {UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵
              </span>
            </div>

            {activePlayer.hasPerfectBoarding ? (
              <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> Équipé sur votre navire
              </div>
            ) : (
              <button
                onClick={buyPerfectBoarding}
                disabled={!canShopHere || !canAfford}
                className="w-full py-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider border border-amber-300/60 shadow active:scale-95 transition-all"
              >
                Acheter ({UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵)
              </button>
            )}
          </div>

          {/* 2. Forteresse Piégée */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/35 p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-400/40 flex items-center justify-center text-orange-300 shrink-0">
                  <Bomb className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wide">
                    Forteresse Piégée
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                    Sur une de vos forteresses : fait perdre{' '}
                    <span className="text-orange-300 font-black">50% de son or</span> à l’ennemi qui tombe dessus.
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
                {UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵
              </span>
            </div>

            {trappableFortresses.length === 0 ? (
              <div className="py-1.5 px-2.5 rounded-xl bg-slate-950/70 border border-slate-700/60 text-slate-400 text-[11px] font-bold text-center">
                Construisez d’abord au moins 1 étage de fortification sur une de vos îles.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {trappableFortresses.map((fort) => {
                    const isSelected = fort.id === effectiveTrapTileId;
                    return (
                      <button
                        key={fort.id}
                        type="button"
                        onClick={() => setSelectedTrapTileId(fort.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${
                          isSelected
                            ? 'bg-orange-500/25 border-orange-400 text-orange-200'
                            : 'bg-slate-950/70 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🏰 {fort.name} (Niv.{fort.level})
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    effectiveTrapTileId !== null && buyTrappedFortress(effectiveTrapTileId)
                  }
                  disabled={!canShopHere || !canAfford || effectiveTrapTileId === null}
                  className="w-full py-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider border border-orange-300/60 shadow active:scale-95 transition-all"
                >
                  Piéger ({UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵)
                </button>
              </>
            )}
          </div>

          {/* 3. Tir de Coulevrine */}
          <div className="rounded-2xl bg-slate-900/90 border border-amber-500/35 p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wide">
                    Tir de Coulevrine
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                    À <span className="text-sky-300 font-black">≤ {CULVERIN_RANGE} cases</span> d’un bâtiment adverse, tirez dessus pour lui faire perdre{' '}
                    <span className="text-rose-300 font-black">1 étage de construction</span>.
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 rounded-lg whitespace-nowrap">
                {UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵
              </span>
            </div>

            {activePlayer.hasCulverin ? (
              <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> Coulevrine équipée
              </div>
            ) : (
              <button
                onClick={buyCulverin}
                disabled={!canShopHere || !canAfford}
                className="w-full py-2 rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider border border-sky-300/60 shadow active:scale-95 transition-all"
              >
                Acheter ({UPGRADE_COST} Or + {UPGRADE_MATERIAL_COST} 🪵)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
