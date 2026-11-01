import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Handshake, Minus, Plus, X } from 'lucide-react';
import {
  useGameStore,
  evaluateAITrade,
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
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, max, step, onChange }) => (
  <div className="flex items-center justify-between gap-1 rounded-lg bg-black/35 px-1.5 py-1">
    <span className="text-[11px] font-black text-amber-200">{label}</span>
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Diminuer"
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-6 h-6 rounded-md bg-slate-800 border border-amber-500/40 flex items-center justify-center disabled:opacity-35 cursor-pointer"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center text-xs font-black tabular-nums">{value}</span>
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

const TradeSide: React.FC<{
  title: string;
  owner: Player;
  islands: TileData[];
  side: SideState;
  onChange: (side: SideState) => void;
}> = ({ title, owner, islands, side, onChange }) => (
  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
    <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
      {title}
    </div>
    <Stepper
      label={<Coins className="w-3.5 h-3.5 text-amber-400" />}
      value={side.gold}
      max={Math.max(0, owner.gold)}
      step={GOLD_STEP}
      onChange={(gold) => onChange({ ...side, gold })}
    />
    <Stepper
      label="🪵"
      value={side.materials}
      max={owner.materials}
      step={1}
      onChange={(materials) => onChange({ ...side, materials })}
    />
    {islands.length === 0 && (
      <div className="text-[11px] font-semibold text-slate-400 py-1">Aucune île</div>
    )}
    {islands.map((tile) => {
      const selected = side.tileIds.includes(tile.id);
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
          className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 text-left text-[11px] font-bold leading-tight cursor-pointer ${
            selected
              ? 'bg-emerald-700 border-emerald-200 text-white'
              : 'bg-black/35 border-white/15 text-slate-100'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: tile.color }}
          />
          <span className="flex-1 min-w-0">
            {tile.name}
            {tile.level > 0 && ` ${'★'.repeat(tile.level)}`}
          </span>
          {getTileSetBonus(tile.id) && (
            <span title={getTileSetBonus(tile.id)!.name} className="shrink-0">
              {getTileSetBonus(tile.id)!.icon}
            </span>
          )}
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
      <div className="relative w-full max-w-[420px] max-h-full flex flex-col rounded-2xl border-2 border-sky-400/80 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
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
          <div className="mt-3 min-h-0 overflow-y-auto pirate-scroll text-center">
            <div className="flex items-center justify-center gap-2">
              <CaptainAvatar captainId={partner.id} color={partner.color} size="md" />
              <span className="text-base font-black leading-tight">{partner.name}, à toi !</span>
            </div>
            <div className="mt-3 rounded-xl bg-black/40 border border-white/15 p-2.5 text-xs font-bold text-left space-y-1.5">
              <div>
                <span className="text-emerald-300">Tu reçois :</span> {describe(give)}
              </div>
              <div>
                <span className="text-rose-300">Tu donnes :</span> {describe(receive)}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
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
                {rivals.map((rival) => (
                  <button
                    key={rival.id}
                    type="button"
                    aria-pressed={rival.id === partner.id}
                    onClick={() => {
                      setPartnerId(rival.id);
                      setReceive(EMPTY_SIDE);
                      setMessage(null);
                    }}
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 text-[11px] leading-tight text-center font-black cursor-pointer ${
                      rival.id === partner.id
                        ? 'bg-sky-700 border-sky-200'
                        : 'bg-black/35 border-white/15'
                    }`}
                  >
                    <CaptainAvatar captainId={rival.id} color={rival.color} size="sm" />
                    <span>{rival.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2.5 flex-1 flex items-start gap-2 overflow-y-auto pirate-scroll min-h-0">
              <TradeSide
                title="Tu donnes"
                owner={proposer}
                islands={islandsOf(proposer.id)}
                side={give}
                onChange={(side) => {
                  setGive(side);
                  setMessage(null);
                }}
              />
              <TradeSide
                title="Tu reçois"
                owner={partner}
                islands={islandsOf(partner.id)}
                side={receive}
                onChange={(side) => {
                  setReceive(side);
                  setMessage(null);
                }}
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
