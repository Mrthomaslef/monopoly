import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  useGameStore,
  getTileTransform,
  calculateIslandRent,
  FloatingTextItem,
} from '../../store/useGameStore';
import { Tile } from './Tile';
import { ShipToken } from './ShipToken';
import { Dice3D } from './Dice3D';
import { CannonballEffect } from './CannonballEffect';

/**
 * Red Dashed Pirate Treasure Map Trail ("Tracé rouge style carte de pirate")
 * Optimized into 3 static InstancedMeshes (3 draw calls instead of 216) for 60 FPS movement.
 */
const PirateMapRedTrail: React.FC = React.memo(() => {
  const shadowInstRef = useRef<THREE.InstancedMesh>(null);
  const crimsonInstRef = useRef<THREE.InstancedMesh>(null);
  const arrowInstRef = useRef<THREE.InstancedMesh>(null);

  const { shadowMatrices, crimsonMatrices, arrowMatrices } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const [x, , z] = getTileTransform(i).position;
      pts.push(new THREE.Vector3(x, 0.168, z));
    }

    const shadows: THREE.Matrix4[] = [];
    const crimsons: THREE.Matrix4[] = [];
    const arrows: THREE.Matrix4[] = [];

    const dummy = new THREE.Object3D();
    const dashesPerTile = 4;

    for (let i = 0; i < 24; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 24];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const segLen = dir.length();
      const angleY = Math.atan2(dir.x, dir.z);
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      for (let d = 0; d < dashesPerTile; d++) {
        const t = (d + 0.5) / dashesPerTile;
        if (t < 0.14 || t > 0.86) continue;

        const pos = new THREE.Vector3().lerpVectors(p1, p2, t);
        const wave = Math.sin(t * Math.PI * 2 + i * 0.9) * 0.045;
        pos.addScaledVector(perp, wave);

        const rotY = angleY + Math.cos(t * Math.PI + i) * 0.06;
        const len = (segLen / dashesPerTile) * 0.52;

        // Shadow box matrix
        dummy.position.set(pos.x, 0.166, pos.z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(0.13, 0.012, len + 0.04);
        dummy.updateMatrix();
        shadows.push(dummy.matrix.clone());

        // Crimson dash matrix
        dummy.position.set(pos.x, 0.168, pos.z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(0.095, 0.016, len);
        dummy.updateMatrix();
        crimsons.push(dummy.matrix.clone());

        // Arrowhead every 2 tiles
        if (d === 2 && i % 2 === 0) {
          const forwardOffset = len * 0.55;
          dummy.position.set(
            pos.x + Math.sin(rotY) * forwardOffset,
            0.173,
            pos.z + Math.cos(rotY) * forwardOffset
          );
          dummy.rotation.set(Math.PI / 2, rotY, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          arrows.push(dummy.matrix.clone());
        }
      }
    }

    // Add 24 Red "X" Waypoints (2 diagonal strokes per tile = 48 instances) into the same crimson InstancedMesh
    for (let idx = 0; idx < 24; idx++) {
      const p = pts[idx];
      const isCorner = idx % 6 === 0;
      const armLen = isCorner ? 0.34 : 0.26;
      const armWidth = isCorner ? 0.075 : 0.06;

      for (const sign of [-1, 1]) {
        dummy.position.set(p.x, 0.169, p.z);
        dummy.rotation.set(0, (sign * Math.PI) / 4, 0);
        dummy.scale.set(armWidth, 0.018, armLen);
        dummy.updateMatrix();
        crimsons.push(dummy.matrix.clone());
      }
    }

    return {
      shadowMatrices: shadows,
      crimsonMatrices: crimsons,
      arrowMatrices: arrows,
    };
  }, []);

  useEffect(() => {
    if (shadowInstRef.current) {
      shadowMatrices.forEach((m, i) => shadowInstRef.current!.setMatrixAt(i, m));
      shadowInstRef.current.instanceMatrix.needsUpdate = true;
    }
    if (crimsonInstRef.current) {
      crimsonMatrices.forEach((m, i) =>
        crimsonInstRef.current!.setMatrixAt(i, m)
      );
      crimsonInstRef.current.instanceMatrix.needsUpdate = true;
    }
    if (arrowInstRef.current) {
      arrowMatrices.forEach((m, i) => arrowInstRef.current!.setMatrixAt(i, m));
      arrowInstRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [shadowMatrices, crimsonMatrices, arrowMatrices]);

  return (
    <group>
      <instancedMesh
        ref={shadowInstRef}
        args={[undefined, undefined, shadowMatrices.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#450a0a" transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh
        ref={crimsonInstRef}
        args={[undefined, undefined, crimsonMatrices.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.75}
          roughness={0.35}
        />
      </instancedMesh>

      <instancedMesh
        ref={arrowInstRef}
        args={[undefined, undefined, arrowMatrices.length]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.11, 0.18, 3]} />
        <meshStandardMaterial
          color="#f87171"
          emissive="#dc2626"
          emissiveIntensity={0.85}
        />
      </instancedMesh>
    </group>
  );
});

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

  const handleSelectTile = useCallback((tileId: number) => {
    useGameStore.getState().inspectTileCard(tileId);
  }, []);

  const rentsByTile = useMemo(
    () =>
      tiles.map((t) =>
        t.type === 'island' ? calculateIslandRent(t, tiles) : 0
      ),
    [tiles]
  );

  return (
    <group>
      {/* Render all 24 Tiles (memoized so only focused/changed tiles re-render on ship step) */}
      {tiles.map((tile, idx) => {
        const owner =
          tile.ownerId !== null
            ? players.find((p) => p.id === tile.ownerId) ?? null
            : null;
        return (
          <Tile
            key={tile.id}
            tile={tile}
            currentRent={rentsByTile[idx]}
            owner={owner}
            isFocused={focusedTileIndex === tile.id}
            onSelectTile={handleSelectTile}
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
