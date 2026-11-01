import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
  isPromptingHuman: boolean;
  basePosition: [number, number, number];
}> = ({ value, isRolling, isPromptingHuman, basePosition }) => {
  const dieRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!dieRef.current) return;

    if (isRolling) {
      // Energetic 3D jump and multi-axis spin right in front of the camera
      gsap.fromTo(
        dieRef.current.position,
        { y: basePosition[1] },
        {
          y: basePosition[1] + 0.85,
          duration: 0.34,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }
      );

      const [rx, ry, rz] = getRotationForDieValue(value);
      gsap.to(dieRef.current.rotation, {
        x: rx + Math.PI * 6,
        y: ry + Math.PI * 4,
        z: rz + Math.PI * 6,
        duration: 0.68,
        ease: 'back.out(1.5)',
      });
    } else {
      const [rx, ry, rz] = getRotationForDieValue(value);
      gsap.to(dieRef.current.rotation, {
        x: rx,
        y: ry,
        z: rz,
        duration: 0.35,
        ease: 'power2.out',
      });
      dieRef.current.position.set(
        basePosition[0],
        basePosition[1],
        basePosition[2]
      );
    }
  }, [isRolling, value, basePosition]);

  useFrame(({ clock }) => {
    if (!dieRef.current || isRolling) return;
    const t = clock.getElapsedTime();

    if (isPromptingHuman) {
      // Gentle inviting 3D float & tilt while waiting for the player to tap "Lancer les Dés"
      dieRef.current.position.y =
        basePosition[1] + Math.sin(t * 3.2 + basePosition[0] * 2) * 0.06;
      dieRef.current.rotation.z =
        Math.sin(t * 2.2 + basePosition[0]) * 0.14;
      dieRef.current.rotation.x += Math.sin(t * 1.8) * 0.003;
    } else {
      dieRef.current.position.y =
        basePosition[1] + Math.sin(t * 2.5 + basePosition[0]) * 0.025;
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
          roughness={0.32}
          metalness={0.08}
        />
      </mesh>

      {/* Subtle Chamfer / Trim Inner Cube */}
      <mesh>
        <boxGeometry args={[0.48, 0.48, 0.48]} />
        <meshStandardMaterial color="#fde68a" roughness={0.48} />
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
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const showSetupModal = useGameStore((s) => s.showSetupModal);
  const rollDice = useGameStore((s) => s.rollDice);

  const containerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn =
    Boolean(activePlayer) && !activePlayer.isAI && !activePlayer.bankrupt;

  // Bring dice close to the screen when it's the player's turn to roll (or while rolling)
  const shouldZoomToScreen =
    !showSetupModal &&
    ((isHumanTurn && phase === 'IDLE') || phase === 'ROLLING');

  const forwardVec = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3(0, 0.62, 1.55));
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));

  useFrame((_, delta) => {
    if (!containerRef.current) return;

    if (shouldZoomToScreen) {
      // Position the dice 4.2 units directly in front of the camera lens, slightly above center
      camera.getWorldDirection(forwardVec.current);
      upVec.current.set(0, 1, 0).applyQuaternion(camera.quaternion);

      targetPos.current
        .copy(camera.position)
        .addScaledVector(forwardVec.current, 4.3)
        .addScaledVector(upVec.current, 0.22);

      targetScale.current.set(1.45, 1.45, 1.45);

      containerRef.current.position.lerp(
        targetPos.current,
        Math.min(1, delta * 7.5)
      );
      containerRef.current.scale.lerp(
        targetScale.current,
        Math.min(1, delta * 7.5)
      );
    } else {
      // Rest position on the central lagoon board
      targetPos.current.set(0, 0.62, 1.55);
      targetScale.current.set(0.95, 0.95, 0.95);

      containerRef.current.position.lerp(
        targetPos.current,
        Math.min(1, delta * 5.5)
      );
      containerRef.current.scale.lerp(
        targetScale.current,
        Math.min(1, delta * 5.5)
      );
    }
  });

  return (
    <group
      ref={containerRef}
      position={[0, 0.62, 1.55]}
      onClick={(e) => {
        if (isHumanTurn && phase === 'IDLE') {
          e.stopPropagation();
          rollDice();
        }
      }}
    >
      {/* Warm golden spotlight on the close-up dice */}
      {shouldZoomToScreen && (
        <pointLight
          position={[0, 1.2, 0.8]}
          color="#fde047"
          intensity={2.2}
          distance={5}
        />
      )}

      <SingleDie
        value={dice[0]}
        isRolling={isRollingDice}
        isPromptingHuman={isHumanTurn && phase === 'IDLE'}
        basePosition={[-0.44, 0, 0]}
      />
      <SingleDie
        value={dice[1]}
        isRolling={isRollingDice}
        isPromptingHuman={isHumanTurn && phase === 'IDLE'}
        basePosition={[0.44, 0, 0]}
      />
    </group>
  );
};
