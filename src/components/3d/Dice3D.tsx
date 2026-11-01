import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGameStore } from '../../store/useGameStore';

/**
 * Returns Euler rotation so the desired Pirate Die value (1..3) faces UP (+Y)
 * Faces 1 (top/bottom), 2 (front/back), 3 (left/right)
 */
function getRotationForDieValue(val: number): [number, number, number] {
  switch (val) {
    case 1:
      return [0, 0, 0];
    case 2:
      return [-Math.PI / 2, 0, 0];
    case 3:
      return [0, 0, Math.PI / 2];
    default:
      return [0, 0, 0];
  }
}

const SingleDie: React.FC<{
  value: number;
  isRolling: boolean;
  basePosition: [number, number, number];
}> = ({ value, isRolling, basePosition }) => {
  const dieRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!dieRef.current) return;

    if (isRolling) {
      // High jump and multi-axis spin
      gsap.fromTo(
        dieRef.current.position,
        { y: basePosition[1] },
        {
          y: basePosition[1] + 1.45,
          duration: 0.34,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }
      );

      const [rx, ry, rz] = getRotationForDieValue(value);
      gsap.to(dieRef.current.rotation, {
        x: rx + Math.PI * 4,
        y: ry + Math.PI * 2,
        z: rz + Math.PI * 4,
        duration: 0.68,
        ease: 'back.out(1.4)',
      });
    } else {
      const [rx, ry, rz] = getRotationForDieValue(value);
      dieRef.current.rotation.set(rx, ry, rz);
      dieRef.current.position.set(
        basePosition[0],
        basePosition[1],
        basePosition[2]
      );
    }
  }, [isRolling, value, basePosition]);

  useFrame(({ clock }) => {
    if (!isRolling && dieRef.current) {
      dieRef.current.position.y =
        basePosition[1] +
        Math.sin(clock.getElapsedTime() * 2.5 + basePosition[0]) * 0.025;
    }
  });

  const pipRadius = 0.048;
  const faceDist = 0.255;

  return (
    <group ref={dieRef} position={basePosition}>
      {/* Ivory / Bone Cube Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Subtle Chamfer / Trim Inner Cube */}
      <mesh>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshStandardMaterial color="#fde68a" roughness={0.5} />
      </mesh>

      {/* FACE 1 (+Y and -Y) : 1 center crimson pirate pip */}
      <mesh position={[0, faceDist, 0]}>
        <sphereGeometry args={[pipRadius * 1.25, 8, 8]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0, -faceDist, 0]}>
        <sphereGeometry args={[pipRadius * 1.25, 8, 8]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>

      {/* FACE 2 (+Z and -Z) : 2 pips */}
      {[
        [-0.12, 0.12, faceDist],
        [0.12, -0.12, faceDist],
        [-0.12, 0.12, -faceDist],
        [0.12, -0.12, -faceDist],
      ].map((pos, idx) => (
        <mesh key={`f2-${idx}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[pipRadius, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* FACE 3 (+X and -X) : 3 pips */}
      {[
        [faceDist, 0.13, 0.13],
        [faceDist, 0, 0],
        [faceDist, -0.13, -0.13],
        [-faceDist, 0.13, 0.13],
        [-faceDist, 0, 0],
        [-faceDist, -0.13, -0.13],
      ].map((pos, idx) => (
        <mesh key={`f3-${idx}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[pipRadius, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
};

export const Dice3D: React.FC = () => {
  const dice = useGameStore((s) => s.dice);
  const isRollingDice = useGameStore((s) => s.isRollingDice);

  return (
    <group position={[0, 0.62, 1.55]}>
      <SingleDie
        value={dice[0]}
        isRolling={isRollingDice}
        basePosition={[-0.42, 0, 0]}
      />
      <SingleDie
        value={dice[1]}
        isRolling={isRollingDice}
        basePosition={[0.42, 0, 0]}
      />
    </group>
  );
};
