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
}> = ({ position, scale = 1, lean = 0.18, foliageColor = '#16a34a' }) => {
  return (
    <group position={position} scale={scale}>
      {/* Curved Trunk */}
      <mesh position={[0, 0.11, 0]} rotation={[0, 0, -lean * 0.5]} castShadow>
        <cylinderGeometry args={[0.032, 0.048, 0.22, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      <mesh
        position={[lean * 0.18, 0.28, 0]}
        rotation={[0, 0, -lean]}
        castShadow
      >
        <cylinderGeometry args={[0.022, 0.034, 0.18, 6]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} />
      </mesh>
      {/* Fronds Crown */}
      <group position={[lean * 0.32, 0.37, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i * Math.PI * 2) / 5;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.11, -0.01, Math.sin(angle) * 0.11]}
              rotation={[
                Math.sin(angle) * 0.35,
                -angle,
                -Math.cos(angle) * 0.35,
              ]}
              castShadow
            >
              <coneGeometry args={[0.065, 0.22, 4]} />
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
 * Positioned on the elevated island ridge so it never obscures the readable plaque
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
      <group ref={groupRef} position={[0, 0.24, -0.5]}>
        {/* Main Fortress Keep */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.68, 0.38, 0.3]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
        </mesh>
        {/* Left & Right Bastion Towers */}
        <mesh position={[-0.32, 0.25, 0.02]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        <mesh position={[0.32, 0.25, 0.02]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Tower Cones */}
        <mesh position={[-0.32, 0.56, 0.02]} castShadow>
          <coneGeometry args={[0.15, 0.18, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.5} />
        </mesh>
        <mesh position={[0.32, 0.56, 0.02]} castShadow>
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

  // Levels 1 to 3: Smuggler Outposts placed along the coastal cliff
  const positionsX =
    level === 1 ? [0.44] : level === 2 ? [-0.44, 0.44] : [-0.46, 0, 0.46];

  return (
    <group ref={groupRef} position={[0, 0.22, -0.48]}>
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
              emissiveIntensity={0.2}
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
 * Situated on the north/back ridge of the mini-island so the front beach plaque stays 100% readable
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
        // Volcano smoke pulse
        const s = 1 + Math.sin(t * 3) * 0.12;
        animRef.current.scale.set(s, s, s);
      }
    }
  });

  // Number-based stepping stones / coastal rock count (scales with tile.id)
  const milestoneRocks = useMemo(() => {
    const count = Math.min(8, Math.max(1, Math.ceil((tile.id + 1) / 3)));
    return Array.from({ length: count }, (_, idx) => {
      const side = idx % 2 === 0 ? -1 : 1;
      const row = Math.floor(idx / 2);
      const x = side * (0.58 + (row % 2) * 0.07);
      const z = -0.35 + row * 0.22;
      const scale = 0.055 + ((tile.id + idx) % 3) * 0.015;
      return { x, z, scale };
    });
  }, [tile.id]);

  return (
    <group>
      {/* Number-correspondent coastal reef stones along the island flanks */}
      {milestoneRocks.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, 0.12, r.z]}
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

      {/* Bespoke landmark per tile ID */}
      <group position={[0, 0.2, -0.45]}>
        {/* #0 PORT ROYAL: Lighthouse, Harbor Pier & Golden Arch */}
        {tile.id === 0 && (
          <group>
            <mesh position={[-0.32, 0.26, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.14, 0.52, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.55} />
            </mesh>
            <mesh position={[-0.32, 0.36, 0]}>
              <cylinderGeometry args={[0.105, 0.115, 0.1, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.6} />
            </mesh>
            <mesh position={[-0.32, 0.56, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={1.4}
              />
            </mesh>
            <mesh position={[-0.32, 0.67, 0]} castShadow>
              <coneGeometry args={[0.12, 0.15, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            {/* Golden Harbor Arch */}
            <mesh position={[0.15, 0.18, 0.02]} castShadow>
              <torusGeometry args={[0.18, 0.04, 6, 12, Math.PI]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <MiniPalm position={[0.42, 0, 0.06]} scale={0.95} lean={0.2} />
          </group>
        )}

        {/* #1 CRIQUE AUX CRABES: Red Beach Crabs, Tidal Rocks & Palm */}
        {tile.id === 1 && (
          <group>
            <MiniPalm position={[-0.36, 0, 0.04]} scale={0.85} lean={0.22} />
            {/* Crab 1 */}
            <group position={[0.05, 0.06, 0.06]} rotation={[0, 0.3, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.08, 7, 6]} />
                <meshStandardMaterial color="#ef4444" roughness={0.5} />
              </mesh>
              <mesh position={[-0.08, 0.02, 0.06]}>
                <sphereGeometry args={[0.035, 5, 5]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
              <mesh position={[0.08, 0.02, 0.06]}>
                <sphereGeometry args={[0.035, 5, 5]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </group>
            {/* Crab 2 */}
            <group position={[0.3, 0.05, -0.02]} rotation={[0, -0.4, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.065, 7, 6]} />
                <meshStandardMaterial color="#f97316" roughness={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* #2, #11, #21 COFFRE AU TRÉSOR: Treasure Chest Islet & Palm */}
        {tile.type === 'chest' && (
          <group>
            <MiniPalm position={[-0.36, 0, 0.04]} scale={0.88} lean={-0.18} />
            {/* Treasure Chest */}
            <group position={[0.08, 0.1, 0.04]} rotation={[0, -0.2, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.32, 0.2, 0.22]} />
                <meshStandardMaterial color="#78350f" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.11, 0.11, 0.33, 8, 1, false, 0, Math.PI]} />
                <meshStandardMaterial color="#92400e" roughness={0.65} />
              </mesh>
              {/* Gold lock & trim */}
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
            {/* Gold Mound */}
            <mesh position={[0.34, 0.05, 0.08]}>
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
            {/* Tilted Sunken Ship Hull */}
            <group position={[-0.08, 0.1, 0.02]} rotation={[0.25, 0.3, -0.38]}>
              <mesh castShadow>
                <boxGeometry args={[0.38, 0.16, 0.2]} />
                <meshStandardMaterial color="#451a03" roughness={0.85} />
              </mesh>
              {/* Broken Mast */}
              <mesh position={[0.04, 0.22, 0]} rotation={[0, 0, 0.2]} castShadow>
                <cylinderGeometry args={[0.018, 0.025, 0.38, 6]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
              {/* Torn Sail */}
              <mesh position={[0.05, 0.26, 0.04]} rotation={[0, 0, 0.35]}>
                <boxGeometry args={[0.22, 0.12, 0.02]} />
                <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
              </mesh>
            </group>
            <mesh position={[0.32, 0.08, 0.04]} castShadow>
              <dodecahedronGeometry args={[0.13, 0]} />
              <meshStandardMaterial color="#57534e" roughness={0.9} flatShading />
            </mesh>
          </group>
        )}

        {/* #4 TAXE DE L'AMIRAUTÉ: Imperial Customs Outpost, Cannon & Gold Pillars */}
        {tile.id === 4 && (
          <group>
            {/* Imperial Red/White Watchtower */}
            <mesh position={[-0.22, 0.18, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.34, 8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>
            <mesh position={[-0.22, 0.4, 0]} castShadow>
              <coneGeometry args={[0.15, 0.16, 8]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
            {/* Stacked Gold Coin Columns */}
            <mesh position={[0.12, 0.1, 0.05]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.18, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#d97706"
                emissiveIntensity={0.35}
                metalness={0.8}
              />
            </mesh>
            <mesh position={[0.28, 0.07, 0.06]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 8]} />
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
            {/* Turquoise Inner Lagoon Pool */}
            <mesh position={[0, 0.02, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.26, 14]} />
              <meshStandardMaterial
                color="#22d3ee"
                emissive="#06b6d4"
                emissiveIntensity={0.5}
              />
            </mesh>
            {/* Coral Formations */}
            <mesh position={[-0.28, 0.12, 0]} rotation={[0, 0, 0.25]} castShadow>
              <coneGeometry args={[0.08, 0.24, 5]} />
              <meshStandardMaterial
                color="#f43f5e"
                emissive="#e11d48"
                emissiveIntensity={0.3}
                flatShading
              />
            </mesh>
            <mesh position={[0.28, 0.14, -0.02]} rotation={[0, 0, -0.2]} castShadow>
              <dodecahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#0891b2"
                emissiveIntensity={0.35}
                flatShading
              />
            </mesh>
            <MiniPalm position={[-0.4, 0, 0.06]} scale={0.8} lean={0.2} />
          </group>
        )}

        {/* #6 ÎLE DU CRÂNE (JAIL): Skull Crag & Iron Cage Bars */}
        {tile.id === 6 && (
          <group>
            {/* Sculpted Skull Dome */}
            <mesh position={[-0.24, 0.22, -0.04]} castShadow>
              <dodecahedronGeometry args={[0.22, 1]} />
              <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
            </mesh>
            {/* Glowing Skull Eyes */}
            <mesh position={[-0.31, 0.24, 0.14]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={1.5}
              />
            </mesh>
            <mesh position={[-0.17, 0.24, 0.14]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={1.5}
              />
            </mesh>
            {/* Prison Iron Bars */}
            {[0.06, 0.2, 0.34].map((x, idx) => (
              <mesh key={idx} position={[x, 0.2, 0.02]} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 0.38, 6]} />
                <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
              </mesh>
            ))}
            <mesh position={[0.2, 0.38, 0.02]} castShadow>
              <boxGeometry args={[0.38, 0.05, 0.08]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        )}

        {/* #7 LAGON DES SIRÈNES: Shimmering Lagoon, Mermaid Tail Fin & Giant Shell */}
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
            {/* Mermaid Fin Sculpture emerging from lagoon */}
            <mesh position={[-0.12, 0.16, 0.02]} rotation={[0, 0, 0.35]} castShadow>
              <coneGeometry args={[0.1, 0.28, 4]} />
              <meshStandardMaterial
                color="#2dd4bf"
                emissive="#0d9488"
                emissiveIntensity={0.4}
              />
            </mesh>
            {/* Pink Sea Blossom */}
            <mesh position={[0.24, 0.1, 0.05]}>
              <dodecahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial
                color="#f472b6"
                emissive="#db2777"
                emissiveIntensity={0.4}
              />
            </mesh>
            <MiniPalm position={[0.38, 0, 0]} scale={0.85} lean={-0.18} />
          </group>
        )}

        {/* #8 & #15 MALÉDICTION DES MERS: Mystical Purple Obelisks & Floating Orb */}
        {tile.type === 'curse' && (
          <group>
            <mesh position={[-0.28, 0.16, 0]} rotation={[0, 0, 0.15]} castShadow>
              <coneGeometry args={[0.08, 0.34, 5]} />
              <meshStandardMaterial
                color="#7c3aed"
                emissive="#6d28d9"
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            <mesh position={[0.28, 0.16, 0]} rotation={[0, 0, -0.15]} castShadow>
              <coneGeometry args={[0.08, 0.34, 5]} />
              <meshStandardMaterial
                color="#7c3aed"
                emissive="#6d28d9"
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            <group ref={animRef} position={[0, 0.24, 0.02]}>
              <mesh>
                <octahedronGeometry args={[0.13, 0]} />
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
            {/* Clam Base & Open Top Shell */}
            <mesh position={[0, 0.05, 0.04]} castShadow>
              <cylinderGeometry args={[0.18, 0.14, 0.07, 10]} />
              <meshStandardMaterial color="#fbcfe8" roughness={0.5} />
            </mesh>
            <mesh
              position={[0, 0.16, -0.06]}
              rotation={[0.9, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.15, 0.06, 10]} />
              <meshStandardMaterial color="#f472b6" roughness={0.5} />
            </mesh>
            {/* Glowing Giant Pearl */}
            <mesh position={[0, 0.13, 0.04]}>
              <sphereGeometry args={[0.095, 12, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#fce7f3"
                emissiveIntensity={0.9}
                metalness={0.3}
                roughness={0.1}
              />
            </mesh>
            <MiniPalm position={[-0.38, 0, 0.04]} scale={0.85} lean={0.2} />
          </group>
        )}

        {/* #10 PORT DES FLIBUSTIERS: Corsair Wooden Dock, Crates & Tavern Lantern */}
        {tile.id === 10 && (
          <group>
            {/* Smuggler Cargo Crates */}
            <mesh position={[-0.22, 0.1, 0.02]} castShadow>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#92400e" roughness={0.8} />
            </mesh>
            <mesh position={[0.02, 0.08, 0.05]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.16, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.75} />
            </mesh>
            {/* Harbor Lantern Post */}
            <mesh position={[0.28, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.025, 0.4, 6]} />
              <meshStandardMaterial color="#451a03" />
            </mesh>
            <mesh position={[0.28, 0.38, 0.05]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        )}

        {/* #12 TAVERNE DE TORTUGA (FREE PARKING): Festive Tavern, Rum Barrels & Golden Mug */}
        {tile.id === 12 && (
          <group>
            {/* Tavern Timber Cabin */}
            <mesh position={[-0.2, 0.16, -0.02]} castShadow>
              <boxGeometry args={[0.38, 0.28, 0.26]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh
              position={[-0.2, 0.37, -0.02]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <coneGeometry args={[0.32, 0.2, 4]} />
              <meshStandardMaterial color="#16a34a" roughness={0.6} />
            </mesh>
            {/* Golden Mug */}
            <mesh position={[0.16, 0.12, 0.04]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.22, 8]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            <MiniPalm position={[0.42, 0, 0.04]} scale={0.95} lean={-0.2} />
          </group>
        )}

        {/* #13 SANCTUAIRE VAUDOU: Tiki Totem Mask & Glowing Eyes */}
        {tile.id === 13 && (
          <group>
            {/* Totem Pillar */}
            <mesh position={[0, 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.15, 0.44, 7]} />
              <meshStandardMaterial color="#7c2d12" roughness={0.85} flatShading />
            </mesh>
            {/* Glowing Green Voodoo Eyes */}
            <mesh position={[-0.05, 0.28, 0.12]}>
              <sphereGeometry args={[0.032, 6, 6]} />
              <meshStandardMaterial
                color="#4ade80"
                emissive="#22c55e"
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[0.05, 0.28, 0.12]}>
              <sphereGeometry args={[0.032, 6, 6]} />
              <meshStandardMaterial
                color="#4ade80"
                emissive="#22c55e"
                emissiveIntensity={1.6}
              />
            </mesh>
            {/* Feather / Crown Crest */}
            <mesh position={[0, 0.48, 0]} castShadow>
              <coneGeometry args={[0.16, 0.14, 5]} />
              <meshStandardMaterial
                color="#f97316"
                emissive="#ea580c"
                emissiveIntensity={0.4}
              />
            </mesh>
            <MiniPalm
              position={[-0.38, 0, 0.04]}
              scale={0.85}
              lean={0.2}
              foliageColor="#15803d"
            />
          </group>
        )}

        {/* #14 CRIQUE DU RHUM: Copper Rum Distillery & Stacked Barrels */}
        {tile.id === 14 && (
          <group>
            {/* Copper Alembic Still */}
            <mesh position={[-0.14, 0.14, 0]} castShadow>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial
                color="#ea580c"
                metalness={0.65}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[-0.14, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.06, 0.2, 8]} />
              <meshStandardMaterial
                color="#fb923c"
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
            {/* Rum Barrels */}
            <mesh position={[0.16, 0.1, 0.04]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.2, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh position={[0.32, 0.1, 0.02]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.2, 8]} />
              <meshStandardMaterial color="#92400e" roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* #16 VOLCAN D'ÉMERAUDE: Smoking Volcano with Glowing Emerald Crater */}
        {tile.id === 16 && (
          <group>
            <mesh position={[0, 0.22, -0.02]} castShadow>
              <coneGeometry args={[0.32, 0.46, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.85} flatShading />
            </mesh>
            {/* Emerald Lava Rim */}
            <mesh position={[0, 0.44, -0.02]}>
              <cylinderGeometry args={[0.1, 0.07, 0.06, 8]} />
              <meshStandardMaterial
                color="#34d399"
                emissive="#10b981"
                emissiveIntensity={1.6}
              />
            </mesh>
            {/* Puff of Smoke */}
            <group ref={animRef} position={[0, 0.56, -0.02]}>
              <mesh>
                <dodecahedronGeometry args={[0.09, 0]} />
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

        {/* #17 FORTERESSE DE JADE: Stepped Jade Temple & Emerald Crystal Spires */}
        {tile.id === 17 && (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[0.42, 0.16, 0.26]} />
              <meshStandardMaterial color="#059669" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[0.28, 0.14, 0.2]} />
              <meshStandardMaterial color="#10b981" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.36, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[0.22, 0.14, 4]} />
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
            {[-0.28, 0, 0.28].map((x, idx) => (
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
            <mesh position={[-0.22, 0.2, 0]} rotation={[0, 0, -0.2]} castShadow>
              <coneGeometry args={[0.18, 0.42, 5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0.2, 0.18, 0.02]} rotation={[0, 0, 0.22]} castShadow>
              <coneGeometry args={[0.15, 0.36, 5]} />
              <meshStandardMaterial color="#334155" roughness={0.85} flatShading />
            </mesh>
            {/* Glowing Storm Crystal */}
            <mesh position={[0, 0.28, 0.04]}>
              <octahedronGeometry args={[0.11, 0]} />
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
            {/* Crimson Banner Strip */}
            <mesh position={[0, 0.22, 0.11]}>
              <boxGeometry args={[0.36, 0.08, 0.02]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={0.5}
              />
            </mesh>
            {/* Twin Brass Cannons */}
            <mesh
              position={[-0.16, 0.14, 0.14]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.035, 0.045, 0.18, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh
              position={[0.16, 0.14, 0.14]}
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
              position={[-0.38, 0, 0.05]}
              scale={0.85}
              lean={0.2}
              foliageColor="#eab308"
            />
          </group>
        )}

        {/* #23 ÎLE DU TRÉSOR MAUDIT: Sovereign Golden Crown, Ruby Spires & Hoard */}
        {tile.id === 23 && (
          <group>
            {/* Golden Hoard Base */}
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
            {/* Sovereign Crown Ring */}
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
            {/* Glowing Cursed Ruby Gem */}
            <mesh position={[0, 0.38, 0]}>
              <octahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={1.2}
              />
            </mesh>
            <MiniPalm
              position={[0.4, 0, 0.05]}
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
  const islandSeedAngle = useMemo(() => (tile.id * 1.17) % (Math.PI * 2), [tile.id]);

  // Biome terrain color for the upper island terrace
  const terrainColor = useMemo(() => {
    if (tile.type === 'jail' || tile.id === 19 || tile.id === 20) return '#475569';
    if (tile.type === 'curse') return '#581c87';
    if (tile.id >= 22) return '#d97706';
    if (tile.id === 5 || tile.id === 7 || tile.id === 9) return '#0d9488';
    return '#15803d';
  }, [tile.id, tile.type]);

  useFrame(({ clock }) => {
    if (foamRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 2.4 + tile.id * 0.7) * 0.035;
      foamRef.current.scale.set(s, s, 1);
    }
  });

  const baseRadius = isCorner ? 0.94 : 0.84;

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
        position={[0, -0.09, -0.02]}
        rotation={[-Math.PI / 2, 0, islandSeedAngle]}
      >
        <ringGeometry args={[baseRadius * 0.86, baseRadius * 1.07, 12]} />
        <meshStandardMaterial
          color={isFocused ? '#fde047' : '#e0f2fe'}
          emissive={isFocused ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={isFocused ? 0.85 : 0.35}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* 2. Organic Golden Sandy Island Base */}
      <mesh
        position={[0, 0.01, -0.02]}
        rotation={[0, islandSeedAngle, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[baseRadius * 0.84, baseRadius * 0.98, 0.22, 10]}
        />
        <meshStandardMaterial
          color={
            tile.type === 'jail'
              ? '#94a3b8'
              : tile.type === 'curse'
              ? '#c4b5fd'
              : '#fde68a'
          }
          roughness={0.85}
          flatShading
        />
      </mesh>

      {/* Secondary Organic Cove Lobe on the Back/Side */}
      <mesh
        position={[
          (tile.id % 2 === 0 ? 1 : -1) * 0.24,
          0.04,
          -0.28,
        ]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[baseRadius * 0.56, baseRadius * 0.68, 0.24, 8]}
        />
        <meshStandardMaterial
          color={tile.type === 'jail' ? '#64748b' : '#fcd34d'}
          roughness={0.85}
          flatShading
        />
      </mesh>

      {/* 3. Elevated Island Biome Ridge (North/Back of Tile) for Landmarks & Forts */}
      <mesh position={[0, 0.14, -0.44]} receiveShadow castShadow>
        <cylinderGeometry
          args={[isCorner ? 0.56 : 0.5, isCorner ? 0.68 : 0.62, 0.14, 9]}
        />
        <meshStandardMaterial
          color={terrainColor}
          roughness={0.78}
          flatShading
        />
      </mesh>

      {/* 4. Bespoke Island Scenery & Number-Correspondent Stones */}
      <TileIslandScenery tile={tile} />

      {/* 5. Player Constructions (Smuggler Outposts 1-3 or Pirate Fortress 4) */}
      {tile.type === 'island' && owner && (
        <IslandConstructions level={tile.level} ownerColor={owner.color} />
      )}

      {/* 6. High-Contrast Readable Parchment Tablet on the Front Island Plateau */}
      <group position={[0, 0.135, 0.12]}>
        {/* Weathered Timber Tablet Frame */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[isCorner ? 1.4 : 1.34, 0.06, 0.96]} />
          <meshStandardMaterial
            color={isFocused ? '#d97706' : '#451a03'}
            roughness={0.75}
          />
        </mesh>

        {/* Crisp Warm Ivory Reading Surface */}
        <mesh position={[0, 0.032, 0]} receiveShadow>
          <boxGeometry args={[isCorner ? 1.3 : 1.26, 0.02, 0.88]} />
          <meshStandardMaterial
            color={
              tile.type === 'curse'
                ? '#f3e8ff'
                : tile.type === 'chest'
                ? '#fef9c3'
                : '#fffbeb'
            }
            roughness={0.55}
          />
        </mesh>

        {/* Color Group Header Banner at Inner Edge of Plaque */}
        <mesh position={[0, 0.046, -0.36]} receiveShadow>
          <boxGeometry args={[isCorner ? 1.26 : 1.22, 0.022, 0.14]} />
          <meshStandardMaterial
            color={tile.color}
            emissive={tile.color}
            emissiveIntensity={isFocused ? 0.45 : 0.22}
            roughness={0.4}
          />
        </mesh>

        {/* Ownership Glowing Harbor Strip on Front Edge */}
        {owner && (
          <mesh position={[0, 0.048, 0.39]}>
            <boxGeometry args={[isCorner ? 1.26 : 1.22, 0.04, 0.09]} />
            <meshStandardMaterial
              color={owner.color}
              emissive={owner.color}
              emissiveIntensity={0.65}
            />
          </mesh>
        )}

        {/* Crisp 3D Texts Centered Symmetrically in the Ivory Zone */}
        <group
          position={[0, 0.058, 0.025]}
          rotation={[-Math.PI / 2, 0, textFlipRotation]}
        >
          {/* Prominent Tile Number Badge */}
          <Text
            position={[0, 0.22, 0]}
            fontSize={0.13}
            color="#fef08a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.024}
            outlineColor="#451a03"
          >
            {`#${tile.id}`}
          </Text>

          {/* Island / Tile Name */}
          <Text
            position={[0, 0.0, 0]}
            fontSize={isCorner ? 0.145 : 0.138}
            maxWidth={1.18}
            lineHeight={1.04}
            textAlign="center"
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#fffbeb"
          >
            {tile.name.toUpperCase()}
          </Text>

          {/* Price / Rent or Event Subtitle */}
          <Text
            position={[0, -0.22, 0]}
            fontSize={0.13}
            color={owner ? owner.color : '#b45309'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.014}
            outlineColor="#fffbeb"
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
    </group>
  );
};

