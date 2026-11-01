import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { soundEffects } from '../utils/soundEffects';

export type TileType =
  | 'start'
  | 'island'
  | 'chest'
  | 'curse'
  | 'tax'
  | 'jail'
  | 'free_parking'
  | 'go_to_jail';

export interface TileData {
  id: number;
  name: string;
  type: TileType;
  color: string;
  group: string;
  price?: number;
  baseRent?: number;
  upgradeCost?: number;
  ownerId: number | null;
  level: number;
  trapped?: boolean;
  description?: string;
}

export interface Player {
  id: number;
  name: string;
  title: string;
  color: string;
  sailColor: string;
  accentColor: string;
  isAI: boolean;
  gold: number;
  materials: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  hasPerfectBoarding?: boolean;
  hasCulverin?: boolean;
}

export interface PlayerSlotConfig {
  id: number;
  name: string;
  title: string;
  color: string;
  sailColor: string;
  accentColor: string;
  enabled: boolean;
  isAI: boolean;
}

export interface FloatingTextItem {
  id: string;
  tileIndex: number;
  text: string;
  color: string;
}

export interface DrawnCard {
  deck: 'chest' | 'curse';
  title: string;
  description: string;
  goldDelta?: number;
  materialsDelta?: number;
  moveToTile?: number;
  goToJail?: boolean;
}

export interface NavalBattleState {
  active: boolean;
  tileIndex: number;
  attackerId: number;
  defenderId: number;
  attackerRoll: number | null;
  defenderRoll: number | null;
  phase: 'ready' | 'rolling' | 'firing' | 'resolved';
  winnerId: number | null;
  loserId: number | null;
  plunderAmount: number;
  materialsLooted?: number;
}

export interface CannonShotData {
  id: string;
  fromTile: number;
  toTile: number;
  fromOffset: [number, number, number];
  toOffset: [number, number, number];
  active: boolean;
}

export type TurnPhase =
  | 'IDLE'          // Waiting to roll dice
  | 'ROLLING'       // Dice jumping in 3D
  | 'MOVING'        // Ship hopping tile by tile
  | 'TILE_ACTION'   // Landed on tile: can buy/upgrade or resolving card
  | 'NAVAL_BATTLE'  // Naval combat modal & 3D cannon shot
  | 'END_TURN'      // Ready to end turn (and optionally fortify)
  | 'GAME_OVER';    // Victory screen

export type CameraMode = 'GLOBAL' | 'FOLLOW';

export const BOARD_SPACING = 1.65;
export const FORTIFY_MATERIAL_COST = 1;
export const INITIAL_MATERIALS = 2;
export const MAX_FORTIFY_LEVEL = 3;
export const UPGRADE_COST = 1000;
export const CULVERIN_RANGE = 3;

export const FORTRESS_LEVEL_NAMES = [
  'Mouillage',
  'Mur en Bois',
  'Mur en Pierre',
  'Château Pirate',
] as const;

export const FORTRESS_LEVEL_IMAGES: Record<number, string | null> = {
  0: null,
  1: './assets/fort_wood.png',
  2: './assets/fort_stone.png',
  3: './assets/fort_carved_stone.png',
};

export const DEFAULT_CAPTAIN_ROSTER: PlayerSlotConfig[] = [
  {
    id: 0,
    name: 'Cap. Jack',
    title: 'Le Faucon Rouge',
    color: '#ef4444',
    sailColor: '#dc2626',
    accentColor: '#fca5a5',
    enabled: true,
    isAI: false,
  },
  {
    id: 1,
    name: 'Anne Bonny',
    title: 'La Reine Bleue',
    color: '#3b82f6',
    sailColor: '#2563eb',
    accentColor: '#93c5fd',
    enabled: true,
    isAI: true,
  },
  {
    id: 2,
    name: 'Barbe-Verte',
    title: 'Le Fléau d’Émeraude',
    color: '#10b981',
    sailColor: '#059669',
    accentColor: '#6ee7b7',
    enabled: true,
    isAI: true,
  },
  {
    id: 3,
    name: 'Barbe-Noire',
    title: 'Terreur Noire & Or',
    color: '#f59e0b',
    sailColor: '#1e293b',
    accentColor: '#fde047',
    enabled: true,
    isAI: true,
  },
];

/**
 * Returns the exact 3D world position [x, y, z] and rotationY for any of the 24 tiles (0..23)
 * 7 tiles per side (indices 0, 6, 12, 18 are corners)
 */
export function getTileTransform(index: number): {
  position: [number, number, number];
  rotationY: number;
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner';
} {
  const i = ((index % 24) + 24) % 24;
  const S = BOARD_SPACING;

  if (i === 0) {
    return { position: [3 * S, 0, 3 * S], rotationY: 0, side: 'corner' };
  }
  if (i > 0 && i < 6) {
    return { position: [(3 - i) * S, 0, 3 * S], rotationY: 0, side: 'bottom' };
  }
  if (i === 6) {
    return { position: [-3 * S, 0, 3 * S], rotationY: Math.PI / 2, side: 'corner' };
  }
  if (i > 6 && i < 12) {
    const offset = i - 6;
    return { position: [-3 * S, 0, (3 - offset) * S], rotationY: Math.PI / 2, side: 'left' };
  }
  if (i === 12) {
    return { position: [-3 * S, 0, -3 * S], rotationY: Math.PI, side: 'corner' };
  }
  if (i > 12 && i < 18) {
    const offset = i - 12;
    return { position: [(-3 + offset) * S, 0, -3 * S], rotationY: Math.PI, side: 'top' };
  }
  if (i === 18) {
    return { position: [3 * S, 0, -3 * S], rotationY: -Math.PI / 2, side: 'corner' };
  }
  const offset = i - 18;
  return { position: [3 * S, 0, (-3 + offset) * S], rotationY: -Math.PI / 2, side: 'right' };
}

/**
 * Returns a slight offset on the central red pirate map trail so multiple ships on the same tile remain distinct
 * while keeping the center of the tile completely clear of the outer scenery props
 */
export function getShipSlotOffset(playerId: number): [number, number, number] {
  const offsets: [number, number, number][] = [
    [-0.18, 0, -0.02],
    [0.18, 0, -0.02],
    [-0.18, 0, 0.18],
    [0.18, 0, 0.18],
  ];
  return offsets[playerId % 4];
}

