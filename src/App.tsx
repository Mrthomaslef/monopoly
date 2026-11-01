import React from 'react';
import { Scene } from './components/3d/Scene';
import { TopHUD } from './components/ui/TopHUD';
import { BottomDeck } from './components/ui/BottomDeck';
import { NavalBattleModal } from './components/ui/NavalBattleModal';
import { CardModal } from './components/ui/CardModal';
import { GameSetupModal } from './components/ui/GameSetupModal';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const phase = useGameStore((s) => s.phase);
  const dice = useGameStore((s) => s.dice);

  const activePlayer = players[currentPlayerIndex];

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* Zone Haute (15%): HUD en planches de bois des Capitaines, Audio & Caméra */}
      <TopHUD />

      {/* Zone Centrale (60%): Canvas 3D prenant toute la largeur */}
      <div className="relative flex-1 h-[60dvh] w-full overflow-hidden">
        <Scene />

        {/* Wooden Plank Turn Banner on Top of 3D Canvas */}
        {activePlayer && (
          <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 z-10 wood-plank wood-nails flex items-center gap-2 px-3.5 py-1 rounded-xl shadow-xl">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/60"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span className="text-xs font-black text-amber-100">
              Tour de {activePlayer.name}
            </span>
            <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-700/50">
              🎲 {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
            </span>
            {activePlayer.isAI && phase !== 'GAME_OVER' && (
              <span className="text-[10px] font-bold text-cyan-300 animate-pulse">
                • IA en manœuvre...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Zone Basse (25%): Tiroir de commandement Planches de Bois & Parchemin */}
      <BottomDeck />

      {/* Modales : Configuration Joueurs/IA, Bataille Navale & Cartes Parchemin */}
      <GameSetupModal />
      <NavalBattleModal />
      <CardModal />
    </main>
  );
};

export default App;
