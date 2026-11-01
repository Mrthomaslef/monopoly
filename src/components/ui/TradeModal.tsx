import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Eye, Handshake, MapPin, Minus, Plus, X } from 'lucide-react';
import {
  useGameStore,
  calculateIslandRent,
  evaluateAITrade,
  FORTRESS_LEVEL_NAMES,
  getTileSetBonus,
  isTradeValid,
  Player,
  TileData,
  TradeOffer,
} from '../../store/useGameStore';
import { CaptainAvatar } from './CaptainAvatar';

const GOLD_STEP = 50;

interface SideState {
  tileIds: number[];
  gold: number;
  materials: number;
}

const EMPTY_SIDE: SideState = { tileIds: [], gold: 0, materials: 0 };

const Stepper: React.FC<{
  label: React.ReactNode;
  stockLabel: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, stockLabel, value, max, step, onChange }) => (
  <div className="flex items-center justify-between gap-1 rounded-lg bg-black/45 border border-white/10 px-1.5 py-1">
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] font-black text-amber-200 flex items-center gap-1 leading-tight">
        {label}
      </span>
      <span className="text-[9px] font-bold text-slate-300/85 leading-tight">
        Possédé : {stockLabel}
      </span>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        aria-label="Diminuer"
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-6 h-6 rounded-md bg-slate-800 border border-amber-500/40 flex items-center justify-center disabled:opacity-35 cursor-pointer"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="min-w-8 px-0.5 text-center text-xs font-black tabular-nums text-amber-100">
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-6 h-6 rounded-md bg-slate-800 border border-amber-500/40 flex items-center justify-center disabled:opacity-35 cursor-pointer"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const PlayerPossessionsCard: React.FC<{
  owner: Player;
  islandsCount: number;
  onInspect: () => void;
}> = ({ owner, islandsCount, onInspect }) => (
  <div
    className="rounded-xl bg-black/50 border p-1.5 flex flex-col gap-1"
    style={{ borderColor: `${owner.color}88` }}
  >
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <CaptainAvatar captainId={owner.id} color={owner.color} size="sm" />
        <div className="min-w-0">
          <div
            className="text-[11px] font-black leading-tight truncate"
            style={{ color: owner.accentColor || '#ffffff' }}
          >
            {owner.name}
          </div>
          <div className="text-[9px] font-bold text-slate-300/80 leading-tight">
            Possessions
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onInspect}
        title={`Voir toutes les possessions et bonus de ${owner.name}`}
        className="shrink-0 p-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-amber-200 cursor-pointer"
        aria-label={`Inspecter ${owner.name}`}
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-1 text-[10px] font-black leading-none">
      <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 border border-amber-400/50 text-amber-300 inline-flex items-center gap-0.5">
        <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />
        {owner.gold} Or
      </span>
      <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 border border-orange-400/50 text-orange-200 inline-flex items-center gap-0.5">
        🪵 {owner.materials}
      </span>
      <span className="px-1.5 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 inline-flex items-center gap-0.5">
        <MapPin className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
        {islandsCount} {islandsCount > 1 ? 'îles' : 'île'}
      </span>
    </div>
  </div>
);