export const INITIAL_TILES: TileData[] = [
  {
    id: 0,
    name: 'Port Royal',
    type: 'start',
    color: '#f59e0b',
    group: 'Corner',
    ownerId: null,
    level: 0,
    description: 'Point de départ. Recevez +200 Doublons à chaque passage !',
  },
  {
    id: 1,
    name: 'Crique aux Crabes',
    type: 'island',
    color: '#a16207',
    group: 'Récifs Bruns',
    price: 100,
    baseRent: 25,
    upgradeCost: 60,
    ownerId: null,
    level: 0,
  },
  {
    id: 2,
    name: 'Coffre au Trésor',
    type: 'chest',
    color: '#eab308',
    group: 'Event',
    ownerId: null,
    level: 0,
    description: 'Piochez une carte Coffre au Trésor !',
  },
  {
    id: 3,
    name: 'Baie des Épaves',
    type: 'island',
    color: '#a16207',
    group: 'Récifs Bruns',
    price: 120,
    baseRent: 30,
    upgradeCost: 60,
    ownerId: null,
    level: 0,
  },
  {
    id: 4,
    name: 'Taxe de l’Amirauté',
    type: 'tax',
    color: '#dc2626',
    group: 'Tax',
    ownerId: null,
    level: 0,
    description: 'Versez 120 Doublons au pot de la Taverne de Tortuga.',
  },
  {
    id: 5,
    name: 'Atoll de Corail',
    type: 'island',
    color: '#06b6d4',
    group: 'Lagons Azur',
    price: 150,
    baseRent: 40,
    upgradeCost: 80,
    ownerId: null,
    level: 0,
  },
  {
    id: 6,
    name: 'Île du Crâne',
    type: 'jail',
    color: '#475569',
    group: 'Corner',
    ownerId: null,
    level: 0,
    description: 'La Cale : Simple visite ou prisonnier des fers.',
  },
  {
    id: 7,
    name: 'Lagon des Sirènes',
    type: 'island',
    color: '#06b6d4',
    group: 'Lagons Azur',
    price: 170,
    baseRent: 45,
    upgradeCost: 80,
    ownerId: null,
    level: 0,
  },
  {
    id: 8,
    name: 'Malédiction des Mers',
    type: 'curse',
    color: '#7c3aed',
    group: 'Event',
    ownerId: null,
    level: 0,
    description: 'Affrontez les caprices surnaturels de l’océan !',
  },
  {
    id: 9,
    name: 'Récif des Perles',
    type: 'island',
    color: '#ec4899',
    group: 'Archipel Corail',
    price: 200,
    baseRent: 55,
    upgradeCost: 100,
    ownerId: null,
    level: 0,
  },
  {
    id: 10,
    name: 'Port des Flibustiers',
    type: 'island',
    color: '#ec4899',
    group: 'Archipel Corail',
    price: 220,
    baseRent: 60,
    upgradeCost: 100,
    ownerId: null,
    level: 0,
  },
  {
    id: 11,
    name: 'Coffre au Trésor',
    type: 'chest',
    color: '#eab308',
    group: 'Event',
    ownerId: null,
    level: 0,
    description: 'Piochez une carte Coffre au Trésor !',
  },
  {
    id: 12,
    name: 'Taverne de Tortuga',
    type: 'free_parking',
    color: '#16a34a',
    group: 'Corner',
    ownerId: null,
    level: 0,
    description: 'Récupérez tout le butin accumulé au centre du plateau !',
  },
  {
    id: 13,
    name: 'Sanctuaire Vaudou',
    type: 'island',
    color: '#f97316',
    group: 'Îles des Brumes',
    price: 250,
    baseRent: 70,
    upgradeCost: 120,
    ownerId: null,
    level: 0,
  },
  {
    id: 14,
    name: 'Crique du Rhum',
    type: 'island',
    color: '#f97316',
    group: 'Îles des Brumes',
    price: 270,
    baseRent: 75,
    upgradeCost: 120,
    ownerId: null,
    level: 0,
  },
  {
    id: 15,
    name: 'Malédiction des Mers',
    type: 'curse',
    color: '#7c3aed',
    group: 'Event',
    ownerId: null,
    level: 0,
    description: 'Affrontez les caprices surnaturels de l’océan !',
  },
  {
    id: 16,
    name: 'Volcan d’Émeraude',
    type: 'island',
    color: '#10b981',
    group: 'Émeraude',
    price: 300,
    baseRent: 85,
    upgradeCost: 140,
    ownerId: null,
    level: 0,
  },
  {
    id: 17,
    name: 'Forteresse de Jade',
    type: 'island',
    color: '#10b981',
    group: 'Émeraude',
    price: 320,
    baseRent: 95,
    upgradeCost: 140,
    ownerId: null,
    level: 0,
  },
  {
    id: 18,
    name: 'Embuscade du Kraken',
    type: 'go_to_jail',
    color: '#dc2626',
    group: 'Corner',
    ownerId: null,
    level: 0,
    description: 'Le Kraken vous entraîne directement dans La Cale (Île du Crâne) !',
  },
  {
    id: 19,
    name: 'Détroit des Tempêtes',
    type: 'island',
    color: '#ef4444',
    group: 'Bastions Sang',
    price: 350,
    baseRent: 105,
    upgradeCost: 160,
    ownerId: null,
    level: 0,
  },
  {
    id: 20,
    name: 'Bastion de Barbe-Noire',
    type: 'island',
    color: '#ef4444',
    group: 'Bastions Sang',
    price: 380,
    baseRent: 115,
    upgradeCost: 160,
    ownerId: null,
    level: 0,
  },
  {
    id: 21,
    name: 'Coffre au Trésor',
    type: 'chest',
    color: '#eab308',
    group: 'Event',
    ownerId: null,
    level: 0,
    description: 'Piochez une carte Coffre au Trésor !',
  },
  {
    id: 22,
    name: 'Citadelle d’Or',
    type: 'island',
    color: '#fbbf24',
    group: 'Couronne d’Or',
    price: 420,
    baseRent: 130,
    upgradeCost: 180,
    ownerId: null,
    level: 0,
  },
  {
    id: 23,
    name: 'Île du Trésor Maudit',
    type: 'island',
    color: '#fbbf24',
    group: 'Couronne d’Or',
    price: 460,
    baseRent: 150,
    upgradeCost: 200,
    ownerId: null,
    level: 0,
  },
];

const TREASURE_CHEST_CARDS: Omit<DrawnCard, 'deck'>[] = [
  {
    title: 'Cargaison de Bois & Pierre',
    description: 'Épave marchande récupérée !',
    goldDelta: 120,
    materialsDelta: 2,
  },
  {
    title: 'Galion Espagnol Échoué',
    description: 'Cargaison d’or et de bois repérée !',
    goldDelta: 200,
    materialsDelta: 1,
  },
  {
    title: 'Carte au Trésor',
    description: 'Vous déterrez le coffre d’un flibustier !',
    goldDelta: 150,
    materialsDelta: 1,
  },
  {
    title: 'Vents Favorables',
    description: 'Cap sur Port Royal (+200 Or & +1 Matériau) !',
    moveToTile: 0,
  },
  {
    title: 'Convoi des Bâtisseurs',
    description: 'Navire de matériaux intercepté !',
    goldDelta: 150,
    materialsDelta: 2,
  },
];

const SEA_CURSE_CARDS: Omit<DrawnCard, 'deck'>[] = [
  {
    title: 'Hollandais Volant',
    description: 'Réparations versées au pot de Tortuga.',
    goldDelta: -140,
  },
  {
    title: 'Chant des Sirènes',
    description: 'Cap direct vers la Taverne de Tortuga.',
    moveToTile: 12,
  },
  {
    title: 'Attaque du Kraken',
    description: 'Direction La Cale (Île du Crâne) !',
    goToJail: true,
  },
  {
    title: 'Mutinerie à Bord',
    description: 'Prime de rhum versée à l’équipage.',
    goldDelta: -100,
  },
  {
    title: 'Brouillard Mystique',
    description: 'Un courant vous pousse vers l’Île du Trésor Maudit !',
    moveToTile: 23,
  },
];

export function calculateIslandRent(tile: TileData, allTiles: TileData[]): number {
  if (!tile.baseRent) return 0;
  const multipliers = [1, 2.0, 3.6, 6.0, 6.0];
  let rent = Math.round(tile.baseRent * (multipliers[tile.level] ?? 1));

  // Monopoly bonus if owner controls all islands in the same group
  if (tile.ownerId !== null) {
    const groupTiles = allTiles.filter((t) => t.type === 'island' && t.group === tile.group);
    const ownsAll = groupTiles.length > 1 && groupTiles.every((t) => t.ownerId === tile.ownerId);
    if (ownsAll && tile.level === 0) {
      rent = Math.round(rent * 1.5);
    }
  }
  return rent;
}

export function getTileDistance(tileA: number, tileB: number): number {
  const diff = Math.abs(tileA - tileB) % 24;
  return Math.min(diff, 24 - diff);
}

export function canAccessUpgradesShop(
  player: Player | undefined,
  tiles: TileData[]
): boolean {
  if (!player || player.bankrupt) return false;
  const currentTile = tiles[player.position];
  if (!currentTile) return false;
  return (
    currentTile.type === 'start' ||
    currentTile.type === 'free_parking' ||
    (currentTile.type === 'island' && currentTile.ownerId === player.id)
  );
}

export function getCulverinTargets(
  player: Player | undefined,
  tiles: TileData[]
): TileData[] {
  if (!player || player.bankrupt || !player.hasCulverin) return [];
  return tiles.filter(
    (t) =>
      t.type === 'island' &&
      t.ownerId !== null &&
      t.ownerId !== player.id &&
      t.level >= 1 &&
      getTileDistance(player.position, t.id) <= CULVERIN_RANGE
  );
}

function buildPlayersFromSlots(slots: PlayerSlotConfig[]): Player[] {
  const activeSlots = slots.filter((s) => s.enabled);
  const finalSlots = activeSlots.length >= 2 ? activeSlots : slots.slice(0, 2);
  return finalSlots.map((s, idx) => ({
    id: idx,
    name: s.name.trim() || `Cap. #${idx + 1}`,
    title: s.title,
    color: s.color,
    sailColor: s.sailColor,
    accentColor: s.accentColor,
    isAI: s.isAI,
    gold: 1500,
    materials: INITIAL_MATERIALS,
    position: 0,
    inJail: false,
    jailTurns: 0,
    bankrupt: false,
    hasPerfectBoarding: false,
    hasCulverin: false,
  }));
}

export interface LandedTilePopupData {
  tileId: number;
  playerId: number;
  eventSummary?: string;
  isInspect?: boolean;
  rentPayment?: {
    payerId: number;
    ownerId: number;
    amount: number;
    isTrap?: boolean;
  };
}

