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

export type CoastType = 'plage' | 'rocher' | 'crique' | 'recif';

const PIRATA_FONT_URL = './assets/fonts/PirataOne-Regular.ttf';
const CINZEL_FONT_URL = './assets/fonts/Cinzel-Bold.ttf';

/**
 * Deterministically assigns a varied coastal border style to each of the 24 tiles
 */
export function getTileCoastType(tile: TileData): CoastType {
  if (tile.id === 5 || tile.id === 9 || tile.id === 16) {
    return 'recif';
  }
  if (
    tile.id === 3 ||
    tile.id === 4 ||
    tile.id === 6 ||
    tile.id === 8 ||
    tile.id === 10 ||
    tile.id === 18 ||
    tile.id === 19 ||
    tile.id === 20
  ) {
    return 'rocher';
  }
  if (
    tile.id === 0 ||
    tile.id === 11 ||
    tile.id === 13 ||
    tile.id === 15 ||
    tile.id === 17 ||
    tile.id === 22 ||
    tile.id === 23
  ) {
    return 'crique';
  }
  return 'plage';
}

/**
 * Miniature Stylized Palm Tree for Coastal Islands
 */
const MiniPalm: React.FC<{
  position: [number, number, number];
  scale?: number;
  lean?: number;
  foliageColor?: string;
}> = ({ position, scale = 1, lean = 0.2, foliageColor = '#16a34a' }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, -lean * 0.5]} castShadow>
        <cylinderGeometry args={[0.036, 0.055, 0.24, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      <mesh
        position={[lean * 0.2, 0.3, 0]}
        rotation={[0, 0, -lean]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.038, 0.2, 6]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} />
      </mesh>
      <group position={[lean * 0.35, 0.4, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i * Math.PI * 2) / 5;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.13, -0.01, Math.sin(angle) * 0.13]}
              rotation={[
                Math.sin(angle) * 0.38,
                -angle,
                -Math.cos(angle) * 0.38,
              ]}
              castShadow
            >
              <coneGeometry args={[0.075, 0.26, 4]} />
              <meshStandardMaterial
                color={foliageColor}
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
 * Varied 3D Coastline Border around each tile:
 * - 'plage': Golden sandy beaches, scalloped sandbars, driftwood, starfish & shells
 * - 'rocher': Jagged slate sea-cliffs, rocky outcrops & crashing surf boulders
 * - 'crique': Mixed golden beach cove framed by twin rocky headlands
 * - 'recif': Turquoise coral atoll rim with pink/cyan coral formations & reef stones
 */
