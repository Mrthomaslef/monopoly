import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  Player,
  getTileTransform,
  getShipSlotOffset,
  useGameStore,
} from '../../store/useGameStore';
import {
  createShipTextures,
  deckGeometry,
  foreSailGeometry,
  getDeckTexture,
  getHaloTexture,
  hullGeometry,
  mainSailGeometry,
  mainTopsailGeometry,
  pennantGeometry,
} from './shipAssets';

const WOOD_DARK = '#4a2208';
const WOOD_MAST = '#7c4416';
const GOLD = '#fbbf24';
// Yards are braced so the sails still read when a ship is seen side-on from the camera.
const SAIL_BRACE = 0.85;

interface SailProps {
  geometry: THREE.BufferGeometry;
  texture: THREE.Texture;
  y: number;
  height: number;
  yardLength: number;
}

const Sail: React.FC<SailProps> = ({ geometry, texture, y, height, yardLength }) => (
  <group position={[0, y, 0.03]}>
    <mesh position={[0, height / 2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, yardLength, 6]} />
      <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
    </mesh>
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        map={texture}
        emissive="#ffffff"
        emissiveMap={texture}
        emissiveIntensity={0.28}
        roughness={0.65}
        side={THREE.DoubleSide}
      />
    </mesh>
  </group>
);

interface ShipTokenProps {
  player: Player;
  isActive: boolean;
  isSpotlighted?: boolean;
}