interface GameState {
  players: Player[];
  slotConfigs: PlayerSlotConfig[];
  showSetupModal: boolean;
  showFortifyModal: boolean;
  showUpgradesModal: boolean;
  tiles: TileData[];
  currentPlayerIndex: number;
  phase: TurnPhase;
  dice: [number, number];
  isRollingDice: boolean;
  hasAttackedThisTurn: boolean;
  hasFortifiedThisTurn: boolean;
  hasFiredCulverinThisTurn: boolean;
  cameraMode: CameraMode;
  focusedTileIndex: number;
  cameraShake: number;
  tortugaJackpot: number;
  actionLogs: string[];
  floatingTexts: FloatingTextItem[];
  activeCard: DrawnCard | null;
  landedTilePopup: LandedTilePopupData | null;
  navalBattle: NavalBattleState | null;
  cannonShot: CannonShotData | null;
  winner: Player | null;
  passAndPlay: boolean;
  aiCount: number;

  // Actions
  setShowSetupModal: (show: boolean) => void;
  setShowFortifyModal: (show: boolean) => void;
  setShowUpgradesModal: (show: boolean) => void;
  dismissLandedTilePopup: () => void;
  inspectTileCard: (tileId: number) => void;
  startCustomGame: (slots: PlayerSlotConfig[]) => void;
  initGame: (aiCount?: number, passAndPlay?: boolean) => void;
  toggleCameraMode: () => void;
  setCameraMode: (mode: CameraMode) => void;
  addFloatingText: (tileIndex: number, text: string, color?: string) => void;
  removeFloatingText: (id: string) => void;
  addLog: (msg: string) => void;
  rollDice: () => void;
  buyIsland: () => void;
  fortifyIsland: (tileId?: number) => void;
  buyPerfectBoarding: () => void;
  buyTrappedFortress: (tileId: number) => void;
  buyCulverin: () => void;
  fireCulverin: (targetTileId: number) => void;
  payBailAndRoll: () => void;
  resolveCardModal: () => void;
  triggerManualNavalBattle: () => void;
  rollNavalBattleDice: () => void;
  completeNavalBattle: () => void;
  endTurn: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      players: buildPlayersFromSlots(DEFAULT_CAPTAIN_ROSTER),
  slotConfigs: DEFAULT_CAPTAIN_ROSTER.map((s) => ({ ...s })),
  showSetupModal: true,
  showFortifyModal: false,
  showUpgradesModal: false,
  tiles: INITIAL_TILES.map((t) => ({ ...t })),
  currentPlayerIndex: 0,
  phase: 'IDLE',
  dice: [2, 3],
  isRollingDice: false,
  hasAttackedThisTurn: false,
  hasFortifiedThisTurn: false,
  hasFiredCulverinThisTurn: false,
  cameraMode: 'GLOBAL',
  focusedTileIndex: 0,
  cameraShake: 0,
  tortugaJackpot: 150,
  actionLogs: [
    '⚓ Bienvenue dans Jolly Roger’s !',
    '🪵 Chaque tour, vous pouvez fortifier 1 de vos îles depuis n’importe où sur la carte !',
    '💥 Achetez des Améliorations (1000 Or) à Port Royal, Tortuga ou sur vos îles !',
  ],
  floatingTexts: [],
  activeCard: null,
  landedTilePopup: null,
  navalBattle: null,
  cannonShot: null,
  winner: null,
  passAndPlay: false,
  aiCount: 3,

  setShowSetupModal: (show) => set({ showSetupModal: show }),

  setShowFortifyModal: (show) =>
    set((state) => ({
      showFortifyModal: show,
      showUpgradesModal: show ? false : state.showUpgradesModal,
      landedTilePopup: show ? null : state.landedTilePopup,
    })),

  setShowUpgradesModal: (show) =>
    set((state) => ({
      showUpgradesModal: show,
      showFortifyModal: show ? false : state.showFortifyModal,
      landedTilePopup: show ? null : state.landedTilePopup,
    })),

  dismissLandedTilePopup: () => set({ landedTilePopup: null }),

  inspectTileCard: (tileId) => {
    const state = get();
    const activePlayer = state.players[state.currentPlayerIndex];
    // If the player is in fortification location-picker mode, clicking a tile on the 3D board selects it in the picker
    if (state.showFortifyModal) {
      set({ focusedTileIndex: tileId });
      return;
    }
    set({
      focusedTileIndex: tileId,
      landedTilePopup: {
        tileId,
        playerId: activePlayer ? activePlayer.id : 0,
        isInspect: true,
      },
    });
  },

  startCustomGame: (slots) => {
    const builtPlayers = buildPlayersFromSlots(slots);
    const aiTotal = builtPlayers.filter((p) => p.isAI).length;
    const humanTotal = builtPlayers.filter((p) => !p.isAI).length;

    soundEffects.playGoldSound();
    set({
      slotConfigs: slots.map((s) => ({ ...s })),
      players: builtPlayers,
      showSetupModal: false,
      showFortifyModal: false,
      showUpgradesModal: false,
      tiles: INITIAL_TILES.map((t) => ({
        ...t,
        ownerId: null,
        level: 0,
        trapped: false,
      })),
      currentPlayerIndex: 0,
      phase: 'IDLE',
      dice: [2, 2],
      isRollingDice: false,
      hasAttackedThisTurn: false,
      hasFortifiedThisTurn: false,
      hasFiredCulverinThisTurn: false,
      focusedTileIndex: 0,
      cameraShake: 0,
      tortugaJackpot: 150,
      activeCard: null,
      landedTilePopup: null,
      navalBattle: null,
      cannonShot: null,
      winner: null,
      passAndPlay: aiTotal === 0,
      aiCount: aiTotal,
      actionLogs: [
        `⚓ Flotte en mer : ${humanTotal} Joueur(s) et ${aiTotal} Capitaine(s) IA !`,
        '🪵 Chaque tour, fortifiez 1 île depuis n’importe où sur la map (Or + 1 Matériau) !',
        '💥 Améliorations (1000 Or) disponibles à Port Royal, Tortuga ou sur vos îles !',
      ],
    });

    if (builtPlayers[0]?.isAI) {
      setTimeout(() => {
        runAITurn();
      }, 1000);
    }
  },

  initGame: (aiCount = 3, passAndPlay = false) => {
    const total = Math.min(4, Math.max(2, 1 + aiCount));
    const slots = DEFAULT_CAPTAIN_ROSTER.map((slot, idx) => ({
      ...slot,
      enabled: idx < total,
      isAI: idx === 0 ? false : !passAndPlay,
    }));
    get().startCustomGame(slots);
  },

  toggleCameraMode: () => {
    set((state) => ({
      cameraMode: state.cameraMode === 'GLOBAL' ? 'FOLLOW' : 'GLOBAL',
    }));
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),

