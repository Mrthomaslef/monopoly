import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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

/**
 * Miniature Stylized Palm Tree for Tile Islands
 */
const MiniPalm: React.FC<{
  position: [number, number, number];
  scale?: number;
  lean?: number;
  foliageColor?: string;
}> = ({ position, scale = 1, lean = 0.2, foliageColor = '#16a34a' }) => {
  return (
    <group position={position} scale={scale}>
      {/* Curved Trunk */}
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
      {/* Fronds Crown */}
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
      flagRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 4) * 0.25;
    }
  });

  if (level <= 0) return null;

  // Level 4: Full Pirate Fortress with Flag
  if (level >= 4) {
    return (
      <group ref={groupRef} position={[0, 0.28, -0.32]}>
        {/* Main Fortress Keep */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.64, 0.38, 0.3]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
        </mesh>
        {/* Left & Right Bastion Towers */}
        <mesh position={[-0.3, 0.25, 0.02]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 0.25, 0.02]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Tower Cones */}
        <mesh position={[-0.3, 0.56, 0.02]} castShadow>
          <coneGeometry args={[0.15, 0.18, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.5} />
        </mesh>
        <mesh position={[0.3, 0.56, 0.02]} castShadow>
          <coneGeometry args={[0.15, 0.18, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.5} />
        </mesh>
        {/* Flagpole & Pirate Flag */}
        <mesh position={[0, 0.58, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.48, 6]} />
          <meshStandardMaterial color="#fde047" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh ref={flagRef} position={[0.13, 0.72, 0]} castShadow>
          <boxGeometry args={[0.25, 0.14, 0.02]} />
          <meshStandardMaterial
            color={ownerColor}
            emissive={ownerColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    );
  }

  // Levels 1 to 3: Smuggler Outposts placed along the island ridge
  const positionsX =
    level === 1 ? [0.42] : level === 2 ? [-0.42, 0.42] : [-0.44, 0, 0.44];

  return (
    <group ref={groupRef} position={[0, 0.25, -0.32]}>
      {positionsX.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Wooden Outpost Cabin */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.2, 0.22, 0.2]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          {/* Pitched Roof in Owner's Color */}
          <mesh position={[0, 0.29, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.19, 0.16, 4]} />
            <meshStandardMaterial
              color={ownerColor}
              emissive={ownerColor}
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Bespoke 3D Island Landmark & Scenery for each of the 24 tiles (by ID & Name)
 */
const TileIslandScenery: React.FC<{ tile: TileData }> = ({ tile }) => {
  const animRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (animRef.current) {
      if (tile.type === 'go_to_jail') {
        animRef.current.rotation.y = Math.sin(t * 2.2) * 0.25;
        animRef.current.position.y = Math.sin(t * 3) * 0.03;
      } else if (tile.type === 'curse') {
        animRef.current.position.y = Math.sin(t * 2.5 + tile.id) * 0.04;
        animRef.current.rotation.y = t * 0.8;
      } else if (tile.id === 16) {
        const s = 1 + Math.sin(t * 3) * 0.14;
        animRef.current.scale.set(s, s, s);
      }
    }
  });

  // Number-correspondent coastal reef rocks & islets (count & richness scale with tile.id)
  const milestoneRocks = useMemo(() => {
    const count = Math.min(8, Math.max(1, Math.ceil((tile.id + 1) / 3)));
    return Array.from({ length: count }, (_, idx) => {
      const angle =
        -Math.PI * 0.85 + (idx / Math.max(1, count - 1)) * Math.PI * 0.7;
      const dist = 0.62 + (idx % 2) * 0.08;
      const x = Math.sin(angle) * dist;
      const z = -Math.cos(angle) * dist * 0.85;
      const scale = 0.075 + ((tile.id + idx) % 3) * 0.022;
      return { x, z, scale };
    });
  }, [tile.id]);

  return (
    <group>
      {/* Number-correspondent coastal reef stones around the island shore */}
      {milestoneRocks.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, 0.08, r.z]}
          rotation={[i * 0.4, i * 0.9, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[r.scale, 0]} />
          <meshStandardMaterial
            color={tile.id >= 22 ? '#fbbf24' : '#64748b'}
            roughness={0.8}
            flatShading
          />
        </mesh>
      ))}

      {/* Bespoke landmark per tile ID on the island summit */}
      <group position={[0, 0.24, -0.26]} scale={1.18}>
        {/* #0 PORT ROYAL: Lighthouse, Harbor Pier & Golden Arch */}
        {tile.id === 0 && (
          <group>
            <mesh position={[-0.28, 0.26, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.14, 0.52, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.55} />
            </mesh>
            <mesh position={[-0.28, 0.36, 0]}>
              <cylinderGeometry args={[0.105, 0.115, 0.1, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.6} />
            </mesh>
            <mesh position={[-0.28, 0.56, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={1.4}
              />
            </mesh>
            <mesh position={[-0.28, 0.67, 0]} castShadow>
              <coneGeometry args={[0.12, 0.15, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            {/* Golden Harbor Arch */}
            <mesh position={[0.12, 0.16, 0.02]} castShadow>
              <torusGeometry args={[0.17, 0.04, 6, 12, Math.PI]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <MiniPalm position={[0.36, 0, 0.04]} scale={0.95} lean={0.2} />
          </group>
        )}

        {/* #1 CRIQUE AUX CRABES: Red Beach Crabs, Tidal Rocks & Palm */}
        {tile.id === 1 && (
          <group>
            <MiniPalm position={[-0.3, 0, 0.02]} scale={0.9} lean={0.22} />
            {/* Crab 1 */}
            <group position={[0.05, 0.06, 0.06]} rotation={[0, 0.3, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.09, 7, 6]} />
                <meshStandardMaterial color="#ef4444" roughness={0.5} />
              </mesh>
              <mesh position={[-0.09, 0.02, 0.07]}>
                <sphereGeometry args={[0.04, 5, 5]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
              <mesh position={[0.09, 0.02, 0.07]}>
                <sphereGeometry args={[0.04, 5, 5]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </group>
            {/* Crab 2 */}
            <group position={[0.28, 0.05, -0.02]} rotation={[0, -0.4, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.075, 7, 6]} />
                <meshStandardMaterial color="#f97316" roughness={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* #2, #11, #21 COFFRE AU TRÉSOR: Treasure Chest Islet & Palm */}
        {tile.type === 'chest' && (
          <group>
            <MiniPalm position={[-0.3, 0, 0.02]} scale={0.92} lean={-0.18} />
            {/* Treasure Chest */}
            <group position={[0.08, 0.1, 0.04]} rotation={[0, -0.2, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.32, 0.2, 0.22]} />
                <meshStandardMaterial color="#78350f" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry
                  args={[0.11, 0.11, 0.33, 8, 1, false, 0, Math.PI]}
                />
                <meshStandardMaterial color="#92400e" roughness={0.65} />
              </mesh>
              <mesh position={[0, 0.05, 0.115]}>
                <boxGeometry args={[0.08, 0.09, 0.02]} />
                <meshStandardMaterial
                  color="#fde047"
                  emissive="#eab308"
                  emissiveIntensity={0.6}
                  metalness={0.8}
                />
              </mesh>
            </group>
            <mesh position={[0.3, 0.05, 0.08]}>
              <sphereGeometry args={[0.09, 7, 6]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#ca8a04"
                emissiveIntensity={0.45}
              />
            </mesh>
          </group>
        )}

        {/* #3 BAIE DES ÉPAVES: Shipwrecked Hull & Broken Mast */}
        {tile.id === 3 && (
          <group>
            <group position={[-0.06, 0.1, 0.02]} rotation={[0.25, 0.3, -0.38]}>
              <mesh castShadow>
                <boxGeometry args={[0.4, 0.17, 0.22]} />
                <meshStandardMaterial color="#451a03" roughness={0.85} />
              </mesh>
              <mesh position={[0.04, 0.24, 0]} rotation={[0, 0, 0.2]} castShadow>
                <cylinderGeometry args={[0.02, 0.028, 0.4, 6]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
              <mesh position={[0.05, 0.28, 0.04]} rotation={[0, 0, 0.35]}>
                <boxGeometry args={[0.24, 0.13, 0.02]} />
                <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
              </mesh>
            </group>
            <mesh position={[0.28, 0.08, 0.04]} castShadow>
              <dodecahedronGeometry args={[0.14, 0]} />
              <meshStandardMaterial color="#57534e" roughness={0.9} flatShading />
            </mesh>
          </group>
        )}

        {/* #4 TAXE DE L'AMIRAUTÉ: Imperial Customs Outpost & Gold Pillars */}
        {tile.id === 4 && (
          <group>
            <mesh position={[-0.2, 0.18, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.36, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>
            <mesh position={[-0.2, 0.41, 0]} castShadow>
              <coneGeometry args={[0.15, 0.17, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            <mesh position={[0.12, 0.11, 0.05]} castShadow>
              <cylinderGeometry args={[0.075, 0.075, 0.2, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.35}
                metalness={0.8}
              />
            </mesh>
            <mesh position={[0.27, 0.07, 0.06]} castShadow>
              <cylinderGeometry args={[0.075, 0.075, 0.13, 8]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#ca8a04"
                emissiveIntensity={0.35}
                metalness={0.8}
              />
            </mesh>
          </group>
        )}

        {/* #5 ATOLL DE CORAIL: Turquoise Mini-Lagoon Ring & Colorful Coral Branches */}
        {tile.id === 5 && (
          <group>
            <mesh position={[0, 0.02, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.28, 14]} />
              <meshStandardMaterial
                color="#22d3ee"
                emissive="#06b6d4"
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[-0.24, 0.13, 0]} rotation={[0, 0, 0.25]} castShadow>
              <coneGeometry args={[0.09, 0.26, 5]} />
              <meshStandardMaterial
                color="#f43f5e"
                emissive="#e11d48"
                emissiveIntensity={0.35}
                flatShading
              />
            </mesh>
            <mesh position={[0.24, 0.14, -0.02]} rotation={[0, 0, -0.2]} castShadow>
              <dodecahedronGeometry args={[0.13, 0]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#0891b2"
                emissiveIntensity={0.35}
                flatShading
              />
            </mesh>
            <MiniPalm position={[-0.34, 0, 0.04]} scale={0.85} lean={0.2} />
          </group>
        )}

        {/* #6 ÎLE DU CRÂNE (JAIL): Skull Crag & Iron Cage Bars */}
        {tile.id === 6 && (
          <group>
            <mesh position={[-0.22, 0.22, -0.04]} castShadow>
              <dodecahedronGeometry args={[0.23, 1]} />
              <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[-0.29, 0.24, 0.14]}>
              <sphereGeometry args={[0.045, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[-0.15, 0.24, 0.14]}>
              <sphereGeometry args={[0.045, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={1.6}
              />
            </mesh>
            {[0.06, 0.19, 0.32].map((x, idx) => (
              <mesh key={idx} position={[x, 0.2, 0.02]} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 0.38, 6]} />
                <meshStandardMaterial
                  color="#334155"
                  metalness={0.85}
                  roughness={0.25}
                />
              </mesh>
            ))}
            <mesh position={[0.19, 0.38, 0.02]} castShadow>
              <boxGeometry args={[0.36, 0.05, 0.08]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>
          </group>
        )}

        {/* #7 LAGON DES SIRÈNES: Shimmering Lagoon, Mermaid Tail Fin & Sea Flower */}
        {tile.id === 7 && (
          <group>
            <mesh position={[0, 0.02, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.28, 14]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[-0.1, 0.17, 0.02]} rotation={[0, 0, 0.35]} castShadow>
              <coneGeometry args={[0.11, 0.3, 4]} />
              <meshStandardMaterial
                color="#2dd4bf"
                emissive="#0d9488"
                emissiveIntensity={0.45}
              />
            </mesh>
            <mesh position={[0.2, 0.11, 0.05]}>
              <dodecahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial
                color="#f472b6"
                emissive="#db2777"
                emissiveIntensity={0.45}
              />
            </mesh>
            <MiniPalm position={[0.32, 0, 0]} scale={0.88} lean={-0.18} />
          </group>
        )}

        {/* #8 & #15 MALÉDICTION DES MERS: Mystical Purple Obelisks & Floating Orb */}
        {tile.type === 'curse' && (
          <group>
            <mesh position={[-0.25, 0.17, 0]} rotation={[0, 0, 0.15]} castShadow>
              <coneGeometry args={[0.085, 0.36, 5]} />
              <meshStandardMaterial
                color="#7c3aed"
                emissive="#6d28d9"
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            <mesh position={[0.25, 0.17, 0]} rotation={[0, 0, -0.15]} castShadow>
              <coneGeometry args={[0.085, 0.36, 5]} />
              <meshStandardMaterial
                color="#7c3aed"
                emissive="#6d28d9"
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            <group ref={animRef} position={[0, 0.25, 0.02]}>
              <mesh>
                <octahedronGeometry args={[0.14, 0]} />
                <meshStandardMaterial
                  color="#c084fc"
                  emissive="#9333ea"
                  emissiveIntensity={1.2}
                />
              </mesh>
            </group>
          </group>
        )}

        {/* #9 RÉCIF DES PERLES: Giant Clam Shell with Glowing Pearl & Pink Coral */}
        {tile.id === 9 && (
          <group>
            <mesh position={[0, 0.05, 0.04]} castShadow>
              <cylinderGeometry args={[0.2, 0.15, 0.07, 10]} />
              <meshStandardMaterial color="#fbcfe8" roughness={0.5} />
            </mesh>
            <mesh
              position={[0, 0.17, -0.06]}
              rotation={[0.9, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.2, 0.16, 0.06, 10]} />
              <meshStandardMaterial color="#f472b6" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.14, 0.04]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#fce7f3"
                emissiveIntensity={0.95}
                metalness={0.3}
                roughness={0.1}
              />
            </mesh>
            <MiniPalm position={[-0.32, 0, 0.04]} scale={0.85} lean={0.2} />
          </group>
        )}

        {/* #10 PORT DES FLIBUSTIERS: Corsair Wooden Dock, Crates & Tavern Lantern */}
        {tile.id === 10 && (
          <group>
            <mesh position={[-0.2, 0.11, 0.02]} castShadow>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshStandardMaterial color="#92400e" roughness={0.8} />
            </mesh>
            <mesh position={[0.03, 0.09, 0.05]} castShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.18, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.75} />
            </mesh>
            <mesh position={[0.25, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.022, 0.028, 0.42, 6]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
            <mesh position={[0.25, 0.39, 0.05]}>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={1.3}
              />
            </mesh>
          </group>
        )}

        {/* #12 TAVERNE DE TORTUGA (FREE PARKING): Festive Tavern, Rum Barrels & Golden Mug */}
        {tile.id === 12 && (
          <group>
            <mesh position={[-0.18, 0.16, -0.02]} castShadow>
              <boxGeometry args={[0.38, 0.28, 0.26]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh
              position={[-0.18, 0.37, -0.02]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <coneGeometry args={[0.32, 0.2, 4]} />
              <meshStandardMaterial color="#16a34a" roughness={0.6} />
            </mesh>
            <mesh position={[0.16, 0.12, 0.04]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.22, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <MiniPalm position={[0.36, 0, 0.04]} scale={0.95} lean={-0.2} />
          </group>
        )}

        {/* #13 SANCTUAIRE VAUDOU: Tiki Totem Mask & Glowing Eyes */}
        {tile.id === 13 && (
          <group>
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.16, 0.46, 7]} />
              <meshStandardMaterial color="#7c2d12" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[-0.055, 0.28, 0.13]}>
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshStandardMaterial
                color="#4ade80"
                emissive="#22c55e"
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[0.055, 0.28, 0.13]}>
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshStandardMaterial
                color="#4ade80"
                emissive="#22c55e"
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[0, 0.49, 0]} castShadow>
              <coneGeometry args={[0.17, 0.15, 5]} />
              <meshStandardMaterial
                color="#f97316"
                emissive="#ea580c"
                emissiveIntensity={0.45}
              />
            </mesh>
            <MiniPalm
              position={[-0.32, 0, 0.04]}
              scale={0.85}
              lean={0.2}
              foliageColor="#15803d"
            />
          </group>
        )}

        {/* #14 CRIQUE DU RHUM: Copper Rum Distillery & Stacked Barrels */}
        {tile.id === 14 && (
          <group>
            <mesh position={[-0.14, 0.15, 0]} castShadow>
              <sphereGeometry args={[0.15, 10, 8]} />
              <meshStandardMaterial
                color="#ea580c"
                metalness={0.65}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[-0.14, 0.31, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.065, 0.22, 8]} />
              <meshStandardMaterial
                color="#fb923c"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0.14, 0.1, 0.04]} castShadow>
              <cylinderGeometry args={[0.095, 0.095, 0.2, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh position={[0.29, 0.1, 0.02]} castShadow>
              <cylinderGeometry args={[0.095, 0.095, 0.2, 8]} />
              <meshStandardMaterial color="#92400e" roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* #16 VOLCAN D'ÉMERAUDE: Smoking Volcano with Glowing Emerald Crater */}
        {tile.id === 16 && (
          <group>
            <mesh position={[0, 0.23, -0.02]} castShadow>
              <coneGeometry args={[0.34, 0.48, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 0.46, -0.02]}>
              <cylinderGeometry args={[0.11, 0.075, 0.06, 8]} />
              <meshStandardMaterial
                color="#34d399"
                emissive="#10b981"
                emissiveIntensity={1.6}
              />
            </mesh>
            <group ref={animRef} position={[0, 0.58, -0.02]}>
              <mesh>
                <dodecahedronGeometry args={[0.095, 0]} />
                <meshStandardMaterial
                  color="#6ee7b7"
                  emissive="#10b981"
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.75}
                />
              </mesh>
            </group>
          </group>
        )}

        {/* #17 FORTERESSE DE JADE: Stepped Jade Temple & Golden Roof */}
        {tile.id === 17 && (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[0.44, 0.16, 0.28]} />
              <meshStandardMaterial color="#059669" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[0.3, 0.14, 0.22]} />
              <meshStandardMaterial color="#10b981" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.37, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[0.24, 0.15, 4]} />
              <meshStandardMaterial
                color="#fde047"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
          </group>
        )}

        {/* #18 EMBUSCADE DU KRAKEN (GO TO JAIL): Animated Kraken Tentacles */}
        {tile.id === 18 && (
          <group ref={animRef}>
            {[-0.26, 0, 0.26].map((x, idx) => (
              <mesh
                key={idx}
                position={[x, 0.24, 0]}
                rotation={[0.2, 0, (idx - 1) * 0.28]}
                castShadow
              >
                <coneGeometry args={[0.1, 0.52, 7]} />
                <meshStandardMaterial
                  color="#9333ea"
                  emissive="#7e22ce"
                  emissiveIntensity={0.45}
                  roughness={0.4}
                />
              </mesh>
            ))}
          </group>
        )}

        {/* #19 DÉTROIT DES TEMPÊTES: Jagged Storm Crags & Lightning Beacon */}
        {tile.id === 19 && (
          <group>
            <mesh position={[-0.2, 0.2, 0]} rotation={[0, 0, -0.2]} castShadow>
              <coneGeometry args={[0.19, 0.44, 5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0.19, 0.18, 0.02]} rotation={[0, 0, 0.22]} castShadow>
              <coneGeometry args={[0.16, 0.38, 5]} />
              <meshStandardMaterial color="#334155" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 0.29, 0.04]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color="#f87171"
                emissive="#ef4444"
                emissiveIntensity={1.3}
              />
            </mesh>
          </group>
        )}

        {/* #20 BASTION DE BARBE-NOIRE: Dark Obsidian Bastion & Twin Cannons */}
        {tile.id === 20 && (
          <group>
            <mesh position={[0, 0.16, -0.02]} castShadow>
              <boxGeometry args={[0.48, 0.28, 0.24]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.22, 0.11]}>
              <boxGeometry args={[0.36, 0.08, 0.02]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={0.5}
              />
            </mesh>
            <mesh
              position={[-0.15, 0.14, 0.14]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.035, 0.045, 0.18, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh
              position={[0.15, 0.14, 0.14]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.035, 0.045, 0.18, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        )}

        {/* #22 CITADELLE D'OR: El Dorado Stepped Golden Pyramid & Golden Palms */}
        {tile.id === 22 && (
          <group>
            <mesh position={[0, 0.08, 0]} castShadow>
              <boxGeometry args={[0.46, 0.14, 0.3]} />
              <meshStandardMaterial
                color="#d97706"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.32, 0.14, 0.22]} />
              <meshStandardMaterial
                color="#f59e0b"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <mesh position={[0, 0.32, 0]} castShadow>
              <boxGeometry args={[0.18, 0.12, 0.14]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={0.6}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
            <MiniPalm
              position={[-0.32, 0, 0.05]}
              scale={0.85}
              lean={0.2}
              foliageColor="#eab308"
            />
          </group>
        )}

        {/* #23 ÎLE DU TRÉSOR MAUDIT: Sovereign Golden Crown, Ruby Spires & Hoard */}
        {tile.id === 23 && (
          <group>
            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.3, 0.2, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.45}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.13, 0.14, 7]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={0.7}
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <octahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={1.2}
              />
            </mesh>
            <MiniPalm
              position={[0.34, 0, 0.05]}
              scale={0.9}
              lean={-0.2}
              foliageColor="#f59e0b"
            />
          </group>
        )}
      </group>
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

  // Ensure text on top/left sides is never upside down for the viewer
  const textFlipRotation = side === 'top' || side === 'left' ? Math.PI : 0;

  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, allTiles) : 0;

  // Deterministic organic shape rotation per island ID so no two islands look identical
  const islandSeedAngle = useMemo(
    () => (tile.id * 1.17) % (Math.PI * 2),
    [tile.id]
  );

  // Biome terrain color for the upper island mound
  const terrainColor = useMemo(() => {
    if (tile.type === 'jail' || tile.id === 19 || tile.id === 20) return '#475569';
    if (tile.type === 'curse') return '#581c87';
    if (tile.id >= 22) return '#d97706';
    if (tile.id === 5 || tile.id === 7 || tile.id === 9) return '#0d9488';
    return '#16a34a';
  }, [tile.id, tile.type]);

  useFrame(({ clock }) => {
    if (foamRef.current) {
      const s =
        1 + Math.sin(clock.getElapsedTime() * 2.4 + tile.id * 0.7) * 0.04;
      foamRef.current.scale.set(s, s, 1);
    }
  });

  const baseRadius = isCorner ? 0.86 : 0.76;

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile?.(tile.id);
      }}
    >
      {/* 1. Shallow Turquoise Reef & Animated White Sea-Foam Shoreline */}
      <mesh
        ref={foamRef}
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, islandSeedAngle]}
      >
        <ringGeometry args={[baseRadius * 0.85, baseRadius * 1.12, 10]} />
        <meshStandardMaterial
          color={isFocused ? '#fde047' : '#e0f2fe'}
          emissive={isFocused ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={isFocused ? 0.95 : 0.45}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 2. Main Sculpted Low-Poly Golden Sandy Beach Island (NO square box!) */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[0, islandSeedAngle, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[baseRadius * 0.82, baseRadius * 1.0, 0.24, 9]}
        />
        <meshStandardMaterial
          color={
            tile.type === 'jail'
              ? '#94a3b8'
              : tile.type === 'curse'
              ? '#d8b4fe'
              : '#fde68a'
          }
          roughness={0.85}
          flatShading
        />
      </mesh>

      {/* Organic Secondary Sandy Cove Peninsula */}
      <mesh
        position={[
          (tile.id % 2 === 0 ? 1 : -1) * 0.24,
          0.01,
          0.22,
        ]}
        rotation={[0, -islandSeedAngle * 0.6, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[baseRadius * 0.56, baseRadius * 0.72, 0.22, 7]}
        />
        <meshStandardMaterial
          color={
            tile.type === 'jail'
              ? '#cbd5e1'
              : tile.type === 'curse'
              ? '#e9d5ff'
              : '#fef08a'
          }
          roughness={0.82}
          flatShading
        />
      </mesh>

      {/* 3. Lush Biome Island Mound on the Back/Summit of the Island */}
      <mesh
        position={[0, 0.16, -0.22]}
        rotation={[0, islandSeedAngle * 0.5, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[baseRadius * 0.54, baseRadius * 0.7, 0.16, 8]}
        />
        <meshStandardMaterial
          color={terrainColor}
          roughness={0.75}
          flatShading
        />
      </mesh>

      {/* 4. Island Color-Group Crest / Totem Rim on the Island Crown */}
      <mesh
        position={[0, 0.155, -0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry
          args={[baseRadius * 0.66, baseRadius * 0.8, 9, 1, 0, Math.PI]}
        />
        <meshStandardMaterial
          color={tile.color}
          emissive={tile.color}
          emissiveIntensity={isFocused ? 0.65 : 0.35}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ownership Glowing Ring around the Beach Perimeter */}
      {owner && (
        <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseRadius * 0.74, baseRadius * 0.84, 9]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 5. Bespoke Island Scenery & Number-Correspondent Stones */}
      <TileIslandScenery tile={tile} />

      {/* 6. Player Constructions (Smuggler Outposts 1-3 or Pirate Fortress 4) */}
      {tile.type === 'island' && owner && (
        <IslandConstructions level={tile.level} ownerColor={owner.color} />
      )}

      {/* 7. High-Contrast Readable Text on the Sandy Beach Clearing */}
      <group
        position={[0, 0.165, 0.2]}
        rotation={[-Math.PI / 2, 0, textFlipRotation]}
      >
        {/* Prominent Tile Number Badge */}
        <Text
          position={[0, 0.21, 0]}
          fontSize={0.145}
          color={tile.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#0f172a"
        >
          {`#${tile.id}`}
        </Text>

        {/* Island / Tile Name */}
        <Text
          position={[0, 0.01, 0]}
          fontSize={isCorner ? 0.145 : 0.138}
          maxWidth={1.16}
          lineHeight={1.04}
          textAlign="center"
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.028}
          outlineColor="#0f172a"
        >
          {tile.name.toUpperCase()}
        </Text>

        {/* Price / Rent or Event Subtitle */}
        <Text
          position={[0, -0.2, 0]}
          fontSize={0.135}
          color={owner ? owner.color : '#fde047'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.026}
          outlineColor="#0f172a"
        >
          {tile.type === 'island'
            ? owner
              ? `Loyer ${currentRent} Or`
              : `${tile.price} Or`
            : tile.type === 'start'
            ? '+200 Or'
            : tile.type === 'jail'
            ? 'La Cale'
            : tile.type === 'free_parking'
            ? 'Butin !'
            : tile.type === 'go_to_jail'
            ? 'Kraken !'
            : tile.type === 'tax'
            ? '-120 Or'
            : tile.type === 'chest'
            ? 'Trésor'
            : 'Malédiction'}
        </Text>
      </group>
    </group>
  );
};
