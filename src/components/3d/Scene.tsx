import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore, getTileTransform } from '../../store/useGameStore';
import { Ocean } from './Ocean';
import { Board } from './Board';

const SmartCameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();

  const cameraMode = useGameStore((s) => s.cameraMode);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const focusedTileIndex = useGameStore((s) => s.focusedTileIndex);
  const navalBattle = useGameStore((s) => s.navalBattle);
  const cameraShake = useGameStore((s) => s.cameraShake);

  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPosition = useRef(new THREE.Vector3(0, 13.5, 11.5));

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const aspect = size.width / Math.max(1, size.height);
    // Automatically scale global distance on narrow 9:16 portrait screens so all 24 tiles fit
    const portraitMultiplier = aspect < 0.75 ? 1.26 : aspect < 1.0 ? 1.12 : 0.95;

    const activePlayer = players[currentPlayerIndex];
    const tileIndexToTrack =
      navalBattle?.active
        ? navalBattle.tileIndex
        : phase === 'MOVING' && activePlayer
        ? activePlayer.position
        : focusedTileIndex;

    const tilePos = getTileTransform(tileIndexToTrack).position;

    if (phase === 'NAVAL_BATTLE' && navalBattle?.active) {
      // Close-up dramatic Naval Battle camera on the contested tile
      desiredTarget.current.set(tilePos[0], 0.35, tilePos[2]);
      desiredPosition.current.set(
        tilePos[0] * 1.35 + (tilePos[0] === 0 ? 2.4 : 0),
        4.2,
        tilePos[2] * 1.35 + 3.4
      );
      camera.position.lerp(desiredPosition.current, Math.min(1, delta * 4.2));
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 5.0));
    } else if (cameraMode === 'FOLLOW' || phase === 'MOVING') {
      // Follow camera tracking the active ship hopping tile by tile
      desiredTarget.current.set(tilePos[0], 0.25, tilePos[2]);
      const radialX = tilePos[0] * 1.48;
      const radialZ = tilePos[2] * 1.48 + 3.2;
      desiredPosition.current.set(radialX, 5.6, radialZ);

      camera.position.lerp(desiredPosition.current, Math.min(1, delta * 3.8));
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 5.0));
    } else {
      // Global overview tilted for mobile portrait readability
      desiredTarget.current.set(0, -0.2, 0.35);
      desiredPosition.current.set(
        0,
        13.2 * portraitMultiplier,
        9.8 * portraitMultiplier
      );

      // Gentle interpolation back to global view when not manually dragging
      controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, delta * 3.2));
      if (phase === 'IDLE' || phase === 'ROLLING') {
        camera.position.lerp(desiredPosition.current, Math.min(1, delta * 2.2));
      }
    }

    // Apply cannon / Kraken camera shake
    if (cameraShake > 0) {
      camera.position.x += (Math.random() - 0.5) * 0.28 * cameraShake;
      camera.position.y += (Math.random() - 0.5) * 0.22 * cameraShake;
      camera.position.z += (Math.random() - 0.5) * 0.28 * cameraShake;
    }

    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={3.8}
      maxDistance={24}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 - 0.12} // Never dip below the Caribbean ocean surface
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      }}
    />
  );
};

export const Scene: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-900 via-cyan-900 to-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 15, 11.5], fov: 44, near: 0.1, far: 120 }}
      >
        {/* Warm Caribbean Sunset & Lagoon Lighting */}
        <color attach="background" args={['#0c4a6e']} />
        <fog attach="fog" args={['#0c4a6e', 22, 46]} />

        <ambientLight intensity={0.75} color="#fef3c7" />
        <hemisphereLight
          color="#bae6fd"
          groundColor="#083344"
          intensity={0.85}
        />
        <directionalLight
          castShadow
          position={[9, 16, 10]}
          intensity={1.65}
          color="#ffedd5"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        <Ocean />
        <Board />
        <SmartCameraRig />
      </Canvas>
    </div>
  );
};