  addFloatingText: (tileIndex, text, color = '#fbbf24') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      floatingTexts: [...state.floatingTexts, { id, tileIndex, text, color }],
    }));
    setTimeout(() => {
      get().removeFloatingText(id);
    }, 2200);
  },

  removeFloatingText: (id) => {
    set((state) => ({
      floatingTexts: state.floatingTexts.filter((f) => f.id !== id),
    }));
  },

  addLog: (msg) => {
    set((state) => ({
      actionLogs: [msg, ...state.actionLogs.slice(0, 19)],
    }));
  },

  payBailAndRoll: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || !player.inJail || state.phase !== 'IDLE') return;
    if (player.gold < 100) return;

    soundEffects.playGoldSound();
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? { ...p, gold: p.gold - 100, inJail: false, jailTurns: 0 }
        : p
    );
    state.addFloatingText(player.position, '-100 Or (Caution)', '#f87171');
    state.addLog(`🗝️ ${player.name} verse 100 Or de caution au geôlier de l'Île du Crâne.`);
    set({
      players: updatedPlayers,
      tortugaJackpot: state.tortugaJackpot + 100,
    });
    setTimeout(() => {
      get().rollDice();
    }, 250);
  },

  rollDice: () => {
    const state = get();
    if (state.phase !== 'IDLE') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.bankrupt) return;

    soundEffects.playDiceRollSound();

    // Pirate Dice calibrated for 24-tile compact board: each die rolls 1, 2, or 3 (total 2 to 6 tiles)
    const d1 = Math.floor(Math.random() * 3) + 1;
    const d2 = Math.floor(Math.random() * 3) + 1;
    const total = d1 + d2;

    set({
      phase: 'ROLLING',
      isRollingDice: true,
      hasAttackedThisTurn: false,
      dice: [d1, d2],
      focusedTileIndex: currentPlayer.position,
      landedTilePopup: null,
    });

    setTimeout(() => {
      const latest = get();
      const player = latest.players[latest.currentPlayerIndex];
      set({ isRollingDice: false });

      // Check Jail status
      if (player.inJail) {
        if (d1 === d2 || player.jailTurns >= 1) {
          const reason = d1 === d2 ? `un double (${d1}+${d2})` : 'sa peine purgée';
          latest.addLog(`🔓 ${player.name} sort de La Cale grâce à ${reason} et avance de ${total} cases !`);
          set((s) => ({
            players: s.players.map((p, idx) =>
              idx === s.currentPlayerIndex ? { ...p, inJail: false, jailTurns: 0 } : p
            ),
          }));
        } else {
          latest.addLog(`⛓️ ${player.name} fait ${d1}+${d2} et reste aux fers sur l'Île du Crâne.`);
          latest.addFloatingText(player.position, 'Aux Fers !', '#94a3b8');
          set((s) => ({
            players: s.players.map((p, idx) =>
              idx === s.currentPlayerIndex ? { ...p, jailTurns: p.jailTurns + 1 } : p
            ),
            phase: 'END_TURN',
            landedTilePopup: {
              tileId: player.position,
              playerId: player.id,
              eventSummary: `⛓️ ${player.name} reste aux fers sur l’Île du Crâne (${d1}+${d2})`,
            },
          }));
          if (player.isAI) {
            setTimeout(() => get().endTurn(), 1400);
          }
          return;
        }
      } else {
        latest.addLog(`🎲 ${player.name} lance ${d1} + ${d2} = ${total} cases !`);
      }

      // Start step-by-step movement
      set({ phase: 'MOVING' });
      let stepsRemaining = total;
      let stepCount = 0;

      const stepInterval = setInterval(() => {
        const st = get();
        const activePlayer = st.players[st.currentPlayerIndex];
        if (!activePlayer) {
          clearInterval(stepInterval);
          return;
        }

        const nextPos = (activePlayer.position + 1) % 24;
        const passedStart = nextPos === 0;
        soundEffects.playHopSound(stepCount);
        stepCount++;
        stepsRemaining--;

        set((s) => ({
          focusedTileIndex: nextPos,
          players: s.players.map((p, idx) =>
            idx === s.currentPlayerIndex
              ? {
                  ...p,
                  position: nextPos,
                  gold: passedStart ? p.gold + 200 : p.gold,
                  materials: passedStart ? p.materials + 1 : p.materials,
                }
              : p
          ),
        }));

        if (passedStart) {
          soundEffects.playGoldSound();
          st.addFloatingText(0, '+200 Or & +1 🪵 (Port Royal)', '#4ade80');
          st.addLog(
            `⚓ ${activePlayer.name} franchit Port Royal : +200 Doublons & +1 Matériau de construction 🪵 !`
          );
        }

        if (stepsRemaining <= 0) {
          clearInterval(stepInterval);
          setTimeout(() => {
            evaluateLandedTile();
          }, 260);
        }
      }, 185);
    }, 750);
  },

  buyIsland: () => {
    const state = get();
    if (state.phase !== 'TILE_ACTION' && state.phase !== 'END_TURN') return;

    const player = state.players[state.currentPlayerIndex];
    const tile = state.tiles[player.position];

    if (!tile || tile.type !== 'island' || tile.ownerId !== null || !tile.price) return;
    if (player.gold < tile.price) return;

    soundEffects.playGoldSound();
    const updatedTiles = state.tiles.map((t) =>
      t.id === tile.id ? { ...t, ownerId: player.id, level: 0 } : t
    );

    // Check if buying this island completes the entire color property set!
    const groupIslands = updatedTiles.filter(
      (t) => t.type === 'island' && t.group === tile.group
    );
    const completedSet =
      groupIslands.length > 1 &&
      groupIslands.every((t) => t.ownerId === player.id);
    const bonusMaterials = completedSet ? 2 : 0;

    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? {
            ...p,
            gold: p.gold - tile.price!,
            materials: p.materials + bonusMaterials,
          }
        : p
    );

    state.addFloatingText(tile.id, `-${tile.price} Or`, '#fbbf24');
    state.addLog(`🏴‍☠️ ${player.name} annexe ${tile.name} pour ${tile.price} Doublons !`);

    if (completedSet) {
      setTimeout(() => {
        get().addFloatingText(tile.id, '+2 🪵 (Set Complet !)', '#34d399');
      }, 240);
      state.addLog(
        `🪵 Set complet (${tile.group}) ! ${player.name} reçoit +2 Matériaux de construction !`
      );
    }

    set({
      players: updatedPlayers,
      tiles: updatedTiles,
      phase: 'END_TURN',
      landedTilePopup: {
        tileId: tile.id,
        playerId: player.id,
        eventSummary: completedSet
          ? `🏴‍☠️ Île conquise ! Set complet (+2 Matériaux 🪵)`
          : `🏴‍☠️ Île conquise par ${player.name} !`,
      },
    });
  },

  fortifyIsland: (tileId) => {
    const state = get();
    if (
      state.phase !== 'IDLE' &&
      state.phase !== 'TILE_ACTION' &&
      state.phase !== 'END_TURN'
    ) {
      return;
    }
    if (state.hasFortifiedThisTurn) return;

    const player = state.players[state.currentPlayerIndex];
    const targetTileId = tileId !== undefined ? tileId : player.position;
    const tile = state.tiles[targetTileId];

    if (!tile || tile.type !== 'island' || tile.ownerId !== player.id) return;
    if (tile.level >= MAX_FORTIFY_LEVEL || !tile.upgradeCost) return;
    if (player.gold < tile.upgradeCost || player.materials < FORTIFY_MATERIAL_COST) {
      return;
    }

    soundEffects.playBuildSound();
    const newLevel = tile.level + 1;
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? {
            ...p,
            gold: p.gold - tile.upgradeCost!,
            materials: p.materials - FORTIFY_MATERIAL_COST,
          }
        : p
    );
    const updatedTiles = state.tiles.map((t) =>
      t.id === tile.id ? { ...t, level: newLevel } : t
    );

    const buildLabel = FORTRESS_LEVEL_NAMES[newLevel] ?? `Niv.${newLevel}`;

    state.addFloatingText(
      tile.id,
      `🏰 ${buildLabel} (-1 🪵)`,
      '#38bdf8'
    );
    state.addLog(
      `🛠️ ${player.name} construit : ${buildLabel} sur ${tile.name}.`
    );

    set({
      players: updatedPlayers,
      tiles: updatedTiles,
      hasFortifiedThisTurn: true,
      phase: state.phase === 'IDLE' ? 'IDLE' : 'END_TURN',
      showFortifyModal: false,
      focusedTileIndex: tile.id,
      landedTilePopup: {
        tileId: tile.id,
        playerId: player.id,
        eventSummary: `🏰 ${buildLabel} construite !`,
      },
    });
  },

  buyPerfectBoarding: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || player.bankrupt) return;
    if (!canAccessUpgradesShop(player, state.tiles)) return;
    if (player.hasPerfectBoarding || player.gold < UPGRADE_COST) return;

    soundEffects.playGoldSound();
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? { ...p, gold: p.gold - UPGRADE_COST, hasPerfectBoarding: true }
        : p
    );

    state.addFloatingText(player.position, '⚔️ Abordage Parfait (-1000 Or)', '#fbbf24');
    state.addLog(
      `⚔️ ${player.name} achète Abordage Parfait (1000 Or) : pille 50% de l'or adverse à chaque victoire !`
    );

    set({ players: updatedPlayers });
  },

  buyTrappedFortress: (tileId) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || player.bankrupt) return;
    if (!canAccessUpgradesShop(player, state.tiles)) return;
    if (player.gold < UPGRADE_COST) return;

    const targetId = tileId !== undefined ? tileId : player.position;
    const tile = state.tiles[targetId];
    if (
      !tile ||
      tile.type !== 'island' ||
      tile.ownerId !== player.id ||
      tile.level < 1 ||
      tile.trapped
    ) {
      return;
    }

    soundEffects.playBuildSound();
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex ? { ...p, gold: p.gold - UPGRADE_COST } : p
    );
    const updatedTiles = state.tiles.map((t) =>
      t.id === tile.id ? { ...t, trapped: true } : t
    );

    state.addFloatingText(tile.id, '💣 Forteresse Piégée (-1000 Or)', '#f97316');
    state.addLog(
      `💣 ${player.name} piège la forteresse de ${tile.name} (1000 Or) : -50% d'or pour tout ennemi qui y accoste !`
    );

    set({
      players: updatedPlayers,
      tiles: updatedTiles,
      focusedTileIndex: tile.id,
    });
  },

  buyCulverin: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || player.bankrupt) return;
    if (!canAccessUpgradesShop(player, state.tiles)) return;
    if (player.hasCulverin || player.gold < UPGRADE_COST) return;

    soundEffects.playGoldSound();
    const updatedPlayers = state.players.map((p, idx) =>
      idx === state.currentPlayerIndex
        ? { ...p, gold: p.gold - UPGRADE_COST, hasCulverin: true }
        : p
    );

    state.addFloatingText(player.position, '🎯 Tir de Coulevrine (-1000 Or)', '#38bdf8');
    state.addLog(
      `🎯 ${player.name} équipe une Coulevrine (1000 Or) : peut détruire 1 étage d'un bâtiment adverse à ≤ ${CULVERIN_RANGE} cases !`
    );

    set({ players: updatedPlayers });
  },

  fireCulverin: (targetTileId) => {
    const state = get();
    if (
      state.phase !== 'IDLE' &&
      state.phase !== 'TILE_ACTION' &&
      state.phase !== 'END_TURN'
    ) {
      return;
    }
    if (state.hasFiredCulverinThisTurn) return;

    const player = state.players[state.currentPlayerIndex];
    if (!player || player.bankrupt || !player.hasCulverin) return;

    const targetTile = state.tiles[targetTileId];
    if (
      !targetTile ||
      targetTile.type !== 'island' ||
      targetTile.ownerId === null ||
      targetTile.ownerId === player.id ||
      targetTile.level < 1
    ) {
      return;
    }

    const dist = getTileDistance(player.position, targetTile.id);
    if (dist > CULVERIN_RANGE) return;

    soundEffects.playCannonSound();
    const newLevel = Math.max(0, targetTile.level - 1);
    const owner = state.players.find((p) => p.id === targetTile.ownerId);

    set({
      hasFiredCulverinThisTurn: true,
      showUpgradesModal: false,
      focusedTileIndex: targetTile.id,
      cameraShake: 0.9,
      cannonShot: {
        id: `culverin-${Date.now()}`,
        fromTile: player.position,
        toTile: targetTile.id,
        fromOffset: getShipSlotOffset(player.id),
        toOffset: [0, 0.35, 0],
        active: true,
      },
    });

    setTimeout(() => {
      set({ cameraShake: 0 });
    }, 500);

    setTimeout(() => {
      const cur = get();
      const updatedTiles = cur.tiles.map((t) =>
        t.id === targetTile.id
          ? { ...t, level: newLevel, trapped: newLevel > 0 ? t.trapped : false }
          : t
      );

      cur.addFloatingText(
        targetTile.id,
        `💥 -1 Étage (${FORTRESS_LEVEL_NAMES[newLevel]})`,
        '#ef4444'
      );
      cur.addLog(
        `💥 Coulevrine ! ${player.name} bombarde ${targetTile.name} (${owner?.name ?? 'Ennemi'}) à ${dist} case(s) : -1 étage (${FORTRESS_LEVEL_NAMES[targetTile.level]} → ${FORTRESS_LEVEL_NAMES[newLevel]}) !`
      );

      set({
        tiles: updatedTiles,
        cannonShot: null,
        landedTilePopup: {
          tileId: targetTile.id,
          playerId: player.id,
          eventSummary: `💥 Tir de Coulevrine : ${targetTile.name} perd 1 étage (${FORTRESS_LEVEL_NAMES[newLevel]}) !`,
        },
      });
    }, 520);
  },

  resolveCardModal: () => {
    const state = get();
    const card = state.activeCard;
    if (!card) return;

    const player = state.players[state.currentPlayerIndex];
    set({ activeCard: null, landedTilePopup: null });

    if (card.goldDelta || card.materialsDelta) {
      const delta = card.goldDelta ?? 0;
      const matDelta = card.materialsDelta ?? 0;

      if (delta >= 0) {
        soundEffects.playGoldSound();
        const floatMsg =
          matDelta > 0
            ? `+${delta} Or & +${matDelta} 🪵`
            : `+${delta} Or`;
        state.addFloatingText(player.position, floatMsg, '#4ade80');
        state.addLog(
          matDelta > 0
            ? `💰 ${player.name} gagne ${delta} Doublons et +${matDelta} Matériau(x) 🪵 (${card.title}).`
            : `💰 ${player.name} gagne ${delta} Doublons (${card.title}).`
        );
        set((s) => ({
          players: s.players.map((p, idx) =>
            idx === s.currentPlayerIndex
              ? {
                  ...p,
                  gold: p.gold + delta,
                  materials: Math.max(0, p.materials + matDelta),
                }
              : p
          ),
        }));
      } else {
        const loss = Math.abs(delta);
        soundEffects.playCannonSound();
        state.addFloatingText(player.position, `-${loss} Or`, '#f87171');
        state.addLog(`💀 ${player.name} perd ${loss} Doublons (${card.title}).`);
        set((s) => ({
          tortugaJackpot: s.tortugaJackpot + loss,
          players: s.players.map((p, idx) =>
            idx === s.currentPlayerIndex ? { ...p, gold: p.gold - loss } : p
          ),
        }));
      }
      checkPlayerBankruptcy(state.currentPlayerIndex);
      afterTileActionCheckNavalBattle();
      return;
    }

    if (card.goToJail) {
      soundEffects.playKrakenSound();
      state.addFloatingText(6, 'En Cale !', '#ef4444');
      state.addLog(`🦑 ${player.name} est entraîné dans La Cale (Île du Crâne) !`);
      set((s) => ({
        focusedTileIndex: 6,
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex
            ? { ...p, position: 6, inJail: true, jailTurns: 0 }
            : p
        ),
        phase: 'END_TURN',
      }));
      if (player.isAI) {
        setTimeout(() => get().endTurn(), 1200);
      }
      return;
    }

    if (card.moveToTile !== undefined) {
      const dest = card.moveToTile;
      const passedStart = dest === 0;
      soundEffects.playHopSound(4);
      if (passedStart) soundEffects.playGoldSound();

      set((s) => ({
        focusedTileIndex: dest,
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex
            ? {
                ...p,
                position: dest,
                gold: passedStart ? p.gold + 200 : p.gold,
                materials: passedStart ? p.materials + 1 : p.materials,
              }
            : p
        ),
      }));
      if (passedStart) {
        state.addFloatingText(0, '+200 Or & +1 🪵', '#4ade80');
      }
      setTimeout(() => {
        evaluateLandedTile();
      }, 350);
      return;
    }

    afterTileActionCheckNavalBattle();
  },

  triggerManualNavalBattle: () => {
    const state = get();
    if (state.hasAttackedThisTurn) return;

    const player = state.players[state.currentPlayerIndex];
    if (!player) return;

    const rivalsOnTile = state.players.filter(
      (p) => p.id !== player.id && !p.bankrupt && p.position === player.position
    );
    if (rivalsOnTile.length === 0) return;

    const defender = rivalsOnTile[0];
    set({
      phase: 'NAVAL_BATTLE',
      hasAttackedThisTurn: true,
      focusedTileIndex: player.position,
      navalBattle: {
        active: true,
        tileIndex: player.position,
        attackerId: player.id,
        defenderId: defender.id,
        attackerRoll: null,
        defenderRoll: null,
        phase: 'ready',
        winnerId: null,
        loserId: null,
        plunderAmount: 150,
        materialsLooted: 1,
      },
    });
  },

  rollNavalBattleDice: () => {
    const state = get();
    const battle = state.navalBattle;
    if (!battle || battle.phase !== 'ready') return;

    soundEffects.playDiceRollSound();

    // Generate two distinct rolls so there's always a clear winner in 1 roll
    let atkRoll = Math.floor(Math.random() * 6) + 1;
    let defRoll = Math.floor(Math.random() * 6) + 1;
    if (atkRoll === defRoll) {
      if (atkRoll < 6) atkRoll += 1;
      else defRoll -= 1;
    }

    const winnerId = atkRoll > defRoll ? battle.attackerId : battle.defenderId;
    const loserId = atkRoll > defRoll ? battle.defenderId : battle.attackerId;

    set({
      navalBattle: {
        ...battle,
        attackerRoll: atkRoll,
        defenderRoll: defRoll,
        phase: 'firing',
        winnerId,
        loserId,
      },
    });

    // Trigger 3D Cannonball shot & Camera Shake
    setTimeout(() => {
      const st = get();
      if (!st.navalBattle) return;
      soundEffects.playCannonSound();

      set({
        cameraShake: 1.0,
        cannonShot: {
          id: `shot-${Date.now()}`,
          fromTile: battle.tileIndex,
          toTile: battle.tileIndex,
          fromOffset: getShipSlotOffset(winnerId),
          toOffset: getShipSlotOffset(loserId),
          active: true,
        },
      });

      setTimeout(() => {
        set({ cameraShake: 0 });
      }, 500);

      // Apply 150 Doublons (or 50% of loser's gold with Abordage Parfait) + 1 Building Material plunder after cannonball impact
      setTimeout(() => {
        const cur = get();
        const b = cur.navalBattle;
        if (!b || b.winnerId === null || b.loserId === null) return;

        const winner = cur.players.find((p) => p.id === b.winnerId)!;
        const loser = cur.players.find((p) => p.id === b.loserId)!;
        const halfLoserGold = Math.floor(Math.max(0, loser.gold) * 0.5);
        const plunder = winner.hasPerfectBoarding
          ? Math.max(halfLoserGold, Math.min(150, Math.max(0, loser.gold)))
          : Math.min(150, Math.max(50, loser.gold));

        soundEffects.playGoldSound();
        cur.addFloatingText(
          b.tileIndex,
          winner.hasPerfectBoarding
            ? `⚔️ Abordage Parfait ! +${plunder} Or (50%) & +1 🪵`
            : `+${plunder} Or & +1 🪵 (${winner.name})`,
          '#4ade80'
        );
        setTimeout(() => {
          get().addFloatingText(b.tileIndex, `-${plunder} Or (${loser.name})`, '#f87171');
        }, 220);

        cur.addLog(
          winner.hasPerfectBoarding
            ? `⚔️ Abordage Parfait ! ${winner.name} (${b.attackerId === winner.id ? b.attackerRoll : b.defenderRoll}) rafle 50% de l'or de ${loser.name} : +${plunder} Or & +1 Matériau 🪵 !`
            : `💥 Abordage ! ${winner.name} (${b.attackerId === winner.id ? b.attackerRoll : b.defenderRoll}) canonne ${loser.name} (${b.attackerId === loser.id ? b.attackerRoll : b.defenderRoll}) et gagne +${plunder} Or & +1 Matériau 🪵 !`
        );

        set((s) => ({
          cannonShot: null,
          players: s.players.map((p) => {
            if (p.id === b.winnerId) {
              return { ...p, gold: p.gold + plunder, materials: p.materials + 1 };
            }
            if (p.id === b.loserId) {
              return { ...p, gold: p.gold - plunder };
            }
            return p;
          }),
          navalBattle: s.navalBattle
            ? {
                ...s.navalBattle,
                phase: 'resolved',
                plunderAmount: plunder,
                materialsLooted: 1,
              }
            : null,
        }));

        checkPlayerBankruptcy(b.loserId);

        const activePlayer = get().players[get().currentPlayerIndex];
        if (activePlayer?.isAI) {
          setTimeout(() => {
            get().completeNavalBattle();
          }, 1200);
        }
      }, 750);
    }, 450);
  },

  completeNavalBattle: () => {
    const state = get();
    if (state.phase === 'GAME_OVER') return;

    const activePlayer = state.players[state.currentPlayerIndex];
    const currentTile = activePlayer ? state.tiles[activePlayer.position] : null;
    const canStillActOnTile =
      activePlayer &&
      !activePlayer.isAI &&
      currentTile?.type === 'island' &&
      (currentTile.ownerId === null || currentTile.ownerId === activePlayer.id);

    set({
      navalBattle: null,
      cannonShot: null,
      phase: canStillActOnTile ? 'TILE_ACTION' : 'END_TURN',
    });

    const latestPlayer = get().players[get().currentPlayerIndex];
    if (latestPlayer && latestPlayer.isAI) {
      setTimeout(() => {
        get().endTurn();
      }, 900);
    }
  },

  endTurn: () => {
    const state = get();
    if (state.phase === 'GAME_OVER') return;

    const alivePlayers = state.players.filter((p) => !p.bankrupt);
    if (alivePlayers.length <= 1) {
      soundEffects.playVictoryFanfare();
      set({
        phase: 'GAME_OVER',
        winner: alivePlayers[0] ?? state.players[0],
        landedTilePopup: null,
      });
      return;
    }

    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let safety = 0;
    while (state.players[nextIndex].bankrupt && safety < 10) {
      nextIndex = (nextIndex + 1) % state.players.length;
      safety++;
    }

    const nextPlayer = state.players[nextIndex];
    set({
      currentPlayerIndex: nextIndex,
      phase: 'IDLE',
      hasAttackedThisTurn: false,
      hasFortifiedThisTurn: false,
      hasFiredCulverinThisTurn: false,
      showFortifyModal: false,
      showUpgradesModal: false,
      focusedTileIndex: nextPlayer.position,
      activeCard: null,
      landedTilePopup: null,
      navalBattle: null,
    });

    if (nextPlayer.isAI) {
      setTimeout(() => {
        runAITurn();
      }, 1200);
    }
  },
    }),
    {
      name: 'pirates-plunder-save-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        players: state.players,
        slotConfigs: state.slotConfigs,
        showSetupModal: state.showSetupModal,
        tiles: state.tiles,
        currentPlayerIndex: state.currentPlayerIndex,
        phase: state.phase,
        dice: state.dice,
        hasAttackedThisTurn: state.hasAttackedThisTurn,
        hasFortifiedThisTurn: state.hasFortifiedThisTurn,
        hasFiredCulverinThisTurn: state.hasFiredCulverinThisTurn,
        cameraMode: state.cameraMode,
        focusedTileIndex: state.focusedTileIndex,
        tortugaJackpot: state.tortugaJackpot,
        actionLogs: state.actionLogs,
        activeCard: state.activeCard,
        landedTilePopup: state.landedTilePopup,
        navalBattle: state.navalBattle,
        winner: state.winner,
        passAndPlay: state.passAndPlay,
        aiCount: state.aiCount,
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        if (!rehydratedState) return;
        setTimeout(() => {
          resumeSavedStateAfterReload();
        }, 120);
      },
    }
  )
);

