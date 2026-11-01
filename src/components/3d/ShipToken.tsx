import React, { useRef, useEffect, useMemo } from 'react';
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
  const flagRef = useRef<THREE.Mesh>(null);
  const prevTileRef = useRef<number>(player.position);

  // Carved tapered galleon hull geometry using ExtrudeGeometry
  const hullGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.38); // Bow tip
    shape.quadraticCurveTo(0.2, 0.22, 0.2, -0.18); // Starboard curve
    shape.lineTo(0.15, -0.34); // Stern starboard corner
    shape.lineTo(-0.15, -0.34); // Stern port corner
    shape.lineTo(-0.2, -0.18); // Port curve
    shape.quadraticCurveTo(-0.2, 0.22, 0, 0.38); // Back to bow

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    });
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

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

      gsap.to(shipGroupRef.current.position, {
        x: targetX,
        z: targetZ,
        duration: 0.16,
        ease: 'power2.out',
      });

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
    if (ringRef.current && isActive) {
      const s = 1 + Math.sin(t * 4.5) * 0.12;
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
          position={[0, -0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.39, 24]} />
          <meshStandardMaterial
            color={player.color}
            emissive={player.color}
            emissiveIntensity={1.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Subtle White Foam Wake Ring around every Galleon */}
      <mesh position={[0, -0.06, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.25, 16]} />
        <meshStandardMaterial
          color="#e0f2fe"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={rockGroupRef} scale={0.82}>
        {/* Carved Tapered Wooden Galleon Hull */}
        <mesh geometry={hullGeometry} position={[0, 0.16, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#4a2208" roughness={0.72} />
        </mesh>

        {/* Teak Wooden Deck Inlay */}
        <mesh position={[0, 0.185, 0.01]} castShadow>
          <boxGeometry args={[0.28, 0.02, 0.52]} />
          <meshStandardMaterial color="#92400e" roughness={0.8} />
        </mesh>

        {/* Gold Trim wale stripe along both sides of the hull */}
        <mesh position={[0, 0.16, -0.01]}>
          <boxGeometry args={[0.42, 0.03, 0.52]} />
          <meshStandardMaterial
            color={player.accentColor}
            metalness={0.75}
            roughness={0.22}
          />
        </mesh>

        {/* Stern Quarterdeck & Captain's Cabin */}
        <mesh position={[0, 0.25, -0.22]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.22]} />
          <meshStandardMaterial color="#3b1905" roughness={0.75} />
        </mesh>
        {/* Stern Ornate Gold Taffrail */}
        <mesh position={[0, 0.34, -0.31]} castShadow>
          <boxGeometry args={[0.32, 0.06, 0.04]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Glowing Lantern Windows at the Stern */}
        {[-0.08, 0, 0.08].map((x, idx) => (
          <mesh key={`win-${idx}`} position={[x, 0.25, -0.335]}>
            <boxGeometry args={[0.045, 0.055, 0.01]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.5}
            />
          </mesh>
        ))}

        {/* Bowsprit Spar & Golden Figurehead at the Prow */}
        <mesh
          position={[0, 0.22, 0.44]}
          rotation={[Math.PI / 2.6, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.012, 0.024, 0.34, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.17, 0.39]}>
          <sphereGeometry args={[0.038, 8, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>

        {/* 6 Broadside Iron Cannons (3 Port, 3 Starboard) */}
        {[-0.1, 0.02, 0.14].map((zPos, idx) => (
          <React.Fragment key={`cannon-${idx}`}>
            <mesh
              position={[-0.22, 0.15, zPos]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018, 0.022, 0.1, 8]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.25}
              />
            </mesh>
            <mesh
              position={[0.22, 0.15, zPos]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018, 0.022, 0.1, 8]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.25}
              />
            </mesh>
          </React.Fragment>
        ))}

        {/* MAINMAST + CROW'S NEST + CURVED BILLOWING SAILS */}
        <group position={[0, 0.18, -0.02]}>
          {/* Main Wooden Mast */}
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.032, 0.68, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>

          {/* Crow's Nest (Vigie) */}
          <mesh position={[0, 0.56, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.045, 0.06, 10]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>

          {/* Lower Yardarm & Curved Billowing Main Sail */}
          <mesh
            position={[0, 0.36, 0.02]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.014, 0.014, 0.46, 6]} />
            <meshStandardMaterial color="#5c2d0c" />
          </mesh>
          <mesh
            position={[0, 0.24, -0.04]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          >
            <cylinderGeometry
              args={[0.14, 0.14, 0.42, 12, 1, true, -Math.PI * 0.32, Math.PI * 0.64]}
            />
            <meshStandardMaterial
              color={player.sailColor}
              emissive={player.sailColor}
              emissiveIntensity={0.22}
              roughness={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Upper Topgallant Yardarm & Curved Sail */}
          <mesh
            position={[0, 0.52, 0.02]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.011, 0.011, 0.34, 6]} />
            <meshStandardMaterial color="#5c2d0c" />
          </mesh>
          <mesh
            position={[0, 0.45, -0.02]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          >
            <cylinderGeometry
              args={[0.1, 0.1, 0.32, 12, 1, true, -Math.PI * 0.32, Math.PI * 0.64]}
            />
            <meshStandardMaterial
              color={player.color}
              emissive={player.color}
              emissiveIntensity={0.28}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Waving Pirate Pennant Flag at Masthead */}
          <mesh ref={flagRef} position={[0.1, 0.66, 0]} castShadow>
            <boxGeometry args={[0.2, 0.075, 0.015]} />
            <meshStandardMaterial
              color={player.accentColor}
              emissive={player.accentColor}
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>

        {/* FOREMAST + CURVED FORESAIL */}
        <group position={[0, 0.18, 0.2]}>
          <mesh position={[0, 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.016, 0.024, 0.48, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh
            position={[0, 0.34, 0.02]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.011, 0.011, 0.32, 6]} />
            <meshStandardMaterial color="#5c2d0c" />
          </mesh>
          <mesh
            position={[0, 0.23, -0.02]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
          >
            <cylinderGeometry
              args={[0.11, 0.11, 0.3, 12, 1, true, -Math.PI * 0.32, Math.PI * 0.64]}
            />
            <meshStandardMaterial
              color={player.sailColor}
              emissive={player.sailColor}
              emissiveIntensity={0.2}
              roughness={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Jail Iron Shackles Halo if in Jail */}
        {player.inJail && (
          <mesh position={[0, 0.92, 0]}>
            <torusGeometry args={[0.12, 0.025, 8, 16]} />
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