const CoastlineBorder: React.FC<{
  tile: TileData;
  coastType: CoastType;
  baseRadius: number;
  sandTexture: THREE.Texture;
  rockTexture: THREE.Texture;
}> = ({ tile, coastType, baseRadius, sandTexture, rockTexture }) => {
  const seed = tile.id * 1.37;

  const borderElements = useMemo(() => {
    const items: Array<{
      x: number;
      z: number;
      scale: number;
      rotY: number;
      rotZ: number;
      variant: number;
    }> = [];
    const count =
      coastType === 'rocher'
        ? 10
        : coastType === 'crique'
        ? 7
        : coastType === 'recif'
        ? 8
        : 6;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seed * 0.4;
      const dist = baseRadius * (0.8 + ((i * 37 + tile.id * 13) % 16) * 0.01);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Leave room at the front border edge (+Z) where the driftwood border plaque sits
      if (z > 0.38 && Math.abs(x) < 0.62) continue;

      items.push({
        x,
        z,
        scale: 0.78 + ((i * 19 + tile.id * 7) % 5) * 0.12,
        rotY: (i * 1.1 + seed) % (Math.PI * 2),
        rotZ: ((i % 3) - 1) * 0.18,
        variant: i % 3,
      });
    }
    return items;
  }, [coastType, baseRadius, seed, tile.id]);

  return (
    <group>
      {/* 1. Primary Sculpted Island Base according to CoastType */}
      {coastType === 'plage' && (
        <group>
          <mesh
            position={[0, 0.02, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.85, baseRadius * 1.05, 0.22, 12]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#fde68a"
              roughness={0.82}
            />
          </mesh>
          <mesh
            position={[
              (tile.id % 2 === 0 ? 1 : -1) * 0.26,
              0.01,
              -0.16,
            ]}
            rotation={[0, -seed * 0.7, 0]}
            receiveShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.58, baseRadius * 0.76, 0.18, 9]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#fef08a"
              roughness={0.85}
            />
          </mesh>
          {borderElements.map((el, idx) => (
            <group
              key={idx}
              position={[el.x, 0.11, el.z]}
              rotation={[0, el.rotY, 0]}
            >
              {el.variant === 0 ? (
                <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.028, 0.035, 0.22, 6]} />
                  <meshStandardMaterial color="#92400e" roughness={0.9} />
                </mesh>
              ) : el.variant === 1 ? (
                <mesh castShadow>
                  <cylinderGeometry args={[0.065, 0.075, 0.025, 5]} />
                  <meshStandardMaterial color="#fb7185" roughness={0.6} />
                </mesh>
              ) : (
                <mesh castShadow>
                  <dodecahedronGeometry args={[0.075 * el.scale, 0]} />
                  <meshStandardMaterial
                    color="#d6d3d1"
                    roughness={0.85}
                    flatShading
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>
      )}

      {coastType === 'rocher' && (
        <group>
          <mesh
            position={[0, 0.03, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.84, baseRadius * 1.03, 0.26, 9]}
            />
            <meshStandardMaterial
              map={rockTexture}
              color="#94a3b8"
              roughness={0.88}
              flatShading
            />
          </mesh>
          <mesh position={[0, 0.145, 0]} receiveShadow>
            <cylinderGeometry
              args={[baseRadius * 0.68, baseRadius * 0.74, 0.04, 9]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#cbd5e1"
              roughness={0.8}
            />
          </mesh>
          {borderElements.map((el, idx) => (
            <group
              key={idx}
              position={[el.x, 0.12, el.z]}
              rotation={[0, el.rotY, el.rotZ]}
            >
              <mesh castShadow receiveShadow>
                <dodecahedronGeometry args={[0.145 * el.scale, 0]} />
                <meshStandardMaterial
                  map={rockTexture}
                  color={idx % 2 === 0 ? '#475569' : '#64748b'}
                  roughness={0.9}
                  flatShading
                />
              </mesh>
              {el.variant === 0 && (
                <mesh position={[0.04, 0.12 * el.scale, 0]} castShadow>
                  <coneGeometry args={[0.09 * el.scale, 0.22 * el.scale, 5]} />
                  <meshStandardMaterial
                    color="#334155"
                    roughness={0.9}
                    flatShading
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>
      )}

      {coastType === 'crique' && (
        <group>
          <mesh
            position={[0, 0.02, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.85, baseRadius * 1.04, 0.23, 10]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#fde68a"
              roughness={0.82}
            />
          </mesh>
          {[-1, 1].map((dir, i) => (
            <group
              key={i}
              position={[dir * baseRadius * 0.74, 0.1, -0.06 + i * 0.08]}
              rotation={[0, seed + i, 0]}
            >
              <mesh castShadow receiveShadow>
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial
                  map={rockTexture}
                  color="#64748b"
                  roughness={0.88}
                  flatShading
                />
              </mesh>
              <mesh position={[dir * 0.08, 0.12, -0.06]} castShadow>
                <dodecahedronGeometry args={[0.13, 0]} />
                <meshStandardMaterial
                  color="#475569"
                  roughness={0.9}
                  flatShading
                />
              </mesh>
            </group>
          ))}
          {borderElements.map((el, idx) => (
            <mesh
              key={idx}
              position={[el.x, 0.11, el.z]}
              rotation={[0, el.rotY, el.rotZ]}
              castShadow
            >
              <dodecahedronGeometry args={[0.11 * el.scale, 0]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#57534e' : '#78716c'}
                roughness={0.88}
                flatShading
              />
            </mesh>
          ))}
        </group>
      )}

      {coastType === 'recif' && (
        <group>
          <mesh
            position={[0, 0.02, 0]}
            rotation={[0, seed, 0]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry
              args={[baseRadius * 0.85, baseRadius * 1.05, 0.22, 11]}
            />
            <meshStandardMaterial
              map={sandTexture}
              color="#fef08a"
              roughness={0.78}
            />
          </mesh>
          <mesh position={[0, 0.135, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseRadius * 0.42, baseRadius * 0.7, 12]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#06b6d4"
              emissiveIntensity={0.45}
              roughness={0.3}
            />
          </mesh>
          {borderElements.map((el, idx) => (
            <group
              key={idx}
              position={[el.x, 0.12, el.z]}
              rotation={[0, el.rotY, el.rotZ]}
            >
              {idx % 2 === 0 ? (
                <mesh castShadow>
                  <coneGeometry args={[0.085 * el.scale, 0.22 * el.scale, 5]} />
                  <meshStandardMaterial
                    color={idx % 4 === 0 ? '#f43f5e' : '#06b6d4'}
                    emissive={idx % 4 === 0 ? '#e11d48' : '#0891b2'}
                    emissiveIntensity={0.35}
                    flatShading
                  />
                </mesh>
              ) : (
                <mesh castShadow>
                  <dodecahedronGeometry args={[0.11 * el.scale, 0]} />
                  <meshStandardMaterial
                    map={rockTexture}
                    color="#475569"
                    roughness={0.85}
                    flatShading
                  />
                </mesh>
              )}
            </group>
          ))}
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
      <group ref={groupRef} position={[0, 0.22, -0.22]} scale={0.88}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.72, 0.42, 0.32]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {[-0.34, 0.34].map((x, idx) => (
          <group key={idx} position={[x, 0, 0.02]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.16, 0.54, 8]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.62, 0]} castShadow>
              <coneGeometry args={[0.17, 0.22, 8]} />
              <meshStandardMaterial color={ownerColor} roughness={0.45} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={flagRef} position={[0.14, 0.78, 0]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.02]} />
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
    level === 1 ? [0] : level === 2 ? [-0.25, 0.25] : [-0.36, 0, 0.36];

  return (
    <group ref={groupRef} position={[0, 0.22, -0.22]} scale={0.88}>
      {positionsX.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
          <mesh
            position={[0, 0.34, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.22, 0.18, 4]} />
            <meshStandardMaterial color={ownerColor} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Bespoke 3D Scenery placed in the Open Center of each Island (z = -0.1)
 */
const TileIslandScenery: React.FC<{ tile: TileData }> = ({ tile }) => {
  const animRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (animRef.current) {
      animRef.current.rotation.y = Math.sin(t * 2.2 + tile.id) * 0.22;
      animRef.current.position.y = Math.sin(t * 2.8 + tile.id) * 0.025;
    }
  });

  return (
    <group position={[0, 0.2, -0.1]} scale={0.94}>
      {/* #0 PORT ROYAL: Imperial Lighthouse & Golden Harbor Arch */}
      {tile.id === 0 && (
        <group>
          <mesh position={[-0.26, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 0.48, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh position={[-0.26, 0.56, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.6}
            />
          </mesh>
          <mesh position={[-0.26, 0.68, 0]} castShadow>
            <coneGeometry args={[0.12, 0.15, 8]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          <MiniPalm position={[0.3, 0, 0.02]} scale={0.92} lean={0.2} />
        </group>
      )}

      {/* #1 CRIQUE AUX CRABES: Red Beach Crabs & Coastal Palm */}
      {tile.id === 1 && (
        <group>
          <MiniPalm position={[-0.26, 0, 0]} scale={0.9} lean={0.22} />
          <mesh position={[0.12, 0.07, 0.04]} castShadow>
            <sphereGeometry args={[0.095, 7, 6]} />
            <meshStandardMaterial color="#ef4444" roughness={0.5} />
          </mesh>
          <mesh position={[0.28, 0.06, -0.02]} castShadow>
            <sphereGeometry args={[0.075, 7, 6]} />
            <meshStandardMaterial color="#f97316" roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* #2, #11, #21 COFFRE AU TRÉSOR: Pirate Treasure Chest & Gold Hoard */}
      {tile.type === 'chest' && (
        <group>
          <MiniPalm position={[-0.28, 0, 0]} scale={0.88} lean={-0.18} />
          <mesh position={[0.08, 0.1, 0]} castShadow>
            <boxGeometry args={[0.32, 0.2, 0.22]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0.08, 0.15, 0.115]}>
            <boxGeometry args={[0.08, 0.08, 0.02]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#eab308"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* #3 BAIE DES ÉPAVES: Tilted Shipwreck Hull & Broken Mast */}
      {tile.id === 3 && (
        <group position={[0, 0.08, 0]} rotation={[0.2, 0.25, -0.35]}>
          <mesh castShadow>
            <boxGeometry args={[0.4, 0.16, 0.22]} />
            <meshStandardMaterial color="#451a03" roughness={0.85} />
          </mesh>
          <mesh position={[0.04, 0.22, 0]} rotation={[0, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.02, 0.028, 0.38, 6]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
        </group>
      )}

      {/* #4 TAXE DE L'AMIRAUTÉ: Imperial Customs Watchtower & Gold Pillars */}
      {tile.id === 4 && (
        <group>
          <mesh position={[-0.18, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.13, 0.36, 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.6} />
          </mesh>
          <mesh position={[-0.18, 0.4, 0]} castShadow>
            <coneGeometry args={[0.14, 0.16, 8]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          <mesh position={[0.16, 0.1, 0.04]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.2, 8]} />
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* #5 ATOLL DE CORAIL: Coral Spires & Palm */}
      {tile.id === 5 && (
        <group>
          <MiniPalm position={[-0.26, 0, 0]} scale={0.86} lean={0.2} />
          <mesh position={[0.18, 0.14, 0]} rotation={[0, 0, -0.2]} castShadow>
            <coneGeometry args={[0.095, 0.28, 5]} />
            <meshStandardMaterial
              color="#f43f5e"
              emissive="#e11d48"
              emissiveIntensity={0.35}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* #6 ÎLE DU CRÂNE: Skull Bastion & Glowing Eyes */}
      {tile.id === 6 && (
        <group>
          <mesh position={[-0.16, 0.2, 0]} castShadow>
            <dodecahedronGeometry args={[0.23, 1]} />
            <meshStandardMaterial
              color="#475569"
              roughness={0.85}
              flatShading
            />
          </mesh>
          {[-0.22, -0.1].map((x, i) => (
            <mesh key={i} position={[x, 0.22, 0.16]}>
              <sphereGeometry args={[0.042, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={1.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* #7 LAGON DES SIRÈNES: Shimmering Tail Fin & Palm */}
      {tile.id === 7 && (
        <group>
          <MiniPalm position={[-0.26, 0, 0]} scale={0.86} lean={0.18} />
          <mesh position={[0.16, 0.16, 0]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.095, 0.28, 5]} />
            <meshStandardMaterial
              color="#2dd4bf"
              emissive="#0d9488"
              emissiveIntensity={0.4}
              flatShading
            />
          </mesh>
        </group>
      )}

      {/* #8, #15 MALÉDICTION DES MERS: Floating Arcane Crystal */}
      {tile.type === 'curse' && (
        <group ref={animRef}>
          <mesh position={[0, 0.24, 0]}>
            <octahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial
              color="#d8b4fe"
              emissive="#9333ea"
              emissiveIntensity={1.4}
            />
          </mesh>
        </group>
      )}

      {/* #9 RÉCIF DES PERLES: Glowing Giant Pearl */}
      {tile.id === 9 && (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#38bdf8"
              emissiveIntensity={0.9}
              roughness={0.1}
            />
          </mesh>
          <MiniPalm position={[0.26, 0, 0]} scale={0.84} lean={-0.18} />
        </group>
      )}

      {/* #10 PORT DES FLIBUSTIERS: Smuggler Crates & Barrel */}
      {tile.id === 10 && (
        <group>
          <mesh position={[-0.14, 0.1, 0]} castShadow>
            <boxGeometry args={[0.22, 0.2, 0.2]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0.16, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.22, 8]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* #12 TAVERNE DE TORTUGA: Pirate Tavern Inn & Palm */}
      {tile.id === 12 && (
        <group>
          <mesh position={[-0.12, 0.16, 0]} castShadow>
            <boxGeometry args={[0.38, 0.26, 0.24]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh
            position={[-0.12, 0.36, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.32, 0.18, 4]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.6} />
          </mesh>
          <MiniPalm position={[0.28, 0, 0]} scale={0.9} lean={-0.2} />
        </group>
      )}

      {/* #13 SANCTUAIRE VAUDOU: Tiki Totem Mask */}
      {tile.id === 13 && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.42, 7]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.85} flatShading />
          </mesh>
          <MiniPalm position={[-0.26, 0, 0]} scale={0.84} lean={0.2} />
        </group>
      )}

      {/* #14 CRIQUE DU RHUM: Copper Still & Barrels */}
      {tile.id === 14 && (
        <group>
          <mesh position={[-0.12, 0.14, 0]} castShadow>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial
              color="#ea580c"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0.16, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.095, 0.095, 0.2, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* #16 VOLCAN D'ÉMERAUDE: Smoking Emerald Volcano */}
      {tile.id === 16 && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <coneGeometry args={[0.32, 0.44, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.1, 0.07, 0.05, 8]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      )}

      {/* #17 FORTERESSE DE JADE: Stepped Jade Temple */}
      {tile.id === 17 && (
        <group>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.42, 0.16, 0.26]} />
            <meshStandardMaterial color="#059669" roughness={0.55} />
          </mesh>
          <mesh
            position={[0, 0.26, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.25, 0.16, 4]} />
            <meshStandardMaterial
              color="#fde047"
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
        </group>
      )}

      {/* #18 EMBUSCADE DU KRAKEN: Coiling Tentacles */}
      {tile.id === 18 && (
        <group ref={animRef}>
          {[-0.24, 0, 0.24].map((x, idx) => (
            <mesh
              key={idx}
              position={[x, 0.22, 0]}
              rotation={[0.2, 0, (idx - 1) * 0.25]}
              castShadow
            >
              <coneGeometry args={[0.095, 0.48, 7]} />
              <meshStandardMaterial
                color="#9333ea"
                emissive="#7e22ce"
                emissiveIntensity={0.45}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* #19 DÉTROIT DES TEMPÊTES: Storm Crags & Beacon */}
      {tile.id === 19 && (
        <group>
          <mesh position={[-0.18, 0.18, 0]} castShadow>
            <coneGeometry args={[0.16, 0.4, 5]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0.16, 0.22, 0]}>
            <octahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial
              color="#f87171"
              emissive="#ef4444"
              emissiveIntensity={1.3}
            />
          </mesh>
        </group>
      )}

      {/* #20 BASTION DE BARBE-NOIRE: Obsidian Keep */}
      {tile.id === 20 && (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.44, 0.26, 0.22]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0.12]}>
            <boxGeometry args={[0.32, 0.07, 0.02]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      )}

      {/* #22 CITADELLE D'OR: El Dorado Golden Pyramid */}
      {tile.id === 22 && (
        <group>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.44, 0.14, 0.26]} />
            <meshStandardMaterial
              color="#d97706"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.28, 0.14, 0.18]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={0.5}
              metalness={0.85}
            />
          </mesh>
        </group>
      )}

      {/* #23 ÎLE DU TRÉSOR MAUDIT: Sovereign Crown & Ruby */}
      {tile.id === 23 && (
        <group>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.2, 8]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#d97706"
              emissiveIntensity={0.5}
              metalness={0.85}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <octahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={1.3}
            />
          </mesh>
        </group>
      )}
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

  const coastType = useMemo(() => getTileCoastType(tile), [tile]);

  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, allTiles) : 0;

  const islandSeedAngle = useMemo(
    () => (tile.id * 1.17) % (Math.PI * 2),
    [tile.id]
  );

  // Upper terrain mound color
  const terrainColor = useMemo(() => {
    if (coastType === 'rocher') return '#475569';
    if (tile.type === 'curse') return '#581c87';
    if (tile.id >= 22) return '#d97706';
    if (coastType === 'recif') return '#0d9488';
    return '#16a34a';
  }, [coastType, tile.id, tile.type]);

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
      {/* 1. Animated Shoreline Foam & Reef Ring */}
      <mesh
        ref={foamRef}
        position={[0, -0.09, 0]}
        rotation={[-Math.PI / 2, 0, islandSeedAngle]}
      >
        <ringGeometry args={[baseRadius * 0.86, baseRadius * 1.14, 12]} />
        <meshStandardMaterial
          color={isFocused ? '#fde047' : '#e0f2fe'}
          emissive={isFocused ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={isFocused ? 0.95 : 0.45}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 2. Varied Coastal Border (Plage, Rocher, Crique, Récif) */}
      <CoastlineBorder
        tile={tile}
        coastType={coastType}
        baseRadius={baseRadius}
        sandTexture={sandTexture}
        rockTexture={rockTexture}
      />

      {/* Ownership Glowing Ring around the Island Perimeter */}
      {owner && (
        <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 0.76, baseRadius * 0.88, 12]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Viewer-Aligned Island Center & Coastal Rim Typography (en bord de case) */}
      <group rotation={[0, -rotationY, 0]}>
        {/* Central Biome Mound supporting the 3D Landmark */}
        <mesh
          position={[0, 0.15, -0.1]}
          rotation={[0, islandSeedAngle * 0.5, 0]}
          receiveShadow
          castShadow
        >
          <cylinderGeometry
            args={[baseRadius * 0.5, baseRadius * 0.68, 0.14, 9]}
          />
          <meshStandardMaterial
            color={terrainColor}
            roughness={0.75}
            flatShading
          />
        </mesh>

        {/* Bespoke 3D Landmark in the Open Center of the Island */}
        <TileIslandScenery tile={tile} />

        {/* Player Outposts / Fortresses */}
        {tile.type === 'island' && owner && (
          <IslandConstructions level={tile.level} ownerColor={owner.color} />
        )}

        {/* 4. STYLIZED DRIFTWOOD & PARCHMENT COASTAL RIM BANNER ("EN BORD DE CASE") */}
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