/**
 * Sanitizes transient animation states and resumes interrupted turns or AI turns after a page reload
 */
function resumeSavedStateAfterReload(): void {
  const state = useGameStore.getState();

  // Merge static tile metadata with saved ownership & fortress level
  const mergedTiles = INITIAL_TILES.map((baseTile) => {
    const savedTile = state.tiles.find((t) => t.id === baseTile.id);
    if (!savedTile) return { ...baseTile };
    const safeLevel = Math.min(MAX_FORTIFY_LEVEL, Math.max(0, savedTile.level ?? 0));
    return {
      ...baseTile,
      ownerId: savedTile.ownerId ?? null,
      level: safeLevel,
      trapped: safeLevel > 0 ? Boolean(savedTile.trapped) : false,
    };
  });

  let nextPhase = state.phase;
  let nextNavalBattle = state.navalBattle;
  let shouldEvaluateLandedTile = false;

  // Recover if page was closed mid-dice roll or mid-ship movement
  if (nextPhase === 'ROLLING') {
    nextPhase = 'IDLE';
  } else if (nextPhase === 'MOVING') {
    shouldEvaluateLandedTile = true;
  } else if (nextPhase === 'NAVAL_BATTLE') {
    if (!nextNavalBattle) {
      nextPhase = 'END_TURN';
    } else if (nextNavalBattle.phase === 'firing' || nextNavalBattle.phase === 'rolling') {
      nextNavalBattle = {
        ...nextNavalBattle,
        phase: 'ready',
        attackerRoll: null,
        defenderRoll: null,
        winnerId: null,
        loserId: null,
      };
    }
  }

  const safePlayerIndex =
    state.currentPlayerIndex >= 0 && state.currentPlayerIndex < state.players.length
      ? state.currentPlayerIndex
      : 0;
  const activePlayer = state.players[safePlayerIndex];

  useGameStore.setState({
    tiles: mergedTiles,
    currentPlayerIndex: safePlayerIndex,
    phase: nextPhase,
    navalBattle: nextNavalBattle,
    isRollingDice: false,
    cameraShake: 0,
    cannonShot: null,
    floatingTexts: [],
    showFortifyModal: false,
    showUpgradesModal: false,
    focusedTileIndex: activePlayer ? activePlayer.position : state.focusedTileIndex,
  });

  if (state.showSetupModal || nextPhase === 'GAME_OVER') return;

  if (shouldEvaluateLandedTile) {
    evaluateLandedTile();
    return;
  }

  // If the saved turn belongs to an AI captain, resume its automated turn sequence
  if (activePlayer && activePlayer.isAI && !activePlayer.bankrupt) {
    if (nextPhase === 'IDLE') {
      setTimeout(() => runAITurn(), 900);
    } else if (nextPhase === 'TILE_ACTION') {
      if (state.activeCard) {
        setTimeout(() => useGameStore.getState().resolveCardModal(), 900);
      } else {
        setTimeout(() => afterTileActionCheckNavalBattle(), 900);
      }
    } else if (nextPhase === 'NAVAL_BATTLE') {
      setTimeout(() => {
        const cur = useGameStore.getState();
        if (cur.navalBattle?.phase === 'ready') {
          cur.rollNavalBattleDice();
        } else {
          cur.completeNavalBattle();
        }
      }, 900);
    } else if (nextPhase === 'END_TURN') {
      setTimeout(() => useGameStore.getState().endTurn(), 900);
    }
  }
}

