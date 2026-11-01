import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  useGameStore,
  getTileTransform,
  calculateIslandRent,
  FloatingTextItem,
  MAX_FORTIFY_LEVEL,
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

function format3DFloatingText(raw: string): string {
  return raw
    .replace(/🪵/g, 'Mat.')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FloatingGoldText3D: React.FC<{
  item: FloatingTextItem;
  hasPopup: boolean;
  stackIndex: number;
}> = ({ item, hasPopup, stackIndex }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const { position } = getTileTransform(item.tileIndex);
  const cleanText = useMemo(() => format3DFloatingText(item.text), [item.text]);

  useFrame(({ clock, camera, size }) => {
    if (startTime.current === null) {
      startTime.current = clock.getElapsedTime();
    }
    const elapsed = clock.getElapsedTime() - startTime.current;
    if (groupRef.current) {
      const progress = Math.min(1, elapsed / 2.2);
      const easeOut = 1 - Math.pow(1 - progress, 2.4);

      // When the island card (LandedTilePopup) is open, keep the 3D popup text
      // lower and slightly forward so it stays framed right above the island
      // instead of flying off the top of the player's screen.
      const baseY = (hasPopup ? 0.42 : 0.85) + stackIndex * (hasPopup ? 0.16 : 0.28);
      const riseSpan = hasPopup ? 0.26 : 0.65;
      const zOffset = hasPopup ? 0.38 : 0.15;

      groupRef.current.position.set(
        position[0],
        baseY + easeOut * riseSpan,
        position[2] + zOffset
      );

      // Clamp projected position in NDC space so the popup text stays 100% inside
      // the player's visible screen window (below top HUD & above the island sheet)
      projVec.copy(groupRef.current.position).project(camera);
      const topReservedPx = hasPopup
        ? Math.min(88, size.height * 0.22)
        : Math.min(60, size.height * 0.15);
      const maxNdcY = Math.max(
        0.24,
        1.0 - (topReservedPx / Math.max(240, size.height)) * 2
      );
      const minNdcY = hasPopup ? Math.min(maxNdcY - 0.12, 0.16) : -0.75;
      const maxNdcX = 0.78;

      const clampedX = Math.max(-maxNdcX, Math.min(maxNdcX, projVec.x));
      const clampedY = Math.max(minNdcY, Math.min(maxNdcY, projVec.y));
      if (clampedX !== projVec.x || clampedY !== projVec.y) {
        projVec.x = clampedX;
        projVec.y = clampedY;
        groupRef.current.position.copy(projVec).unproject(camera);
      }

      // Adapt world-space font scale to the player's screen dimensions (size.width, size.height)
      // and current camera distance so the text never overflows mobile or small screens
      const dist = Math.max(1, camera.position.distanceTo(groupRef.current.position));
      const fovRad = (((camera as THREE.PerspectiveCamera).fov ?? 44) * Math.PI) / 180;
      const visibleHeight = 2 * dist * Math.tan(fovRad / 2);
      const worldUnitsPerPixel = visibleHeight / Math.max(1, size.height);

      const estimatedWidthFactor = Math.max(4, cleanText.length) * 0.62;
      const maxScreenPxWidth = Math.max(
        120,
        Math.min(size.width * 0.86, size.width - 28)
      );
      const maxFontPxByWidth = maxScreenPxWidth / (estimatedWidthFactor * 1.12);
      const idealFontPx = Math.min(
        hasPopup ? 19 : 18,
        Math.max(12, Math.min(size.width * 0.044, size.height * 0.034))
      );
      const responsiveFontPx = Math.max(10, Math.min(idealFontPx, maxFontPxByWidth));
      const baseWorldScale = responsiveFontPx * worldUnitsPerPixel;

      // Smooth pop-in and fade-out scale curve
      const popScale =
        elapsed < 0.18
          ? 0.45 + (elapsed / 0.18) * 0.67
          : elapsed < 0.35
          ? 1.12 - ((elapsed - 0.18) / 0.17) * 0.12
          : elapsed > 1.85
          ? Math.max(0, 1.0 - (elapsed - 1.85) / 0.35)
          : 1.0;

      groupRef.current.scale.setScalar(baseWorldScale * popScale);
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={groupRef} position={[position[0], 0.5, position[2]]}>
      <Text
        font="./assets/fonts/Cinzel-Bold.ttf"
        fontSize={1}
        color={item.color}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        outlineWidth={0.12}
        outlineColor="#020617"
      >
        {cleanText}
      </Text>
    </group>
  );
};

export const Board: React.FC = () => {
  const tiles = useGameStore((s) => s.tiles);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const showFortifyModal = useGameStore((s) => s.showFortifyModal);
  const spotlightPlayerId = useGameStore((s) => s.spotlightPlayerId);
  const floatingTexts = useGameStore((s) => s.floatingTexts);
  const landedTilePopup = useGameStore((s) => s.landedTilePopup);

  const activePlayer = players[currentPlayerIndex];
  const hasPopup = Boolean(landedTilePopup);

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
        const isFortifyCandidate =
          showFortifyModal &&
          Boolean(activePlayer) &&
          tile.type === 'island' &&
          tile.ownerId === activePlayer.id &&
          tile.level < MAX_FORTIFY_LEVEL &&
          (tile.upgradeCost ?? 0) <= activePlayer.gold;

        return (
          <Tile
            key={tile.id}
            tile={tile}
            currentRent={rentsByTile[idx]}
            owner={owner}
            isFocused={focusedTileIndex === tile.id}
            isFortifyCandidate={isFortifyCandidate}
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
          isSpotlighted={spotlightPlayerId === player.id}
        />
      ))}

      {/* 3D Ivory/Bone Dice in Center Lagoon */}
      <Dice3D />

      {/* 3D Cannonball & Smoke Effect during Naval Battles */}
      <CannonballEffect />

      {/* 3D Floating Gold Texts (+150 Or / -150 Or) */}
      {floatingTexts.map((item, idx) => (
        <FloatingGoldText3D
          key={item.id}
          item={item}
          hasPopup={hasPopup}
          stackIndex={idx}
        />
      ))}
    </group>
  );
};
