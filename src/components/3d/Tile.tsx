import React, { useRef, useEffect } from 'react';
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
 * Animated Smuggler Outpost (Levels 1-3) or Pirate Fortress with Flag (Level 4)
 * Uses GSAP elastic pop-in scale animation whenever level increases
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
      <group ref={groupRef} position={[0, 0.14, -0.46]}>
        {/* Main Fortress Keep */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.74, 0.42, 0.34]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.75} />
        </mesh>
        {/* Left & Right Bastion Towers */}
        <mesh position={[-0.34, 0.28, 0.02]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.54, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        <mesh position={[0.34, 0.28, 0.02]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.54, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Tower Cones */}
        <mesh position={[-0.34, 0.62, 0.02]} castShadow>
          <coneGeometry args={[0.17, 0.2, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.5} />
        </mesh>
        <mesh position={[0.34, 0.62, 0.02]} castShadow>
          <coneGeometry args={[0.17, 0.2, 8]} />
          <meshStandardMaterial color={ownerColor} roughness={0.5} />
        </mesh>
        {/* Flagpole & Pirate Flag */}
        <mesh position={[0, 0.64, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.52, 6]} />
          <meshStandardMaterial color="#fde047" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh ref={flagRef} position={[0.14, 0.8, 0]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.02]} />
          <meshStandardMaterial
            color={ownerColor}
            emissive={ownerColor}
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    );
  }

  // Levels 1 to 3: Smuggler Outposts
  const positionsX =
    level === 1 ? [0] : level === 2 ? [-0.26, 0.26] : [-0.38, 0, 0.38];

  return (
    <group ref={groupRef} position={[0, 0.14, -0.46]}>
      {positionsX.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Wooden Outpost Cabin */}
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.24, 0.26, 0.24]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          {/* Pitched Roof in Owner's Color */}
          <mesh position={[0, 0.34, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.22, 0.18, 4]} />
            <meshStandardMaterial color={ownerColor} roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * 3D Decorative Corner Landmarks (Port Royal, Skull Jail, Tortuga Tavern, Kraken Ambush)
 */
const CornerLandmark: React.FC<{ type: TileData['type'] }> = ({ type }) => {
  const tentacleRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (tentacleRef.current) {
      const t = clock.getElapsedTime();
      tentacleRef.current.rotation.y = Math.sin(t * 2) * 0.25;
      tentacleRef.current.position.y = 0.14 + Math.sin(t * 3) * 0.03;
    }
  });

  if (type === 'start') {
    // Port Royal Lighthouse & Golden Arch
    return (
      <group position={[0, 0.14, -0.32]}>
        <mesh position={[-0.34, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.56, 8]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[-0.34, 0.6, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#f59e0b"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[-0.34, 0.72, 0]} castShadow>
          <coneGeometry args={[0.13, 0.16, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'jail') {
    // Skull Island Prison Cage Bars
    return (
      <group position={[0, 0.14, -0.32]}>
        {[-0.28, -0.1, 0.1, 0.28].map((x, idx) => (
          <mesh key={idx} position={[x, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.44, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.7, 0.06, 0.1]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (type === 'free_parking') {
    // Tortuga Tavern Barrel & Golden Mug
    return (
      <group position={[-0.28, 0.14, -0.3]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.34, 10]} />
          <meshStandardMaterial color="#78350f" roughness={0.75} />
        </mesh>
        <mesh position={[0.26, 0.12, 0.06]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.22, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (type === 'go_to_jail') {
    // Kraken Tentacles Ambush
    return (
      <group ref={tentacleRef} position={[0, 0.14, -0.28]}>
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
              emissiveIntensity={0.35}
              roughness={0.45}
            />
          </mesh>
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

  // Ensure text on top/left sides is never upside down for the mobile portrait viewer
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
      {/* Outer Dock Timber Frame */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry
          args={[isCorner ? 1.58 : 1.5, 0.24, isCorner ? 1.58 : 1.5]}
        />
        <meshStandardMaterial
          color={isFocused ? '#b45309' : '#451a03'}
          roughness={0.8}
        />
      </mesh>

      {/* Inner Parchment / Sandstone Surface */}
      <mesh position={[0, 0.125, 0]} receiveShadow>
        <boxGeometry
          args={[isCorner ? 1.44 : 1.38, 0.03, isCorner ? 1.44 : 1.38]}
        />
        <meshStandardMaterial
          color={
            isCorner
              ? '#fef3c7'
              : tile.type === 'chest'
              ? '#fef9c3'
              : tile.type === 'curse'
              ? '#f3e8ff'
              : '#fde68a'
          }
          roughness={0.65}
        />
      </mesh>

      {/* Color Group Header Strip for Islands & Special Tiles */}
      <mesh position={[0, 0.145, -0.5]} receiveShadow>
        <boxGeometry args={[1.36, 0.035, 0.34]} />
        <meshStandardMaterial
          color={tile.color}
          emissive={tile.color}
          emissiveIntensity={isFocused ? 0.35 : 0.12}
          roughness={0.45}
        />
      </mesh>

      {/* Ownership Banner Strip on Front Edge */}
      {owner && (
        <mesh position={[0, 0.145, 0.62]}>
          <boxGeometry args={[1.36, 0.05, 0.12]} />
          <meshStandardMaterial
            color={owner.color}
            emissive={owner.color}
            emissiveIntensity={0.5}
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
            emissiveIntensity={0.9}
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
        {/* Tile Number Badge */}
        <Text
          position={[0, 0.36, 0]}
          fontSize={0.12}
          color="#78350f"
          anchorX="center"
          anchorY="middle"
        >
          {`#${tile.id}`}
        </Text>

        {/* Tile Name */}
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

        {/* Price / Rent or Event Subtitle */}
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