/**
 * Evaluates the tile where the current player just landed
 */
function evaluateLandedTile(): void {
  const state = useGameStore.getState();
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.bankrupt) return;

  const tile = state.tiles[player.position];

  switch (tile.type) {
    case 'start': {
      state.addLog(`⚓ ${player.name} mouille l'ancre à Port Royal.`);
      useGameStore.setState({
        landedTilePopup: {
          tileId: tile.id,
          playerId: player.id,
          eventSummary: '⚓ Mouillage à Port Royal (+200 Or & +1 Matériau 🪵)',
        },
      });
      afterTileActionCheckNavalBattle();
      break;
    }

    case 'jail': {
      state.addLog(`💀 ${player.name} inspecte les cachots de l'Île du Crâne (Simple visite).`);
      useGameStore.setState({
        landedTilePopup: {
          tileId: tile.id,
          playerId: player.id,
          eventSummary: '💀 Simple visite aux cachots de l’Île du Crâne',
        },
      });
      afterTileActionCheckNavalBattle();
      break;
    }

    case 'free_parking': {
      const jackpot = Math.max(100, state.tortugaJackpot);
      soundEffects.playGoldSound();
      state.addFloatingText(12, `+${jackpot} Or (Butin)`, '#4ade80');
      state.addLog(
        `🍻 ${player.name} rafle le butin de la Taverne de Tortuga : +${jackpot} Doublons !`
      );
      useGameStore.setState((s) => ({
        tortugaJackpot: 100, // Reset with 100 base pot
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex ? { ...p, gold: p.gold + jackpot } : p
        ),
        landedTilePopup: {
          tileId: tile.id,
          playerId: player.id,
          eventSummary: `🍻 Jackpot de Tortuga raflé : +${jackpot} Doublons !`,
        },
      }));
      afterTileActionCheckNavalBattle();
      break;
    }

    case 'go_to_jail': {
      soundEffects.playKrakenSound();
      state.addFloatingText(18, 'Kraken ! En Cale !', '#ef4444');
      state.addLog(
        `🦑 Embuscade du Kraken ! ${player.name} est envoyé aux fers sur l'Île du Crâne !`
      );
      useGameStore.setState((s) => ({
        cameraShake: 0.8,
        focusedTileIndex: 6,
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex
            ? { ...p, position: 6, inJail: true, jailTurns: 0 }
            : p
        ),
        phase: 'END_TURN',
        landedTilePopup: {
          tileId: tile.id,
          playerId: player.id,
          eventSummary: `🦑 Embuscade du Kraken ! ${player.name} est jeté en Cale !`,
        },
      }));
      setTimeout(() => useGameStore.setState({ cameraShake: 0 }), 450);
      if (player.isAI) {
        setTimeout(() => useGameStore.getState().endTurn(), 1400);
      }
      break;
    }

    case 'tax': {
      const taxAmount = 120;
      soundEffects.playCannonSound();
      state.addFloatingText(tile.id, `-${taxAmount} Or (Taxe)`, '#f87171');
      state.addLog(
        `👑 ${player.name} paie ${taxAmount} Doublons de Taxe à l'Amirauté (ajoutés à Tortuga).`
      );
      useGameStore.setState((s) => ({
        tortugaJackpot: s.tortugaJackpot + taxAmount,
        players: s.players.map((p, idx) =>
          idx === s.currentPlayerIndex ? { ...p, gold: p.gold - taxAmount } : p
        ),
        landedTilePopup: {
          tileId: tile.id,
          playerId: player.id,
          eventSummary: `👑 Taxe de l’Amirauté : -${taxAmount} Or versés au pot de Tortuga`,
        },
      }));
      checkPlayerBankruptcy(state.currentPlayerIndex);
      afterTileActionCheckNavalBattle();
      break;
    }

    case 'chest':
    case 'curse': {
      const deckPool = tile.type === 'chest' ? TREASURE_CHEST_CARDS : SEA_CURSE_CARDS;
      const picked = deckPool[Math.floor(Math.random() * deckPool.length)];
      const drawn: DrawnCard = {
        deck: tile.type,
        ...picked,
      };
      useGameStore.setState({
        phase: 'TILE_ACTION',
        activeCard: drawn,
        landedTilePopup: null,
      });

      if (player.isAI) {
        setTimeout(() => {
          useGameStore.getState().resolveCardModal();
        }, 1400);
      }
      break;
    }

    case 'island': {
      if (tile.ownerId === null) {
        // Available to purchase
        useGameStore.setState({
          phase: 'TILE_ACTION',
          landedTilePopup: {
            tileId: tile.id,
            playerId: player.id,
            eventSummary: `🏝️ Île Vierge — Disponible pour ${tile.price} Doublons`,
          },
        });
        if (player.isAI) {
          setTimeout(() => {
            const st = useGameStore.getState();
            const ai = st.players[st.currentPlayerIndex];
            const t = st.tiles[ai.position];
            if (t.price && ai.gold >= t.price + 120) {
              st.buyIsland();
            }
            setTimeout(() => {
              afterTileActionCheckNavalBattle();
            }, 700);
          }, 1200);
        } else {
          checkAutomaticNavalBattlePrompt();
        }
      } else if (tile.ownerId === player.id) {
        // Player owns this island: can fortify it if they have Gold + 1 Material!
        useGameStore.setState({
          phase: 'TILE_ACTION',
          landedTilePopup: {
            tileId: tile.id,
            playerId: player.id,
            eventSummary:
              tile.level < MAX_FORTIFY_LEVEL
                ? `🏰 Votre île — ${FORTRESS_LEVEL_NAMES[tile.level + 1]} disponible`
                : '🏰 Château Pirate (Niveau Max)',
          },
        });
        if (player.isAI) {
          setTimeout(() => {
            const st = useGameStore.getState();
            const ai = st.players[st.currentPlayerIndex];
            const t = st.tiles[ai.position];
            if (
              !st.hasFortifiedThisTurn &&
              t.upgradeCost &&
              t.level < MAX_FORTIFY_LEVEL &&
              ai.materials >= FORTIFY_MATERIAL_COST &&
              ai.gold >= t.upgradeCost + 200
            ) {
              st.fortifyIsland(t.id);
            }
            setTimeout(() => {
              afterTileActionCheckNavalBattle();
            }, 700);
          }, 1200);
        } else {
          checkAutomaticNavalBattlePrompt();
        }
      } else {
        // Owned by rival captain -> pay anchorage rent (+ 50% gold loss if fortress is trapped!)
        const owner = state.players.find((p) => p.id === tile.ownerId);
        if (owner && !owner.bankrupt) {
          const rent = calculateIslandRent(tile, state.tiles);
          const isTrappedFortress = Boolean(tile.trapped && tile.level >= 1);
          const trapLoss = isTrappedFortress
            ? Math.floor(Math.max(0, player.gold) * 0.5)
            : 0;
          const totalLoss = rent + trapLoss;

          if (isTrappedFortress) {
            soundEffects.playCannonSound();
          } else {
            soundEffects.playGoldSound();
          }

          state.addFloatingText(
            tile.id,
            isTrappedFortress
              ? `💣 Piège (-50% : -${trapLoss} Or) & Loyer -${rent} Or`
              : `-${rent} Or (${player.name})`,
            '#f87171'
          );
          setTimeout(() => {
            useGameStore
              .getState()
              .addFloatingText(tile.id, `+${rent} Or (${owner.name})`, '#4ade80');
          }, 220);

          if (isTrappedFortress) {
            state.addLog(
              `💣 Forteresse Piégée sur ${tile.name} ! ${player.name} perd 50% de son or (-${trapLoss} Or) + ${rent} Or de loyer à ${owner.name} !`
            );
          } else {
            state.addLog(
              `⚓ Droit de mouillage : ${player.name} verse ${rent} Doublons à ${owner.name} sur ${tile.name} !`
            );
          }

          useGameStore.setState((s) => ({
            cameraShake: isTrappedFortress ? 0.85 : 0.45,
            tortugaJackpot: s.tortugaJackpot + trapLoss,
            players: s.players.map((p) => {
              if (p.id === player.id) return { ...p, gold: p.gold - totalLoss };
              if (p.id === owner.id) return { ...p, gold: p.gold + rent };
              return p;
            }),
            landedTilePopup: {
              tileId: tile.id,
              playerId: player.id,
              eventSummary: isTrappedFortress
                ? `💣 Forteresse Piégée ! -${trapLoss} Or (-50%) & -${rent} Or à ${owner.name}`
                : `⚓ Droit de mouillage : -${rent} Or versés à ${owner.name}`,
              rentPayment: {
                payerId: player.id,
                ownerId: owner.id,
                amount: totalLoss,
              },
            },
          }));
          setTimeout(() => useGameStore.setState({ cameraShake: 0 }), 420);
          checkPlayerBankruptcy(state.currentPlayerIndex);
        }
        afterTileActionCheckNavalBattle();
      }
      break;
    }
  }
}

