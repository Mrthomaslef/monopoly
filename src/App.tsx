import React from 'react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);

  const activePlayer = players[currentPlayerIndex];

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute (15%): HUD compact des Capitaines, Audio & Caméra */}
      <TopHUD />

      {/* Zone Centrale (60%): Canvas 3D prenant toute la largeur */}
      <div className="relative flex-1 h-[60dvh] w-full overflow-hidden">
        <Scene />

        {/* Subtle Floating Turn Pill on Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/75 border border-amber-500/50 backdrop-blur-xs shadow-lg">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs font-extrabold text-amber-100">
              Tour de {activePlayer.name}
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              🎲 {dice[0]} + {dice[1]}
            </span>
            {activePlayer.isAI && phase !== 'GAME_OVER' && (
              <span className="text-[10px] font-semibold text-cyan-300 animate-pulse">
                • IA en manœuvre...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Zone Basse (25%): Tiroir de commandement Bois & Parchemin */}
      <BottomDeck />

      {/* Modales : Bataille Navale (Abordage) & Cartes Parchemin / Victoire */}
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;
