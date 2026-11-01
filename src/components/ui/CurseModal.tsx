import React from 'react';
import { Skull, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { CaptainAvatar } from './CaptainAvatar';

export const CurseModal: React.FC = () => {
  const show = useGameStore((s) => s.showCurseModal);
  const setShow = useGameStore((s) => s.setShowCurseModal);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const castCurse = useGameStore((s) => s.castCurse);
  const result = useGameStore((s) => s.curseResult);

  const caster = players[currentPlayerIndex];
  if (!show || !caster || caster.isAI) return null;

  const targets = players.filter((p) => p.id !== caster.id && !p.bankrupt);

  return (
    <div className="safe-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-[360px] max-h-full overflow-y-auto pirate-scroll rounded-2xl border-2 border-purple-400 bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 p-4 text-purple-50 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Fermer"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/55 border border-white/30 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="flex items-center gap-2 pr-8 text-sm font-black uppercase tracking-wider text-purple-200">
          <Skull className="w-5 h-5 shrink-0" />
          Rituel Maya
        </h2>

        {result ? (
          <div className="mt-3 text-center">
            <div className="font-pirata text-2xl text-purple-200">{result.title}</div>
            <p className="mt-1 text-sm font-bold">
              {result.targetName} {result.description} !
            </p>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-black uppercase bg-purple-600 border border-purple-200 cursor-pointer"
            >
              Continuer
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-xs font-semibold text-purple-100/90">
              Au hasard : -140 Or, -100 Or ou la Cale.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {targets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => castCurse(target.id)}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 hover:bg-purple-800/60 border border-purple-400/50 text-left cursor-pointer"
                >
                  <CaptainAvatar captainId={target.id} color={target.color} size="sm" />
                  <span className="flex-1 min-w-0 text-sm font-black leading-tight">{target.name}</span>
                  <span className="shrink-0 text-xs font-black text-amber-300">{target.gold} Or</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-purple-200/70">
              À garder pour plus tard, non cumulable.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