/**
 * Checks if the player landed on a tile with rival ship(s) to trigger Naval Battle (at most 1 attack per turn)
 */
function afterTileActionCheckNavalBattle(): void {
  const state = useGameStore.getState();
  if (state.phase === 'GAME_OVER') return;

  const player = state.players[state.currentPlayerIndex];
  if (!player || player.bankrupt) {
    state.endTurn();
    return;
  }

  // AI can fortify 1 owned island anywhere on the map during its turn if it hasn't yet
  if (
    player.isAI &&
    !state.hasFortifiedThisTurn &&
    player.materials >= FORTIFY_MATERIAL_COST
  ) {
    const aiUpgradable = state.tiles.filter(
      (t) =>
        t.type === 'island' &&
        t.ownerId === player.id &&
        t.level < MAX_FORTIFY_LEVEL &&
        (t.upgradeCost ?? 0) + 200 <= player.gold
    );
    if (aiUpgradable.length > 0) {
      const target = aiUpgradable[aiUpgradable.length - 1];
      state.fortifyIsland(target.id);
    }
  }

  // AI can buy upgrades if on Port Royal, Tortuga, or own island and rich enough
  const afterFortifyState = useGameStore.getState();
  const aiPlayer = afterFortifyState.players[afterFortifyState.currentPlayerIndex];
  if (
    aiPlayer &&
    aiPlayer.isAI &&
    !aiPlayer.bankrupt &&
    canAccessUpgradesShop(aiPlayer, afterFortifyState.tiles) &&
    aiPlayer.gold >= UPGRADE_COST + 350
  ) {
    if (!aiPlayer.hasCulverin) {
      afterFortifyState.buyCulverin();
    } else if (!aiPlayer.hasPerfectBoarding) {
      afterFortifyState.buyPerfectBoarding();
    } else {
      const fortToTrap = afterFortifyState.tiles.find(
        (t) =>
          t.type === 'island' &&
          t.ownerId === aiPlayer.id &&
          t.level >= 1 &&
          !t.trapped
      );
      if (fortToTrap) {
        afterFortifyState.buyTrappedFortress(fortToTrap.id);
      }
    }
  }

  // AI with Culverin fires at a nearby enemy building (<= 3 tiles) if available
  const preBattleState = useGameStore.getState();
  const shooterAI = preBattleState.players[preBattleState.currentPlayerIndex];
  if (
    shooterAI &&
    shooterAI.isAI &&
    !shooterAI.bankrupt &&
    shooterAI.hasCulverin &&
    !preBattleState.hasFiredCulverinThisTurn
  ) {
    const targets = getCulverinTargets(shooterAI, preBattleState.tiles);
    if (targets.length > 0) {
      preBattleState.fireCulverin(targets[0].id);
    }
  }

  const latestState = useGameStore.getState();
  const latestPlayer = latestState.players[latestState.currentPlayerIndex];

  const rivals = latestState.players.filter(
    (p) =>
      p.id !== latestPlayer.id &&
      !p.bankrupt &&
      p.position === latestPlayer.position
  );

  if (rivals.length > 0 && !latestState.hasAttackedThisTurn) {
    const defender = rivals[0];
    latestState.addLog(
      `⚔️ BATAILLE NAVALE sur ${latestState.tiles[latestPlayer.position].name} : ${latestPlayer.name} aborde ${defender.name} !`
    );
    useGameStore.setState({
      phase: 'NAVAL_BATTLE',
      hasAttackedThisTurn: true,
      focusedTileIndex: latestPlayer.position,
      navalBattle: {
        active: true,
        tileIndex: latestPlayer.position,
        attackerId: latestPlayer.id,
        defenderId: defender.id,
        attackerRoll: null,
        defenderRoll: null,
        phase: 'ready',
        winnerId: null,
        loserId: null,
        plunderAmount: 150,
        materialsLooted: 1,
      },
    });

    if (player.isAI) {
      setTimeout(() => {
        useGameStore.getState().rollNavalBattleDice();
      }, 1200);
    }
    return;
  }

  useGameStore.setState({ phase: 'END_TURN' });
  if (player.isAI) {
    setTimeout(() => {
      useGameStore.getState().endTurn();
    }, 1200);
  }
}

