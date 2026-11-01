import React, { useRef, useEffect } from 'react';
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

/**
 * Animated Smuggler Outpost (Levels 1-3) or Pirate Fortress with Flag & Cannons (Level 4)
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

  // Level 4: Imposing Pirate Stone Citadel with Crenellations, Golden Dome, Cannons & Waving Flag
  if (level >= 4) {
    return (
      <group ref={groupRef} position={[0, 0.14, -0.46]}>
        {/* Main Stone Fortress Keep */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.78, 0.44, 0.36]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* Warm Glowing Embrasure Windows */}
        {[-0.16, 0.16].map((x, idx) => (
          <mesh key={idx} position={[x, 0.25, 0.185]}>
            <boxGeometry args={[0.08, 0.12, 0.01]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.5}
            />
          </mesh>
        ))}
        {/* Left & Right Octagonal Bastion Towers */}
        <mesh position={[-0.38, 0.3, 0.03]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.58, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.75} />
        </mesh>
        <mesh position={[0.38, 0.3, 0.03]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.58, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.75} />
        </mesh>
        {/* Spire Roofs in Owner's Color */}
        <mesh position={[-0.38, 0.68, 0.03]} castShadow>
          <coneGeometry args={[0.19, 0.24, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.45} />
        </mesh>
        <mesh position={[0.38, 0.68, 0.03]} castShadow>
          <coneGeometry args={[0.19, 0.24, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.45} />
        </mesh>
        {/* Fortress Cannon pointing toward sea */}
        <mesh
          position={[0, 0.32, 0.24]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.035, 0.045, 0.18, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Golden Flagpole & Pirate Flag */}
        <mesh position={[0, 0.68, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.56, 6]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh ref={flagRef} position={[0.15, 0.85, 0]} castShadow>
          <boxGeometry args={[0.3, 0.18, 0.02]} />
          <meshStandardMaterial
            color={ownerColor}
            emissive={ownerColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    );
  }

  // Levels 1 to 3: Detailed Smuggler Outposts with Timber Walls, Pitched Shingle Roof & Lantern
  const positionsX =
    level === 1 ? [0] : level === 2 ? [-0.28, 0.28] : [-0.4, 0, 0.4];

  return (
    <group ref={groupRef} position={[0, 0.14, -0.46]}>
      {positionsX.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Stone Foundation */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.28, 0.08, 0.28]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} />
          </mesh>
          {/* Timber Outpost Cabin */}
          <mesh position={[0, 0.19, 0]} castShadow>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
          {/* Glowing Tavern Window */}
          <mesh position={[0, 0.19, 0.125]}>
            <boxGeometry args={[0.08, 0.08, 0.01]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.4}
            />
          </mesh>
          {/* Pitched Roof in Owner's Color */}
          <mesh
            position={[0, 0.39, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[0.24, 0.2, 4]} />
            <meshStandardMaterial color={ownerColor} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Detailed 3D Corner Landmarks (Port Royal Harbor, Skull Fortress Brig, Tortuga Tavern Inn, Kraken Monster)
 */
const CornerLandmark: React.FC<{ type: TileData['type'] }> = ({ type }) => {
  const tentacleRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (tentacleRef.current) {
      tentacleRef.current.rotation.y = Math.sin(t * 2.2) * 0.28;
      tentacleRef.current.position.y = 0.14 + Math.sin(t * 3.0) * 0.035;
    }
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    }
  });

  if (type === 'start') {
    // Port Royal Imperial Lighthouse & Golden Harbor Arch
    return (
      <group position={[0, 0.14, -0.34]}>
        {/* Stone Quay Base */}
        <mesh position={[-0.36, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.12, 10]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Striped Lighthouse Tower */}
        <mesh position={[-0.36, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.52, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
        <mesh position={[-0.36, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.135, 0.145, 0.16, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        {/* Glowing Golden Beacon */}
        <mesh ref={beaconRef} position={[-0.36, 0.66, 0]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#f59e0b"
            emissiveIntensity={1.8}
          />
        </mesh>
        {/* Copper Dome Roof */}
        <mesh position={[-0.36, 0.8, 0]} castShadow>
          <coneGeometry args={[0.14, 0.18, 10]} />
          <meshStandardMaterial color="#b45309" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (type === 'jail') {
    // Skull Island Iron Fortress Cage & Watchtower
    return (
      <group position={[0, 0.14, -0.34]}>
        {/* Dark Stone Bastion Wall */}
        <mesh position={[-0.36, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.19, 0.5, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>
        {/* Iron Cage Bars */}
        {[-0.12, 0.04, 0.2, 0.36].map((x, idx) => (
          <mesh key={idx} position={[x, 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.46, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
        {/* Top Iron Crossbar */}
        <mesh position={[0.12, 0.46, 0]} castShadow>
          <boxGeometry args={[0.56, 0.06, 0.1]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (type === 'free_parking') {
    // Tortuga Pirate Tavern Inn & Rum Barrels
    return (
      <group position={[-0.22, 0.14, -0.34]}>
        {/* Tavern Timber Hall */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.46, 0.36, 0.32]} />
          <meshStandardMaterial color="#78350f" roughness={0.75} />
        </mesh>
        {/* Warm Tavern Gables Roof */}
        <mesh
          position={[0, 0.46, 0]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
        >
          <coneGeometry args={[0.38, 0.24, 4]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.55} />
        </mesh>
        {/* Glowing Tavern Windows */}
        {[-0.11, 0.11].map((x, idx) => (
          <mesh key={idx} position={[x, 0.2, 0.165]}>
            <boxGeometry args={[0.09, 0.1, 0.01]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.6}
            />
          </mesh>
        ))}
        {/* Golden Rum Barrel outside */}
        <mesh position={[0.36, 0.14, 0.06]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.26, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (type === 'go_to_jail') {
    // Coiling Sea Kraken Tentacles with Glowing Suction Cups
    return (
      <group ref={tentacleRef} position={[0, 0.14, -0.3]}>
        {[-0.32, -0.1, 0.12, 0.34].map((x, idx) => (
          <group
            key={idx}
            position={[x, 0, (idx % 2) * 0.08]}
            rotation={[0.18, 0, (idx - 1.5) * 0.22]}
          >
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.11, 0.4, 8]} />
              <meshStandardMaterial
                color="#7e22ce"
                emissive="#581c87"
                emissiveIntensity={0.35}
                roughness={0.4}
              />
            </mesh>
            <mesh
              position={[0.04, 0.46, 0.03]}
              rotation={[0.25, 0, 0.35]}
              castShadow
            >
              <coneGeometry args={[0.045, 0.26, 8]} />
              <meshStandardMaterial
                color="#a855f7"
                emissive="#7e22ce"
                emissiveIntensity={0.45}
                roughness={0.35}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  return null;
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

  const woodTexture = useTexture('./assets/wood_planks.jpg');

  const textFlipRotation =
    side === 'top' || side === 'left' ? Math.PI : 0;

  const currentRent =
    tile.type === 'island' ? calculateIslandRent(tile, allTiles) : 0;

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTile?.(tile.id);
      }}
    >
      {/* Outer Weathered Wooden Dock Frame with Real Wood Texture */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry
          args={[isCorner ? 1.58 : 1.5, 0.24, isCorner ? 1.58 : 1.5]}
        />
        <meshStandardMaterial
          map={woodTexture}
          color={isFocused ? '#fbbf24' : '#d97706'}
          roughness={0.75}
        />
      </mesh>

      {/* 4 Brass Corner Rivets on each Tile */}
      {[
        [-0.66, 0.125, -0.66],
        [0.66, 0.125, -0.66],
        [-0.66, 0.125, 0.66],
        [0.66, 0.125, 0.66],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial
            color="#fde047"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Inner Carved Parchment / Sandstone Surface */}
      <mesh position={[0, 0.125, 0]} receiveShadow>
        <boxGeometry
          args={[isCorner ? 1.44 : 1.36, 0.03, isCorner ? 1.44 : 1.36]}
        />
        <meshStandardMaterial
          color={
            isCorner
              ? '#fef3c7'
              : tile.type === 'chest'
              ? '#fef08a'
              : tile.type === 'curse'
              ? '#f3e8ff'
              : '#fde68a'
          }
          roughness={0.6}
        />
      </mesh>

      {/* Color Group Header Strip for Islands & Special Tiles */}
      <mesh position={[0, 0.145, -0.5]} receiveShadow>
        <boxGeometry args={[1.34, 0.04, 0.34]} />
        <meshStandardMaterial
          color={tile.color}
          emissive={tile.color}
          emissiveIntensity={isFocused ? 0.4 : 0.15}
          roughness={0.4}
        />
      </mesh>

      {/* Ownership Banner Strip on Front Edge */}
      {owner && (
        <mesh position={[0, 0.145, 0.62]}>
          <boxGeometry args={[1.34, 0.055, 0.12]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.55}
          />
        </mesh>
      )}

      {/* Focused Tile Highlight Ring */}
      {isFocused && (
        <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.68, 0.76, 4]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.95}
          />
        </mesh>
      )}

      {/* 3D Constructions (Smuggler Outposts 1-3 or Pirate Fortress 4) */}
      {tile.type === 'island' && owner && (
        <IslandConstructions level={tile.level} ownerColor={owner.color} />
      )}

      {/* Corner 3D Landmarks */}
      {isCorner && <CornerLandmark type={tile.type} />}

      {/* Readable 3D Texts */}
      <group
        position={[0, 0.165, 0.08]}
        rotation={[-Math.PI / 2, 0, textFlipRotation]}
      >
        <Text
          position={[0, 0.36, 0]}
          fontSize={0.12}
          color="#78350f"
          anchorX="center"
          anchorY="middle"
        >
          {`#${tile.id}`}
        </Text>

        <Text
          position={[0, 0.11, 0]}
          fontSize={isCorner ? 0.165 : 0.15}
          maxWidth={1.26}
          lineHeight={1.08}
          textAlign="center"
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#fef3c7"
        >
          {tile.name.toUpperCase()}
        </Text>

        <Text
          position={[0, -0.26, 0]}
          fontSize={0.135}
          color={owner ? owner.color : '#92400e'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
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
  );
};
