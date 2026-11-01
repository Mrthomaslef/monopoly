import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  TileData,
  Player,
  getTileTransform,
  calculateIslandRent,
} from '../../store/useGameStore';

interface TileProps {
  tile: TileData;
  allTiles: TileData[];
  owner: Player | null;
  isFocused: boolean;
  onSelectTile?: (tileId: number) => void;
}

export type TerrainTheme =
  | 'plage' // Golden sandy beach & single palm (#1, #3, #7, #14)
  | 'lagon' // Coral atoll ring with turquoise inner pool (#5, #9)
  | 'falaise' // Rugged slate rock cliff & basalt spires (#6, #10, #19, #20)
  | 'temple' // Lush jungle terrace & stepped stone/jade sanctuary (#13, #17)
  | 'volcan' // Basalt volcano caldera with emerald lava (#16)
  | 'eldorado' // Golden stepped citadel & sovereign sanctuary (#22, #23)
  | 'port' // Imperial lighthouse & stone quay (#0, #4)
  | 'taverne' // Warm timber pirate inn on sandy bay (#12)
  | 'tresor' // Open sandy islet with single ornate chest (#2, #11, #21)
  | 'malediction'; // Dark stone reef with levitating arcane crystal (#8, #15, #18)

const PIRATA_FONT_URL = './assets/fonts/PirataOne-Regular.ttf';
const CINZEL_FONT_URL = './assets/fonts/Cinzel-Bold.ttf';

/**
 * Maps each tile to a distinct, uncluttered terrain theme
 */
export function getTileTerrainTheme(tile: TileData): TerrainTheme {
  if (tile.id === 0 || tile.id === 4) return 'port';
  if (tile.id === 12) return 'taverne';
  if (tile.type === 'chest') return 'tresor';
  if (tile.type === 'curse' || tile.id === 18) return 'malediction';
  if (tile.id === 5 || tile.id === 9) return 'lagon';
  if (tile.id === 16) return 'volcan';
  if (tile.id === 13 || tile.id === 17) return 'temple';
  if (tile.id === 22 || tile.id === 23) return 'eldorado';
  if (tile.id === 6 || tile.id === 10 || tile.id === 19 || tile.id === 20) {
    return 'falaise';
  }
  return 'plage';
}

/**
 * Clean, well-proportioned Stylized Palm Tree (used sparingly: max 1 per tropical island)
 */
const CleanPalm: React.FC<{
  position: [number, number, number];
  scale?: number;
  lean?: number;
}> = ({ position, scale = 1, lean = 0.18 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, -lean * 0.5]} castShadow>
        <cylinderGeometry args={[0.032, 0.05, 0.28, 7]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      <mesh
        position={[lean * 0.22, 0.34, 0]}
        rotation={[0, 0, -lean]}
        castShadow
      >
        <cylinderGeometry args={[0.022, 0.034, 0.22, 7]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} />
      </mesh>
      <group position={[lean * 0.36, 0.45, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i * Math.PI * 2) / 5;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.14, -0.01, Math.sin(angle) * 0.14]}
              rotation={[
                Math.sin(angle) * 0.35,
                -angle,
                -Math.cos(angle) * 0.35,
              ]}
              castShadow
            >
              <coneGeometry args={[0.068, 0.26, 4]} />
              <meshStandardMaterial
                color="#15803d"
                roughness={0.65}
                flatShading
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/**
 * Distinct, Uncluttered 3D Island Terrain & Single Focal Element per Biome
 */
