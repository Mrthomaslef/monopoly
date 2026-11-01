import React from 'react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { LandedTilePopup } from './components/ui/LandedTilePopup';
import { FortifySelectorModal } from './components/ui/FortifySelectorModal';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);

  const activePlayer = players[currentPlayerIndex];

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute: HUD Capitaines, Caméra & Partie */}
      <TopHUD />

      {/* Zone Centrale: Plateau 3D dégagé */}
      <div className="relative flex-1 w-full overflow-hidden">
        <Scene />

        {/* Compact Turn Pill at Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 wood-plank flex items-center gap-2 px-3.5 py-1 rounded-full shadow-xl border border-amber-500/40">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/80 shrink-0"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs font-black text-white drop-shadow">
              Tour de {activePlayer.name}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/55 text-amber-300 border border-amber-500/40">
              🎲 {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
            </span>
            {activePlayer.isAI && phase !== 'GAME_OVER' && (
              <span className="text-[11px] font-bold text-cyan-300 animate-pulse">
                • IA
              </span>
            )}
          </div>
        )}
      </div>

      {/* Zone Basse: Barre de commandement contextuelle & Fiche d'île */}
      <BottomDeck />

      {/* Modales */}
      <LandedTilePopup />
      <FortifySelectorModal />
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;
