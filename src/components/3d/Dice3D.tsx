import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
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

const CORNER_SIGNS: [number, number, number][] = [
  [-1, -1, -1],
  [-1, -1, 1],
  [-1, 1, -1],
  [-1, 1, 1],
  [1, -1, -1],
  [1, -1, 1],
  [1, 1, -1],
  [1, 1, 1],
];

const PipWithGoldRim: React.FC<{
  position: [number, number, number];
  axis: 'x' | 'y' | 'z';
  isAce?: boolean;
}> = ({ position, axis, isAce = false }) => {
  const r = isAce ? 0.062 : 0.046;
  const rot: [number, number, number] =
    axis === 'y'
      ? [Math.PI / 2, 0, 0]
      : axis === 'x'
      ? [0, Math.PI / 2, 0]
      : [0, 0, 0];

  return (
    <group position={position}>
      {/* Golden Rim Ring around the pip */}
      <mesh rotation={rot}>
        <torusGeometry args={[r * 1.12, 0.011, 8, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#d97706"
          emissiveIntensity={0.35}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      {/* Gem / Enamel Pip Core */}
      <mesh>
        <sphereGeometry args={[r, 12, 12]} />
        <meshStandardMaterial
          color={isAce ? '#dc2626' : '#0f172a'}
          emissive={isAce ? '#991b1b' : '#1e293b'}
          emissiveIntensity={isAce ? 0.55 : 0.2}
          metalness={isAce ? 0.35 : 0.5}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
};

const SingleDie: React.FC<{
  value: number;
  isRolling: boolean;
  isPromptingHuman: boolean;
  basePosition: [number, number, number];
}> = ({ value, isRolling, isPromptingHuman, basePosition }) => {
  const dieRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!dieRef.current) return;

    const [rx, ry, rz] = getRotationForDieValue(value);

    if (isRolling) {
      // Energetic 3D jump and multi-axis spin right in front of the camera
      gsap.killTweensOf(dieRef.current.position);
      gsap.killTweensOf(dieRef.current.rotation);

      gsap.fromTo(
        dieRef.current.position,
        { y: basePosition[1] },
        {
          y: basePosition[1] + 0.85,
          duration: 0.32,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }
      );

      gsap.fromTo(
        dieRef.current.rotation,
        { x: 0, y: 0, z: 0 },
        {
          x: rx + Math.PI * 6,
          y: ry + Math.PI * 4,
          z: rz + Math.PI * 6,
          duration: 0.65,
          ease: 'back.out(1.4)',
          onComplete: () => {
            if (dieRef.current) {
              dieRef.current.rotation.set(rx, ry, rz);
            }
          },
        }
      );
    } else {
      gsap.killTweensOf(dieRef.current.position);
      gsap.killTweensOf(dieRef.current.rotation);
      dieRef.current.rotation.set(rx, ry, rz);
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
    const [rx, ry, rz] = getRotationForDieValue(value);

    if (isPromptingHuman) {
      // Gentle inviting 3D float & subtle tilt around the current face while waiting to roll
      dieRef.current.position.y =
        basePosition[1] + Math.sin(t * 3.2 + basePosition[0] * 2) * 0.06;
      dieRef.current.rotation.set(
        rx + Math.sin(t * 1.8 + basePosition[0]) * 0.1,
        ry,
        rz + Math.sin(t * 2.2 + basePosition[0]) * 0.12
      );
    } else {
      dieRef.current.position.y =
        basePosition[1] + Math.sin(t * 2.5 + basePosition[0]) * 0.02;
      dieRef.current.rotation.set(rx, ry, rz);
    }
  });

  const faceDist = 0.258;
  const cornerDist = 0.215;

  return (
    <group ref={dieRef} position={basePosition}>
      {/* Stylized Beveled Pirate Bone / Ivory Die Body */}
      <RoundedBox
        args={[0.52, 0.52, 0.52]}
        radius={0.075}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.26}
          metalness={0.12}
        />
      </RoundedBox>

      {/* Inner Warm Aged Gold / Bronze Core Trim visible along bevels */}
      <RoundedBox args={[0.502, 0.502, 0.502]} radius={0.055} smoothness={3}>
        <meshStandardMaterial
          color="#d97706"
          metalness={0.65}
          roughness={0.32}
        />
      </RoundedBox>

      {/* 8 Golden Brass Pirate Corner Studs */}
      {CORNER_SIGNS.map(([sx, sy, sz], idx) => (
        <mesh
          key={`stud-${idx}`}
          position={[sx * cornerDist, sy * cornerDist, sz * cornerDist]}
        >
          <sphereGeometry args={[0.036, 8, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#b45309"
            emissiveIntensity={0.35}
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>
      ))}

      {/* FACE 1 (+Y and -Y) : Crimson Ruby Ace Pip with Golden Rim */}
      <PipWithGoldRim position={[0, faceDist, 0]} axis="y" isAce />
      <PipWithGoldRim position={[0, -faceDist, 0]} axis="y" isAce />

      {/* FACE 2 (+Z and -Z) : 2 Obsidian Pips with Golden Rim */}
      {[
        [-0.12, 0.12, faceDist],
        [0.12, -0.12, faceDist],
        [-0.12, 0.12, -faceDist],
        [0.12, -0.12, -faceDist],
      ].map((pos, idx) => (
        <PipWithGoldRim
          key={`f2-${idx}`}
          position={pos as [number, number, number]}
          axis="z"
        />
      ))}

      {/* FACE 3 (+X and -X) : 3 Obsidian Pips with Golden Rim */}
      {[
        [faceDist, 0.13, 0.13],
        [faceDist, 0, 0],
        [faceDist, -0.13, -0.13],
        [-faceDist, 0.13, 0.13],
        [-faceDist, 0, 0],
        [-faceDist, -0.13, -0.13],
      ].map((pos, idx) => (
        <PipWithGoldRim
          key={`f3-${idx}`}
          position={pos as [number, number, number]}
          axis="x"
        />
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
  const diceStowed = useGameStore((s) => s.diceStowed);
  const rollDice = useGameStore((s) => s.rollDice);

  const containerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const activePlayer = players[currentPlayerIndex];
  const isHumanTurn =
    Boolean(activePlayer) && !activePlayer.isAI && !activePlayer.bankrupt;

  // Bring dice close to the screen when it's the player's turn to roll (unless stowed for free camera) or while rolling
  const shouldZoomToScreen =
    !showSetupModal &&
    ((isHumanTurn && phase === 'IDLE' && !diceStowed) || phase === 'ROLLING');

  const forwardVec = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3(0, 0.62, 1.55));
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const targetQuat = useRef(new THREE.Quaternion());
  const identityQuat = useRef(new THREE.Quaternion());
  // Tilt the top (+Y) result face of the dice toward the camera lens so the pips are clearly readable
  const screenTiltQuat = useRef(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.05)
  );

  useFrame((_, delta) => {
    if (!containerRef.current) return;

    if (shouldZoomToScreen) {
      // Position the dice directly in front of the camera lens, slightly above center
      camera.getWorldDirection(forwardVec.current);
      upVec.current.set(0, 1, 0).applyQuaternion(camera.quaternion);

      targetPos.current
        .copy(camera.position)
        .addScaledVector(forwardVec.current, 4.2)
        .addScaledVector(upVec.current, 0.15);

      targetScale.current.set(1.5, 1.5, 1.5);
      targetQuat.current.copy(camera.quaternion).multiply(screenTiltQuat.current);

      const snapFactor = phase === 'ROLLING' ? Math.min(1, delta * 14) : Math.min(1, delta * 8.5);
      containerRef.current.position.lerp(targetPos.current, snapFactor);
      containerRef.current.scale.lerp(targetScale.current, snapFactor);
      containerRef.current.quaternion.slerp(targetQuat.current, snapFactor);
    } else {
      // Rest position on the central lagoon board
      targetPos.current.set(0, 0.62, 1.55);
      targetScale.current.set(0.95, 0.95, 0.95);

      const restFactor = Math.min(1, delta * 5.5);
      containerRef.current.position.lerp(targetPos.current, restFactor);
      containerRef.current.scale.lerp(targetScale.current, restFactor);
      containerRef.current.quaternion.slerp(identityQuat.current, restFactor);
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
