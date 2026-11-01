import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, getTileTransform } from '../../store/useGameStore';

interface SmokeParticle {
  id: number;
  offset: [number, number, number];
  velocity: [number, number, number];
  color: string;
  scale: number;
}

export const CannonballEffect: React.FC = () => {
  const cannonShot = useGameStore((s) => s.cannonShot);
  const ballRef = useRef<THREE.Mesh>(null);
  const smokeGroupRef = useRef<THREE.Group>(null);
  const progressRef = useRef<number>(0);

  const particles = useMemo<SmokeParticle[]>(() => {
    return Array.from({ length: 14 }, (_, idx) => ({
      id: idx,
      offset: [
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.15,
        (Math.random() - 0.5) * 0.2,
      ],
      velocity: [
        (Math.random() - 0.5) * 1.1,
        0.5 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.1,
      ],
      color: idx % 3 === 0 ? '#f97316' : idx % 2 === 0 ? '#fde047' : '#f8fafc',
      scale: 0.08 + Math.random() * 0.08,
    }));
  }, [cannonShot?.id]);

  // Reset animation progress when a new shot starts
  React.useEffect(() => {
    progressRef.current = 0;
  }, [cannonShot?.id]);

  useFrame((_, delta) => {
    if (!cannonShot || !cannonShot.active) return;

    progressRef.current = Math.min(1, progressRef.current + delta * 1.85);
    const t = progressRef.current;

    const fromPos = getTileTransform(cannonShot.fromTile).position;
    const toPos = getTileTransform(cannonShot.toTile).position;
    const startX = fromPos[0] + cannonShot.fromOffset[0];
    const startZ = fromPos[2] + cannonShot.fromOffset[2];
    const endX = toPos[0] + cannonShot.toOffset[0];
    const endZ = toPos[2] + cannonShot.toOffset[2];

    const curX = THREE.MathUtils.lerp(startX, endX, t);
    const curZ = THREE.MathUtils.lerp(startZ, endZ, t);
    // Parabolic arc height
    const curY = 0.42 + Math.sin(t * Math.PI) * 1.15;

    if (ballRef.current) {
      ballRef.current.position.set(curX, curY, curZ);
      ballRef.current.scale.setScalar(t < 0.95 ? 1 : 0.01);
    }

    if (smokeGroupRef.current) {
      smokeGroupRef.current.children.forEach((child, idx) => {
        const p = particles[idx];
        if (!p) return;
        const mesh = child as THREE.Mesh;
        // Smoke bursts at muzzle (t < 0.5) and at impact (t >= 0.5)
        const anchorX = t < 0.5 ? startX : endX;
        const anchorZ = t < 0.5 ? startZ : endZ;
        const localT = t < 0.5 ? t * 2 : (t - 0.5) * 2;

        mesh.position.set(
          anchorX + p.offset[0] + p.velocity[0] * localT * 0.45,
          0.38 + p.offset[1] + p.velocity[1] * localT * 0.45,
          anchorZ + p.offset[2] + p.velocity[2] * localT * 0.45
        );
        const s = Math.max(0.001, p.scale * (1 - localT * 0.85));
        mesh.scale.setScalar(s);
      });
    }
  });

  if (!cannonShot || !cannonShot.active) return null;

  return (
    <group>
      {/* Black Iron Cannonball Sphere */}
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Dissipating Orange & White Smoke Spheres */}
      <group ref={smokeGroupRef}>
        {particles.map((p) => (
          <mesh key={p.id}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={p.color}
              emissive={p.color}
              emissiveIntensity={0.6}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
