import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  useGameStore,
  getTileTransform,
  FloatingTextItem,
} from '../../store/useGameStore';
import { Tile } from './Tile';
import { ShipToken } from './ShipToken';
import { Dice3D } from './Dice3D';
import { CannonballEffect } from './CannonballEffect';

const FloatingGoldText3D: React.FC<{ item: FloatingTextItem }> = ({ item }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const { position } = getTileTransform(item.tileIndex);

  useFrame(({ clock, camera }) => {
    if (startTime.current === null) {
      startTime.current = clock.getElapsedTime();
    }
    const elapsed = clock.getElapsedTime() - startTime.current;
    if (groupRef.current) {
      groupRef.current.position.set(
        position[0],
        0.95 + elapsed * 0.75,
        position[2]
      );
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} position={[position[0], 0.95, position[2]]}>
      <Text
        fontSize={0.32}
        color={item.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.035}
        outlineColor="#0f172a"
      >
        {item.text}
      </Text>
    </group>
  );
};

export const Board: React.FC = () => {
  const tiles = useGameStore((s) => s.tiles);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const floatingTexts = useGameStore((s) => s.floatingTexts);

  const activePlayer = players[currentPlayerIndex];

  return (
    <group>
      {/* Decorative Wooden Pier Support Under-Ring for the 24 Tiles */}
      <mesh position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[5.6, 8.2, 4]} />
        <meshStandardMaterial color="#271206" roughness={0.9} />
      </mesh>

      {/* Render all 24 Tiles */}
      {tiles.map((tile) => {
        const owner =
          tile.ownerId !== null
            ? players.find((p) => p.id === tile.ownerId) ?? null
            : null;
        return (
          <Tile
            key={tile.id}
            tile={tile}
            allTiles={tiles}
            owner={owner}
            isFocused={focusedTileIndex === tile.id}
            onSelectTile={(tileId) => {
              useGameStore.setState({ focusedTileIndex: tileId });
            }}
          />
        );
      })}

      {/* Render Pirate Galleon Tokens for Each Player */}
      {players.map((player) => (
        <ShipToken
          key={player.id}
          player={player}
          isActive={activePlayer?.id === player.id}
        />
      ))}

      {/* 3D Ivory/Bone Dice in Center Lagoon */}
      <Dice3D />

      {/* 3D Cannonball & Smoke Effect during Naval Battles */}
      <CannonballEffect />

      {/* 3D Floating Gold Texts (+150 Or / -150 Or) */}
      {floatingTexts.map((item) => (
        <FloatingGoldText3D key={item.id} item={item} />
      ))}
    </group>
  );
};
