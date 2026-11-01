import React, { useRef, useMemo } from 'react';
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

/**
 * Red Dashed Pirate Treasure Map Trail ("Tracé rouge style carte de pirate")
 * connecting all 24 island centers with organic hand-drawn map dashes,
 * directional chevrons, and classic crimson "X" marks on each island center.
 */
const PirateMapRedTrail: React.FC = () => {
  const pulseRef = useRef<THREE.Group>(null);

  const { dashes, waypoints } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const [x, , z] = getTileTransform(i).position;
      pts.push(new THREE.Vector3(x, 0.168, z));
    }

    const dashItems: Array<{
      position: [number, number, number];
      rotationY: number;
      length: number;
      isArrow: boolean;
    }> = [];

    // 4 dashes per segment between consecutive tiles (24 * 4 = 96 dashes)
    const dashesPerTile = 4;
    for (let i = 0; i < 24; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 24];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const segLen = dir.length();
      const angleY = Math.atan2(dir.x, dir.z);

      // Perpendicular vector for slight hand-drawn map wave
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      for (let d = 0; d < dashesPerTile; d++) {
        const t = (d + 0.5) / dashesPerTile;
        // Skip the very center of the tile where the 'X' waypoint sits
        if (t < 0.14 || t > 0.86) continue;

        const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
        const wave = Math.sin(t * Math.PI * 2 + i * 0.9) * 0.045;
        pos.addScaledVector(perp, wave);

        dashItems.push({
          position: [pos.x, 0.168, pos.z],
          rotationY: angleY + Math.cos(t * Math.PI + i) * 0.06,
          length: (segLen / dashesPerTile) * 0.52,
          isArrow: d === 2 && i % 2 === 0,
        });
      }
    }

    const waypointItems = pts.map((p, idx) => ({
      id: idx,
      position: [p.x, 0.169, p.z] as [number, number, number],
      isCorner: idx % 6 === 0,
    }));

    return { dashes: dashItems, waypoints: waypointItems };
  }, []);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.getElapsedTime();
      pulseRef.current.position.y = Math.sin(t * 2.5) * 0.004;
    }
  });

  return (
    <group ref={pulseRef}>
      {/* Red Hand-Drawn Treasure Map Dashes along the entire 24-Tile Circuit */}
      {dashes.map((dash, idx) => (
        <group
          key={`dash-${idx}`}
          position={dash.position}
          rotation={[0, dash.rotationY, 0]}
        >
          {/* Dark Parchment Ink Shadow Outline */}
          <mesh position={[0, -0.002, 0]}>
            <boxGeometry args={[0.13, 0.012, dash.length + 0.04]} />
            <meshBasicMaterial color="#450a0a" transparent opacity={0.85} />
          </mesh>
          {/* Crimson Pirate Map Dash */}
          <mesh>
            <boxGeometry args={[0.095, 0.016, dash.length]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.75}
              roughness={0.35}
            />
          </mesh>

          {/* Directional Pirate Map Arrowhead every 2 tiles showing clockwise sailing direction */}
          {dash.isArrow && (
            <mesh
              position={[0, 0.005, dash.length * 0.55]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[0.11, 0.18, 3]} />
              <meshStandardMaterial
                color="#f87171"
                emissive="#dc2626"
                emissiveIntensity={0.85}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Classic Pirate Treasure Map Red "X" Marks at the Center of Each Tile */}
      {waypoints.map((wp) => {
        const armLen = wp.isCorner ? 0.34 : 0.26;
        const armWidth = wp.isCorner ? 0.075 : 0.06;
        return (
          <group key={`wp-${wp.id}`} position={wp.position}>
            {/* First diagonal stroke of the Red X */}
            <mesh rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[armWidth, 0.018, armLen]} />
              <meshStandardMaterial
                color="#dc2626"
                emissive="#b91c1c"
                emissiveIntensity={0.8}
                roughness={0.35}
              />
            </mesh>
            {/* Second diagonal stroke of the Red X */}
            <mesh rotation={[0, -Math.PI / 4, 0]}>
              <boxGeometry args={[armWidth, 0.018, armLen]} />
              <meshStandardMaterial
                color="#dc2626"
                emissive="#b91c1c"
                emissiveIntensity={0.8}
                roughness={0.35}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

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
        font="./assets/fonts/PirataOne-Regular.ttf"
        fontSize={0.34}
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
              useGameStore.getState().inspectTileCard(tileId);
            }}
          />
        );
      })}

      {/* Red Dashed Pirate Treasure Map Path & "X" Waypoints across all 24 Tiles */}
      <PirateMapRedTrail />

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