const DistinctTileTerrain: React.FC<{
  tile: TileData;
  theme: TerrainTheme;
  baseRadius: number;
  sandTexture: THREE.Texture;
  rockTexture: THREE.Texture;
  woodTexture: THREE.Texture;
}> = ({ tile, theme, baseRadius, sandTexture, rockTexture, woodTexture }) => {
  const crystalRef = useRef<THREE.Mesh>(null);
  const seed = (tile.id * 1.3) % (Math.PI * 2);

  useFrame(({ clock }) => {
    if (crystalRef.current) {
      const t = clock.getElapsedTime();
      crystalRef.current.rotation.y = t * 1.4;
      crystalRef.current.position.y = 0.34 + Math.sin(t * 2.5) * 0.03;
    }
  });

  // Determine whether the outer shoreline is sandy beach, rocky cliff, or mixed cove
  const isRockyCoast =
    theme === 'falaise' || theme === 'volcan' || theme === 'malediction';
  const isMixedCove =
    theme === 'port' || theme === 'temple' || theme === 'eldorado';

  return (
    <group>
      {/* === 1. BASE SHORELINE & COASTAL BORDER (SANDY BEACH vs ROCKY CLIFF vs COVE) === */}
      {isRockyCoast ? (
        <group>
          {/* Faceted Slate-Rock Cliff Island Base */}
          <mesh
            position={[0, 0.03, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.86, baseRadius * 1.02, 0.24, 8]}
            />
            <meshStandardMaterial
              map={rockTexture}
              color="#94a3b8"
              roughness={0.88}
              flatShading
            />
          </mesh>
          {/* Upper Stepped Stone Plateau */}
          <mesh
            position={[0, 0.14, -0.04]}
            rotation={[0, -seed * 0.5, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.66, baseRadius * 0.78, 0.08, 7]}
            />
            <meshStandardMaterial
              map={rockTexture}
              color="#64748b"
              roughness={0.85}
              flatShading
            />
          </mesh>
          {/* Two Clean Corner Cliff Crags on the Back Edge */}
          <mesh
            position={[-baseRadius * 0.62, 0.16, -0.22]}
            rotation={[0, seed, 0.12]}
            castShadow
          >
            <dodecahedronGeometry args={[0.17, 0]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#475569"
              roughness={0.9}
              flatShading
            />
          </mesh>
          <mesh
            position={[baseRadius * 0.62, 0.14, -0.18]}
            rotation={[0, -seed, -0.1]}
            castShadow
          >
            <dodecahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#64748b"
              roughness={0.9}
              flatShading
            />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Smooth Golden Sand Beach Base */}
          <mesh
            position={[0, 0.02, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.88, baseRadius * 1.04, 0.2, 14]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#fde68a"
              roughness={0.82}
            />
          </mesh>
          {/* Gentle Upper Sand Dune Terrace */}
          {theme !== 'lagon' && (
            <mesh
              position={[0, 0.12, -0.04]}
              rotation={[0, -seed * 0.4, 0]}
              receiveShadow
            >
              <cylinderGeometry
                args={[baseRadius * 0.68, baseRadius * 0.8, 0.06, 12]}
              />
              <meshStandardMaterial
                map={sandTexture}
                color="#fef08a"
                roughness={0.8}
              />
            </mesh>
          )}
          {/* Mixed Cove: Clean Rocky Headland on the Left Back Corner */}
          {isMixedCove && (
            <mesh
              position={[-baseRadius * 0.6, 0.15, -0.22]}
              rotation={[0, seed, 0]}
              castShadow
            >
              <dodecahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial
                map={rockTexture}
                color="#64748b"
                roughness={0.88}
                flatShading
              />
            </mesh>
          )}
        </group>
      )}

      {/* === 2. SINGLE CLEAN FOCAL FEATURE MATCHING THE TILE TERRAIN === */}

      {/* PLAGE: Open Golden Beach with 1 Graceful Palm & Small Wooden Pier */}
      {theme === 'plage' && (
        <group position={[0, 0.14, -0.12]}>
          <CleanPalm
            position={[tile.id % 2 === 0 ? -0.26 : 0.26, 0, -0.06]}
            scale={0.95}
            lean={tile.id % 2 === 0 ? 0.2 : -0.2}
          />
          <mesh
            position={[tile.id % 2 === 0 ? 0.2 : -0.2, 0.04, 0.04]}
            castShadow
          >
            <dodecahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#94a3b8"
              roughness={0.85}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* LAGON: Coral Atoll Ring with Shimmering Turquoise Inner Lagoon Pool */}
      {theme === 'lagon' && (
        <group position={[0, 0.125, -0.06]}>
          {/* Inner Turquoise Lagoon Water Pool */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[baseRadius * 0.52, 18]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#06b6d4"
              emissiveIntensity={0.45}
              roughness={0.2}
            />
          </mesh>
          {/* White Foam Rim around Inner Lagoon */}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseRadius * 0.48, baseRadius * 0.56, 18]} />
            <meshStandardMaterial color="#f0f9ff" roughness={0.6} />
          </mesh>
          <CleanPalm position={[-0.32, 0, -0.1]} scale={0.88} lean={0.18} />
        </group>
      )}

      {/* FALAISE: Rugged Basalt Cliff Spires */}
      {theme === 'falaise' && (
        <group position={[0, 0.17, -0.14]}>
          <mesh position={[-0.12, 0.16, 0]} castShadow>
            <coneGeometry args={[0.2, 0.36, 6]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#475569"
              roughness={0.88}
              flatShading
            />
          </mesh>
          <mesh position={[0.16, 0.11, 0.04]} castShadow>
            <coneGeometry args={[0.15, 0.26, 5]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#334155"
              roughness={0.9}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* TEMPLE: Clean Stepped Stone/Jade Sanctuary Terrace */}
      {theme === 'temple' && (
        <group position={[0, 0.15, -0.14]}>
          <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.52, 0.1, 0.36]} />
            <meshStandardMaterial color="#0f766e" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.36, 0.09, 0.26]} />
            <meshStandardMaterial color="#14b8a6" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.2, 0.08, 0.16]} />
            <meshStandardMaterial
              color="#fde047"
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
          <CleanPalm position={[0.34, 0, -0.06]} scale={0.82} lean={-0.16} />
        </group>
      )}

      {/* VOLCAN: Clean Basalt Volcano Cone with Glowing Emerald Crater */}
      {theme === 'volcan' && (
        <group position={[0, 0.17, -0.14]}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.34, 0.36, 8]} />
            <meshStandardMaterial
              map={rockTexture}
              color="#334155"
              roughness={0.88}
              flatShading
            />
          </mesh>
          <mesh position={[0, 0.365, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.1, 8]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      )}

      {/* ELDORADO: Stepped Golden Ziggurat Pyramid */}
      {theme === 'eldorado' && (
        <group position={[0, 0.15, -0.14]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.54, 0.12, 0.38]} />
            <meshStandardMaterial
              color="#d97706"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[0.38, 0.1, 0.26]} />
            <meshStandardMaterial
              color="#f59e0b"
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.22, 0.09, 0.16]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={0.45}
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* PORT: Clean Imperial Lighthouse on Stone Quay */}
      {theme === 'port' && (
        <group position={[0, 0.15, -0.14]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.13, 0.44, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.5}
            />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <coneGeometry args={[0.11, 0.14, 10]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* TAVERNE: Warm Timber Pirate Tavern Cabin */}
      {theme === 'taverne' && (
        <group position={[0, 0.15, -0.14]}>
          <mesh position={[0, 0.13, 0]} castShadow>
            <boxGeometry args={[0.42, 0.24, 0.28]} />
            <meshStandardMaterial
              map={woodTexture}
              color="#92400e"
              roughness={0.78}
            />
          </mesh>
          <mesh
            position={[0, 0.32, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.34, 0.18, 4]} />
            <meshStandardMaterial color="#991b1b" roughness={0.6} />
          </mesh>
          <CleanPalm position={[0.34, 0, -0.04]} scale={0.85} lean={-0.18} />
        </group>
      )}

      {/* TRESOR: Clean Ornate Pirate Treasure Chest */}
      {theme === 'tresor' && (
        <group position={[0, 0.15, -0.12]}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[0.32, 0.18, 0.22]} />
            <meshStandardMaterial
              map={woodTexture}
              color="#78350f"
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.11, 0.115]}>
            <boxGeometry args={[0.07, 0.07, 0.02]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#eab308"
              emissiveIntensity={0.7}
              metalness={0.85}
            />
          </mesh>
        </group>
      )}

      {/* MALEDICTION: Single Floating Violet Crystal above Dark Rune Ring */}
      {theme === 'malediction' && (
        <group position={[0, 0.17, -0.12]}>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.16, 0.24, 8]} />
            <meshStandardMaterial
              color="#a855f7"
              emissive="#7e22ce"
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh ref={crystalRef} position={[0, 0.34, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial
              color="#e9d5ff"
              emissive="#9333ea"
              emissiveIntensity={1.3}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Animated Smuggler Outpost (Levels 1-3) or Pirate Fortress with Flag (Level 4)
 */
const IslandConstructions: React.FC<{
  level: number;
  ownerColor: string;
}> = ({ level, ownerColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const flagRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (groupRef.current && level > 0) {
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.65,
          ease: 'elastic.out(1.15, 0.45)',
        }
      );
    }
  }, [level]);

  useFrame(({ clock }) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 4.5) * 0.25;
    }
  });

  if (level <= 0) return null;

  if (level >= 4) {
    return (
      <group ref={groupRef} position={[0, 0.16, 0.08]} scale={0.8}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.64, 0.36, 0.28]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.42, 6]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={flagRef} position={[0.12, 0.66, 0]} castShadow>
          <boxGeometry args={[0.24, 0.14, 0.02]} />
          <meshStandardMaterial
            color={ownerColor}
            emissive={ownerColor}
            emissiveIntensity={0.45}
          />
        </mesh>
      </group>
    );
  }

  const positionsX =
    level === 1 ? [0] : level === 2 ? [-0.22, 0.22] : [-0.32, 0, 0.32];

  return (
    <group ref={groupRef} position={[0, 0.16, 0.08]} scale={0.8}>
      {positionsX.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
          <mesh
            position={[0, 0.29, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.18, 0.15, 4]} />
            <meshStandardMaterial color={ownerColor} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Tile: React.FC<TileProps> = ({
  tile,
  allTiles,
  owner,
  isFocused,
  onSelectTile,
}) => {
  const { position, rotationY, side } = getTileTransform(tile.id);
  const isCorner = side === 'corner';
  const foamRef = useRef<THREE.Mesh>(null);

  const [sandTexture, rockTexture, woodTexture] = useTexture([
    './assets/sand_beach.jpg',
    './assets/coastal_rock.jpg',
    './assets/wood_planks.jpg',
  ]);

  const theme = useMemo(() => getTileTerrainTheme(tile), [tile]);

  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, allTiles) : 0;

  const islandSeedAngle = useMemo(
    () => (tile.id * 1.17) % (Math.PI * 2),
    [tile.id]
  );

  useFrame(({ clock }) => {
    if (foamRef.current) {
      const s =
        1 + Math.sin(clock.getElapsedTime() * 2.4 + tile.id * 0.7) * 0.04;
      foamRef.current.scale.set(s, s, 1);
    }
  });

  const baseRadius = isCorner ? 0.88 : 0.78;
  const ribbonWidth = isCorner ? 1.52 : 1.42;

  const subtitleText =
    tile.type === 'island'
      ? owner
        ? `Loyer ${currentRent} Or`
        : `${tile.price} Or`
      : tile.type === 'start'
      ? '+200 Or'
      : tile.type === 'jail'
      ? 'La Cale'
      : tile.type === 'free_parking'
      ? 'Jackpot !'
      : tile.type === 'go_to_jail'
      ? 'Kraken !'
      : tile.type === 'tax'
      ? '-120 Or'
      : tile.type === 'chest'
      ? 'Trésor'
      : 'Malédiction';

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile?.(tile.id);
      }}
    >
      {/* 1. Animated Shoreline Foam Ring */}
      <mesh
        ref={foamRef}
        position={[0, -0.09, 0]}
        rotation={[-Math.PI / 2, 0, islandSeedAngle]}
      >
        <ringGeometry args={[baseRadius * 0.88, baseRadius * 1.12, 14]} />
        <meshStandardMaterial
          color={isFocused ? '#fde047' : '#e0f2fe'}
          emissive={isFocused ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={isFocused ? 0.95 : 0.45}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Ownership Glowing Ring around the Island Perimeter */}
      {owner && (
        <mesh position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 0.78, baseRadius * 0.88, 14]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 2. Viewer-Aligned Distinct Terrain Island & Coastal Rim Typography */}
      <group rotation={[0, -rotationY, 0]}>
        <DistinctTileTerrain
          tile={tile}
          theme={theme}
          baseRadius={baseRadius}
          sandTexture={sandTexture}
          rockTexture={rockTexture}
          woodTexture={woodTexture}
        />

        {/* Player Outposts / Fortresses */}
        {tile.type === 'island' && owner && (
          <IslandConstructions level={tile.level} ownerColor={owner.color} />
        )}

        {/* 3. STYLIZED DRIFTWOOD & PARCHMENT COASTAL RIM BANNER ("EN BORD DE CASE") */}
        <group
          position={[0, 0.13, baseRadius * 0.72]}
          rotation={[-Math.PI / 2 + 0.34, 0, 0]}
        >
          {/* Thin Color-Group Crest Trim along the Top Edge of the Border */}
          <mesh position={[0, 0.17, -0.005]} castShadow>
            <boxGeometry args={[ribbonWidth, 0.055, 0.032]} />
            <meshStandardMaterial
              color={isFocused ? '#fde047' : tile.color}
              emissive={isFocused ? '#f59e0b' : tile.color}
              emissiveIntensity={isFocused ? 0.85 : 0.45}
              roughness={0.35}
            />
          </mesh>

          {/* Sculpted Weathered Driftwood Plank along the Tile Edge */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[ribbonWidth, 0.31, 0.035]} />
            <meshStandardMaterial
              map={woodTexture}
              color="#78350f"
              roughness={0.78}
            />
          </mesh>

          {/* Recessed Warm Parchment Scroll Strip inside the Driftwood Border */}
          <mesh position={[0, 0.03, 0.019]}>
            <planeGeometry args={[ribbonWidth - 0.08, 0.19]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.65} />
          </mesh>

          {/* Left & Right Brass Corner Rivets on the Driftwood Border */}
          {[-ribbonWidth * 0.45, ribbonWidth * 0.45].map((xPos, idx) => (
            <mesh key={idx} position={[xPos, 0.03, 0.024]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
          ))}

          {/* Stylized Calligraphic Pirate Font (Pirata One) for the Tile Name */}
          <Text
            font={PIRATA_FONT_URL}
            position={[0, 0.035, 0.026]}
            fontSize={isCorner ? 0.165 : 0.155}
            maxWidth={ribbonWidth - 0.14}
            lineHeight={0.95}
            textAlign="center"
            color="#271206"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#fef3c7"
          >
            {tile.name}
          </Text>

          {/* Engraved Nautical Capitals (Cinzel Bold) on the Lower Mahogany Rim for #ID & Price */}
          <Text
            font={CINZEL_FONT_URL}
            position={[0, -0.105, 0.025]}
            fontSize={0.112}
            color={owner ? '#4ade80' : '#fde047'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor="#1c0d04"
          >
            {`#${tile.id}  •  ${subtitleText}`}
          </Text>
        </group>
      </group>
    </group>
  );
};