export const ShipToken: React.FC<ShipTokenProps> = ({
  player,
  isActive,
  isSpotlighted = false,
}) => {
  const shipGroupRef = useRef<THREE.Group>(null);
  const rockGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const spotlightRingRef = useRef<THREE.Mesh>(null);
  const spotlightArrowRef = useRef<THREE.Mesh>(null);
  const flagRef = useRef<THREE.Mesh>(null);
  const prevTileRef = useRef<number>(player.position);

  const textures = useMemo(
    () => createShipTextures(player.color, player.sailColor),
    [player.color, player.sailColor]
  );

  useEffect(
    () => () => {
      textures.hull.dispose();
      textures.emblemSail.dispose();
      textures.stripedSail.dispose();
    },
    [textures]
  );

  // Position ship smoothly with a bouncy hop arc whenever player.position changes
  useEffect(() => {
    if (!shipGroupRef.current) return;

    const { position, rotationY } = getTileTransform(player.position);
    const slotOffset = getShipSlotOffset(player.id);

    const targetX = position[0] + slotOffset[0];
    const targetZ = position[2] + slotOffset[2];
    const baseY = 0.24;
    const baseHeading = rotationY - Math.PI / 2;

    if (prevTileRef.current !== player.position) {
      prevTileRef.current = player.position;
      const isSlowBot =
        player.isAI && useGameStore.getState().botSpeed === 'NORMAL';
      const hopDuration = isSlowBot ? 0.24 : 0.16;

      const currentY = shipGroupRef.current.rotation.y;
      let deltaAngle = baseHeading - currentY;
      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      gsap.to(shipGroupRef.current.position, {
        x: targetX,
        z: targetZ,
        duration: hopDuration,
        ease: 'power2.out',
      });

      gsap.fromTo(
        shipGroupRef.current.position,
        { y: baseY },
        {
          y: baseY + 0.55,
          duration: hopDuration / 2,
          yoyo: true,
          repeat: 1,
          ease: 'sine.out',
        }
      );

      gsap.to(shipGroupRef.current.rotation, {
        y: currentY + deltaAngle,
        duration: hopDuration,
        ease: 'power1.out',
      });
    } else {
      shipGroupRef.current.position.set(targetX, baseY, targetZ);
      shipGroupRef.current.rotation.set(0, baseHeading, 0);
    }
  }, [player.position, player.id, player.isAI]);

  // Gentle sea wave pitching, flag flutter & active beacon pulse
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + player.id * 1.4;
    if (rockGroupRef.current) {
      rockGroupRef.current.rotation.z = Math.sin(t * 2.6) * 0.065;
      rockGroupRef.current.rotation.x = Math.cos(t * 2.1) * 0.045;
    }
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 5.0) * 0.22;
    }
    if (ringRef.current && (isActive || isSpotlighted)) {
      const s = 1 + Math.sin(t * 4.5) * 0.12;
      ringRef.current.scale.set(s, s * 1.3, 1);
    }
    if (spotlightRingRef.current && isSpotlighted) {
      const s = 1.08 + Math.sin(t * 6.0) * 0.16;
      spotlightRingRef.current.scale.set(s, s, 1);
      spotlightRingRef.current.rotation.z = t * 1.2;
    }
    if (spotlightArrowRef.current && isSpotlighted) {
      spotlightArrowRef.current.position.y = 1.5 + Math.sin(t * 5.5) * 0.12;
      spotlightArrowRef.current.rotation.y = t * 2.2;
    }
  });

  if (player.bankrupt) return null;

  const { position, rotationY } = getTileTransform(player.position);
  const slotOffset = getShipSlotOffset(player.id);

  return (
    <group
      ref={shipGroupRef}
      position={[
        position[0] + slotOffset[0],
        0.24,
        position[2] + slotOffset[2],
      ]}
      rotation={[0, rotationY - Math.PI / 2, 0]}
    >
      {/* Active or Spotlighted Captain Glowing Halo Ring */}
      {(isActive || isSpotlighted) && (
        <mesh
          ref={ringRef}
          position={[0, -0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.38, 0.47, 48]} />
          <meshStandardMaterial
            color={player.color}
            emissive={player.color}
            emissiveIntensity={isSpotlighted ? 1.8 : 1.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Free Camera Spotlight Beacon & Outer Target Ring ("En évidence") */}
      {isSpotlighted && (
        <group>
          <mesh
            ref={spotlightRingRef}
            position={[0, -0.04, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.6, 0.72, 8]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.6}
              transparent
              opacity={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Vertical Golden Spotlight Pillar */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.4, 0.56, 1.7, 16, 1, true]} />
            <meshBasicMaterial
              color={player.color}
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Floating Golden Pointer Diamond Above Ship */}
          <mesh ref={spotlightArrowRef} position={[0, 1.5, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive={player.color}
              emissiveIntensity={1.5}
              metalness={0.6}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* Player-coloured glow + keyline that lift the ship off the board */}
      <mesh position={[0, -0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.45, 1.8]} />
        <meshBasicMaterial
          map={getHaloTexture()}
          color={player.color}
          transparent
          opacity={isActive ? 1 : 0.85}
          depthWrite={false}
        />
      </mesh>

      {/* White foam around the hull */}
      <mesh
        position={[0, -0.065, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 1.55, 1]}
      >
        <ringGeometry args={[0.26, 0.31, 40]} />
        <meshBasicMaterial
          color="#f0f9ff"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <group ref={rockGroupRef} scale={isSpotlighted ? 1.04 : 0.92}>
        {/* Dark inverted-hull outline: separates the ship from busy tiles */}
        <mesh geometry={hullGeometry} scale={[1.09, 1.05, 1.05]} position={[0, -0.006, 0]}>
          <meshBasicMaterial color="#1c0f06" side={THREE.BackSide} />
        </mesh>

        {/* Painted hull: gilded rail, player-coloured strake, gunports */}
        <mesh geometry={hullGeometry} castShadow>
          <meshStandardMaterial
            map={textures.hull}
            roughness={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Plank deck */}
        <mesh geometry={deckGeometry} receiveShadow>
          <meshStandardMaterial map={getDeckTexture()} roughness={0.85} />
        </mesh>

        {/* Captain's cabin with a player-coloured roof */}
        <group position={[0, 0.3, -0.23]}>
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.11, 0.17]} />
            <meshStandardMaterial color="#8a4b1c" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.067, 0]} castShadow>
            <boxGeometry args={[0.3, 0.024, 0.21]} />
            <meshStandardMaterial color={player.color} roughness={0.5} />
          </mesh>
        </group>

        {/* Stern windows and lanterns */}
        {[-0.085, 0, 0.085].map((x) => (
          <mesh key={`win-${x}`} position={[x, 0.2, -0.426]}>
            <boxGeometry args={[0.055, 0.06, 0.008]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.4}
            />
          </mesh>
        ))}
        {[-0.15, 0.15].map((x) => (
          <mesh key={`lantern-${x}`} position={[x, 0.43, -0.4]}>
            <sphereGeometry args={[0.024, 10, 10]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.6}
            />
          </mesh>
        ))}

        {/* Bowsprit and golden figurehead */}
        <mesh position={[0, 0.42, 0.56]} rotation={[Math.PI / 3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.02, 0.36, 8]} />
          <meshStandardMaterial color={WOOD_MAST} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.33, 0.47]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
        </mesh>

        {/* MAINMAST */}
        <group position={[0, 0.2, -0.04]}>
          <mesh position={[0, 0.46, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.026, 0.92, 8]} />
            <meshStandardMaterial color={WOOD_MAST} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.66, 0]} castShadow>
            <cylinderGeometry args={[0.058, 0.04, 0.05, 12]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
          </mesh>
          <group rotation={[0, SAIL_BRACE, 0]}>
            <Sail
              geometry={mainSailGeometry}
              texture={textures.emblemSail}
              y={0.27}
              height={0.34}
              yardLength={0.6}
            />
            <Sail
              geometry={mainTopsailGeometry}
              texture={textures.stripedSail}
              y={0.57}
              height={0.24}
              yardLength={0.4}
            />
          </group>
          <mesh
            ref={flagRef}
            geometry={pennantGeometry}
            position={[0, 0.84, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={player.color}
              emissive={player.color}
              emissiveIntensity={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* FOREMAST */}
        <group position={[0, 0.2, 0.2]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.022, 0.56, 8]} />
            <meshStandardMaterial color={WOOD_MAST} roughness={0.7} />
          </mesh>
          <group rotation={[0, SAIL_BRACE, 0]}>
            <Sail
              geometry={foreSailGeometry}
              texture={textures.stripedSail}
              y={0.24}
              height={0.28}
              yardLength={0.48}
            />
          </group>
        </group>

        {/* Jail Iron Shackles Halo if in Jail */}
        {player.inJail && (
          <mesh position={[0, 1.2, 0]}>
            <torusGeometry args={[0.14, 0.028, 8, 20]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        )}
      </group>
    </group>
  );
};