function checkAutomaticNavalBattlePrompt(): void {
  const state = useGameStore.getState();
  if (state.hasAttackedThisTurn) return;

  const player = state.players[state.currentPlayerIndex];
  if (!player) return;

  const rivals = state.players.filter(
    (p) => p.id !== player.id && !p.bankrupt && p.position === player.position
  );
  if (rivals.length > 0) {
    const defender = rivals[0];
    state.addLog(
      `⚔️ BATAILLE NAVALE sur ${state.tiles[player.position].name} : ${player.name} aborde ${defender.name} !`
    );
    useGameStore.setState({
      phase: 'NAVAL_BATTLE',
      hasAttackedThisTurn: true,
      focusedTileIndex: player.position,
      navalBattle: {
        active: true,
        tileIndex: player.position,
        attackerId: player.id,
        defenderId: defender.id,
        attackerRoll: null,
        defenderRoll: null,
        phase: 'ready',
        winnerId: null,
        loserId: null,
        plunderAmount: 150,
        materialsLooted: 1,
      },
    });
  }
}

function checkPlayerBankruptcy(playerIndex: number): void {
  const state = useGameStore.getState();
  const player = state.players[playerIndex];
  if (!player || player.bankrupt) return;

  if (player.gold < 0) {
    soundEffects.playBankruptSound();
    state.addFloatingText(player.position, 'NAUFRAGE !', '#ef4444');
    state.addLog(
      `🏴‍☠️ Naufrage ! ${player.name} fait faillite. Ses îles redeviennent sauvages !`
    );

    const updatedPlayers = state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, gold: 0, bankrupt: true } : p
    );
    const updatedTiles = state.tiles.map((t) =>
      t.ownerId === player.id ? { ...t, ownerId: null, level: 0, trapped: false } : t
    );

    const remaining = updatedPlayers.filter((p) => !p.bankrupt);
    if (remaining.length <= 1) {
      soundEffects.playVictoryFanfare();
      useGameStore.setState({
        players: updatedPlayers,
        tiles: updatedTiles,
        phase: 'GAME_OVER',
        winner: remaining[0] ?? null,
      });
    } else {
      useGameStore.setState({
        players: updatedPlayers,
        tiles: updatedTiles,
      });
    }
  }
}

function runAITurn(): void {
  const state = useGameStore.getState();
  const ai = state.players[state.currentPlayerIndex];
  if (!ai || !ai.isAI || ai.bankrupt || state.phase !== 'IDLE') return;

  if (ai.inJail && ai.gold >= 350) {
    state.payBailAndRoll();
    return;
  }

  state.rollDice();
}
