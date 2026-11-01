import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  Player,
  getTileTransform,
  getShipSlotOffset,
} from '../../store/useGameStore';

interface ShipTokenProps {
  player: Player;
  isActive: boolean;
}

export const ShipToken: React.FC<ShipTokenProps> = ({ player, isActive }) => {
  const shipGroupRef = useRef<THREE.Group>(null);
  const rockGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const prevTileRef = useRef<number>(player.position);

  // Position ship smoothly with a bouncy hop arc whenever player.position changes
  useEffect(() => {
    if (!shipGroupRef.current) return;

    const { position, rotationY } = getTileTransform(player.position);
    const slotOffset = getShipSlotOffset(player.id);

    const targetX = position[0] + slotOffset[0];
    const targetZ = position[2] + slotOffset[2];
    const baseY = 0.24;

    if (prevTileRef.current !== player.position) {
      prevTileRef.current = player.position;

      // Horizontal slide
      gsap.to(shipGroupRef.current.position, {
        x: targetX,
        z: targetZ,
        duration: 0.16,
        ease: 'power2.out',
      });

      // Vertical hop arc
      gsap.fromTo(
        shipGroupRef.current.position,
        { y: baseY },
        {
          y: baseY + 0.55,
          duration: 0.08,
          yoyo: true,
          repeat: 1,
          ease: 'sine.out',
        }
      );

      // Rotate hull along board travel direction
      gsap.to(shipGroupRef.current.rotation, {
        y: rotationY - Math.PI / 2,
        duration: 0.16,
        ease: 'power1.out',
      });
    } else {
      shipGroupRef.current.position.set(targetX, baseY, targetZ);
      shipGroupRef.current.rotation.set(0, rotationY - Math.PI / 2, 0);
    }
  }, [player.position, player.id]);

  // Gentle sea wave pitching & active beacon pulse
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + player.id * 1.4;
    if (rockGroupRef.current) {
      rockGroupRef.current.rotation.z = Math.sin(t * 2.6) * 0.07;
      rockGroupRef.current.rotation.x = Math.cos(t * 2.1) * 0.05;
    }
    if (ringRef.current && isActive) {
      const s = 1 + Math.sin(t * 4.5) * 0.14;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  if (player.bankrupt) return null;

  const { position } = getTileTransform(player.position);
  const slotOffset = getShipSlotOffset(player.id);

  return (
    <group
      ref={shipGroupRef}
      position={[
        position[0] + slotOffset[0],
        0.24,
        position[2] + slotOffset[2],
      ]}
    >
      {/* Active Captain Glowing Halo Ring */}
      {isActive && (
        <mesh
          ref={ringRef}
          position={[0, -0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.26, 0.36, 20]} />
          <meshStandardMaterial
            color={player.color}
            emissive={player.color}
            emissiveIntensity={1.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <group ref={rockGroupRef} scale={0.78}>
        {/* Wooden Hull Bottom */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.56]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.75} />
        </mesh>

        {/* Bow / Prow Cone */}
        <mesh
          position={[0, 0.1, 0.34]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.14, 0.22, 4]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>

        {/* Stern Quarterdeck */}
        <mesh position={[0, 0.2, -0.18]} castShadow>
          <boxGeometry args={[0.26, 0.14, 0.2]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>

        {/* Gold Trim Stripe along Hull */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.3, 0.035, 0.54]} />
          <meshStandardMaterial
            color={player.accentColor}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>

        {/* Main Wooden Mast */}
        <mesh position={[0, 0.42, 0.02]} castShadow>
          <cylinderGeometry args={[0.022, 0.03, 0.68, 8]} />
          <meshStandardMaterial color="#92400e" roughness={0.7} />
        </mesh>

        {/* Lower Billowing Sail */}
        <mesh position={[0, 0.42, 0.06]} castShadow>
          <boxGeometry args={[0.38, 0.26, 0.04]} />
          <meshStandardMaterial
            color={player.sailColor}
            emissive={player.sailColor}
            emissiveIntensity={0.18}
            roughness={0.5}
          />
        </mesh>

        {/* Upper Topgallant Sail */}
        <mesh position={[0, 0.64, 0.05]} castShadow>
          <boxGeometry args={[0.28, 0.14, 0.035]} />
          <meshStandardMaterial
            color={player.color}
            emissive={player.color}
            emissiveIntensity={0.25}
            roughness={0.45}
          />
        </mesh>

        {/* Masthead Pennant Flag */}
        <mesh position={[0.09, 0.77, 0.02]} castShadow>
          <boxGeometry args={[0.18, 0.07, 0.015]} />
          <meshStandardMaterial
            color={player.accentColor}
            emissive={player.accentColor}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Jail Iron Shackles Indicator if in Jail */}
        {player.inJail && (
          <mesh position={[0, 0.88, 0]}>
            <torusGeometry args={[0.11, 0.025, 8, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        )}
      </group>
    </group>
  );
};