const TradeSide: React.FC<{
  title: string;
  owner: Player;
  islands: TileData[];
  allTiles: TileData[];
  side: SideState;
  onChange: (side: SideState) => void;
  onInspectOwner: () => void;
}> = ({ title, owner, islands, allTiles, side, onChange, onInspectOwner }) => (
  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
    <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
      {title}
    </div>

    <PlayerPossessionsCard
      owner={owner}
      islandsCount={islands.length}
      onInspect={onInspectOwner}
    />

    <Stepper
      label={
        <>
          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Or</span>
        </>
      }
      stockLabel={`${owner.gold} Or`}
      value={side.gold}
      max={Math.max(0, owner.gold)}
      step={GOLD_STEP}
      onChange={(gold) => onChange({ ...side, gold })}
    />
    <Stepper
      label={<span>🪵 Matériaux</span>}
      stockLabel={`${owner.materials}`}
      value={side.materials}
      max={owner.materials}
      step={1}
      onChange={(materials) => onChange({ ...side, materials })}
    />

    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-300 pt-0.5">
      <span>Îles possédées ({islands.length})</span>
      {side.tileIds.length > 0 && (
        <span className="text-emerald-300">
          {side.tileIds.length} choisie{side.tileIds.length > 1 ? 's' : ''}
        </span>
      )}
    </div>

    {islands.length === 0 && (
      <div className="rounded-lg bg-black/25 border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-400 text-center">
        Aucune île possédée
      </div>
    )}
    {islands.map((tile) => {
      const selected = side.tileIds.includes(tile.id);
      const rent = calculateIslandRent(tile, allTiles);
      const bonus = getTileSetBonus(tile.id);
      return (
        <button
          key={tile.id}
          type="button"
          aria-pressed={selected}
          onClick={() =>
            onChange({
              ...side,
              tileIds: selected
                ? side.tileIds.filter((id) => id !== tile.id)
                : [...side.tileIds, tile.id],
            })
          }
          className={`flex flex-col gap-0.5 rounded-lg border px-1.5 py-1.5 text-left leading-tight transition cursor-pointer ${
            selected
              ? 'bg-emerald-700 border-emerald-200 text-white shadow-[0_0_10px_rgba(16,185,129,0.45)]'
              : 'bg-black/40 hover:bg-black/55 border-white/15 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-1 w-full">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
              style={{ backgroundColor: tile.color }}
            />
            <span className="flex-1 min-w-0 text-[11px] font-black">
              {tile.name}
              {tile.level > 0 && ` ${'★'.repeat(tile.level)}`}
            </span>
            {tile.trapped && tile.level > 0 && (
              <span title="Forteresse Piégée" className="shrink-0 text-[10px]">
                💣
              </span>
            )}
            {bonus && (
              <span title={bonus.name} className="shrink-0 text-xs">
                {bonus.icon}
              </span>
            )}
          </div>
          <div
            className={`text-[9px] font-bold flex flex-wrap items-center gap-x-1 pl-3.5 ${
              selected ? 'text-emerald-100' : 'text-slate-300/85'
            }`}
          >
            <span>{tile.group}</span>
            <span>•</span>
            <span>{FORTRESS_LEVEL_NAMES[tile.level]}</span>
            <span>•</span>
            <span className="text-amber-300 font-black">Loyer {rent} Or</span>
          </div>
        </button>
      );
    })}
  </div>
);

export const TradeModal: React.FC = () => {
  const show = useGameStore((s) => s.showTradeModal);
  const setShow = useGameStore((s) => s.setShowTradeModal);
  const players = useGameStore((s) => s.players);
  const tiles = useGameStore((s) => s.tiles);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const executeTrade = useGameStore((s) => s.executeTrade);
  const setInspectedPlayerId = useGameStore((s) => s.setInspectedPlayerId);

  const proposer = players[currentPlayerIndex];
  const rivals = useMemo(
    () => players.filter((p) => p.id !== proposer?.id && !p.bankrupt),
    [players, proposer?.id]
  );

  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [give, setGive] = useState<SideState>(EMPTY_SIDE);
  const [receive, setReceive] = useState<SideState>(EMPTY_SIDE);
  const [awaitingPartner, setAwaitingPartner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetOffer = () => {
    setGive(EMPTY_SIDE);
    setReceive(EMPTY_SIDE);
    setAwaitingPartner(false);
  };

  useEffect(() => {
    if (show) {
      setPartnerId(null);
      setMessage(null);
      resetOffer();
    }
  }, [show]);

  if (!show || !proposer || proposer.isAI) return null;

  const partner = rivals.find((p) => p.id === partnerId) ?? rivals[0];
  if (!partner) return null;

  const offer: TradeOffer = {
    partnerId: partner.id,
    giveTileIds: give.tileIds,
    receiveTileIds: receive.tileIds,
    giveGold: give.gold,
    receiveGold: receive.gold,
    giveMaterials: give.materials,
    receiveMaterials: receive.materials,
  };
  const valid = isTradeValid(offer, proposer, partner, tiles);

  const islandsOf = (playerId: number) =>
    tiles.filter((t) => t.type === 'island' && t.ownerId === playerId);

  const proposerIslands = islandsOf(proposer.id);
  const partnerIslands = islandsOf(partner.id);

  const describe = (side: SideState) => {
    const parts = side.tileIds.map((id) => tiles[id].name);
    if (side.gold > 0) parts.push(`${side.gold} Or`);
    if (side.materials > 0) parts.push(`${side.materials} 🪵`);
    return parts.length > 0 ? parts.join(', ') : 'rien';
  };

  const conclude = () => {
    if (executeTrade(offer)) {
      setMessage(`🤝 Échange conclu avec ${partner.name} !`);
    } else {
      setMessage('Cet échange n’est plus possible.');
    }
    resetOffer();
  };

  const propose = () => {
    if (!valid) return;
    if (!partner.isAI) {
      setAwaitingPartner(true);
      return;
    }
    const answer = evaluateAITrade(offer, proposer.id, tiles);
    if (answer.accepted) {
      conclude();
    } else {
      setMessage(
        `❌ ${partner.name} refuse : il manque environ ${answer.missingGold} Or de valeur.`
      );
    }
  };

  return (
    <div className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-[440px] max-h-full flex flex-col rounded-2xl border-2 border-sky-400/80 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Fermer"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/55 border border-white/30 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="flex items-center gap-2 pr-8 text-sm font-black uppercase tracking-wider text-sky-200">
          <Handshake className="w-5 h-5 shrink-0" />
          Échange
        </h2>

        {awaitingPartner ? (
          <div className="mt-3 min-h-0 overflow-y-auto pirate-scroll text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2">
              <CaptainAvatar captainId={partner.id} color={partner.color} size="md" />
              <span className="text-base font-black leading-tight">{partner.name}, à toi !</span>
            </div>

            <div className="text-left">
              <PlayerPossessionsCard
                owner={partner}
                islandsCount={partnerIslands.length}
                onInspect={() => setInspectedPlayerId(partner.id)}
              />
              {partnerIslands.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {partnerIslands.map((tile) => (
                    <span
                      key={tile.id}
                      className="inline-flex items-center gap-1 rounded-md bg-black/45 border border-white/15 px-1.5 py-0.5 text-[10px] font-bold text-slate-200"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tile.color }}
                      />
                      <span>{tile.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-black/40 border border-white/15 p-2.5 text-xs font-bold text-left space-y-1.5">
              <div>
                <span className="text-emerald-300">Tu reçois :</span> {describe(give)}
              </div>
              <div>
                <span className="text-rose-300">Tu donnes :</span> {describe(receive)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAwaitingPartner(false);
                  setMessage(`❌ ${partner.name} refuse l’échange.`);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase bg-rose-700 border border-rose-200 cursor-pointer"
              >
                Refuser
              </button>
              <button
                type="button"
                onClick={conclude}
                className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase bg-emerald-500 text-slate-950 border border-emerald-100 cursor-pointer"
              >
                Accepter
              </button>
            </div>
          </div>
        ) : (
          <>
            {rivals.length > 1 && (
              <div className="mt-2.5 flex gap-1.5">
                {rivals.map((rival) => {
                  const rivalIslandCount = islandsOf(rival.id).length;
                  return (
                    <button
                      key={rival.id}
                      type="button"
                      aria-pressed={rival.id === partner.id}
                      onClick={() => {
                        setPartnerId(rival.id);
                        setReceive(EMPTY_SIDE);
                        setMessage(null);
                      }}
                      className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 text-[11px] leading-tight text-center font-black cursor-pointer ${
                        rival.id === partner.id
                          ? 'bg-sky-700 border-sky-200'
                          : 'bg-black/35 border-white/15'
                      }`}
                    >
                      <CaptainAvatar captainId={rival.id} color={rival.color} size="sm" />
                      <span className="truncate max-w-full">{rival.name}</span>
                      <span className="text-[9px] font-bold text-amber-200/90 flex flex-wrap items-center justify-center gap-x-1">
                        <span>{rival.gold} Or</span>
                        <span>•</span>
                        <span>🪵{rival.materials}</span>
                        <span>•</span>
                        <span>🏝️{rivalIslandCount}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2.5 flex-1 flex items-start gap-2 overflow-y-auto pirate-scroll min-h-0">
              <TradeSide
                title="Tu donnes"
                owner={proposer}
                islands={proposerIslands}
                allTiles={tiles}
                side={give}
                onChange={(side) => {
                  setGive(side);
                  setMessage(null);
                }}
                onInspectOwner={() => setInspectedPlayerId(proposer.id)}
              />
              <TradeSide
                title="Tu reçois"
                owner={partner}
                islands={partnerIslands}
                allTiles={tiles}
                side={receive}
                onChange={(side) => {
                  setReceive(side);
                  setMessage(null);
                }}
                onInspectOwner={() => setInspectedPlayerId(partner.id)}
              />
            </div>

            {message && (
              <div className="mt-2 shrink-0 rounded-lg bg-black/45 border border-white/15 px-2.5 py-1.5 text-xs font-bold text-amber-100">
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={!valid}
              onClick={propose}
              className="mt-2.5 shrink-0 w-full py-2.5 px-2 rounded-xl text-sm font-black uppercase leading-tight bg-gradient-to-b from-sky-400 to-blue-600 border border-sky-100 disabled:opacity-40 cursor-pointer"
            >
              Proposer à {partner.name}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
